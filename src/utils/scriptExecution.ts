import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const EVAL_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Output sanitization
// ---------------------------------------------------------------------------

function sanitizeOutput(str: string): string {
  if (!str) return str;
  str = str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '\uFFFD');
  str = str.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
  str = str.replace(/\0/g, '');
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return str;
}

function safeJsonParse(raw: string): any {
  const sanitized = sanitizeOutput(raw);
  try {
    return JSON.parse(sanitized);
  } catch {
    const jsonMatch = sanitized.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch { /* fall through */ }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Persistent osascript bridge
// ---------------------------------------------------------------------------
// Keeps a single `osascript -l JavaScript -i` process alive across calls.
// A tiny Python pty wrapper forces line-buffered stdout so we can read
// results as they arrive (osascript fully buffers when piped directly).
// ---------------------------------------------------------------------------

const PTY_BRIDGE = `
import sys,os,pty,select,signal,struct,fcntl,termios
signal.signal(signal.SIGINT,lambda*a:None)
pid,fd=pty.fork()
if pid==0:
    os.execvp('osascript',['osascript','-l','JavaScript','-i'])
# Set wide terminal to prevent pty from wrapping long output lines.
# Do NOT modify termios flags (echo, canonical mode, etc.) — osascript's
# readline sets its own terminal mode and racing with it causes BEL storms.
fcntl.ioctl(fd,termios.TIOCSWINSZ,struct.pack('HHHH',24,65535,0,0))
# Non-blocking master fd prevents deadlock: large writes (20KB+ scripts)
# fill the ~4KB kernel pty buffer while osascript tries to echo input back.
# Both sides block waiting for each other. O_NONBLOCK + select write-set
# interleaves reads and writes safely.
fl=fcntl.fcntl(fd,fcntl.F_GETFL)
fcntl.fcntl(fd,fcntl.F_SETFL,fl|os.O_NONBLOCK)
wb=b''
try:
    while True:
        wl=[fd] if wb else []
        r,w,_=select.select([sys.stdin.buffer,fd],wl,[],60)
        if not r and not w:continue
        for s in r:
            if s==fd:
                try:
                    d=os.read(fd,65536)
                    if not d:sys.exit(0)
                    sys.stdout.buffer.write(d)
                    sys.stdout.buffer.flush()
                except BlockingIOError:pass
                except OSError:sys.exit(0)
            else:
                d=os.read(0,65536)
                if not d:os.close(fd);sys.exit(0)
                wb+=d
        if fd in w and wb:
            try:
                n=os.write(fd,wb)
                wb=wb[n:]
            except BlockingIOError:pass
            except OSError:sys.exit(0)
except:sys.exit(0)
`.trim();

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class OmniJSBridge {
  private proc: ChildProcess | null = null;
  private buffer = '';
  private queue: PendingRequest[] = [];
  private ready: Promise<void> | null = null;

  /** Lazy-start the bridge and establish the OmniFocus connection. */
  private async ensureRunning(): Promise<void> {
    if (this.proc && !this.proc.killed) return;
    if (this.ready) return this.ready;

    this.ready = new Promise<void>((resolve, reject) => {
      this.buffer = '';
      this.queue = [];

      const proc = spawn('python3', ['-c', PTY_BRIDGE], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.proc = proc;

      proc.on('error', (err: Error) => {
        for (const req of this.queue) {
          clearTimeout(req.timer);
          req.reject(new Error(`Failed to spawn python3: ${err.message}`));
        }
        this.queue = [];
        this.proc = null;
        this.ready = null;
      });

      proc.stdout!.on('data', (d: Buffer) => {
        this.buffer += d.toString();
        this.drain();
      });

      proc.stderr!.on('data', () => { /* swallow */ });

      proc.stdin!.on('error', () => { /* swallow */ });

      proc.on('exit', (_code, _signal) => {
        // Only handle if this is still the active process —
        // a new process may already have been spawned
        if (this.proc !== proc) return;
        for (const req of this.queue) {
          clearTimeout(req.timer);
          req.reject(new Error('osascript process exited'));
        }
        this.queue = [];
        this.proc = null;
        this.ready = null;
      });

      // Init: establish OmniFocus Application bridge (one-time)
      this.rawEval(
        'var app = Application("OmniFocus"); app.includeStandardAdditions = true;'
      ).then(() => resolve(), reject);
    });

    return this.ready;
  }

  /** Parse completed lines from the stdout buffer. */
  private drain(): void {
    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) break;
      let line = this.buffer.slice(0, idx).replace(/\r$/, '');
      this.buffer = this.buffer.slice(idx + 1);

      // Strip prompt prefix(es) — the initial ">> " prompt arrives without a
      // newline so it stays in the buffer and gets concatenated onto the next
      // response line, e.g. ">> => true".  Strip them so "=> " is detectable.
      while (line.startsWith('>> ')) line = line.slice(3);
      if (!line) continue;

      if (line.startsWith('=> ')) {
        const value = line.slice(3);
        const req = this.queue.shift();
        if (req) {
          clearTimeout(req.timer);
          req.resolve(value);
        }
        continue;
      }

      // JXA error lines (e.g. "execution error: Error on line 1: ...")
      // These replace the `=> ` response for the pending request.
      // Use startsWith (not includes) — echoed command lines may contain
      // "execution error:" as a substring within script string literals.
      if (line.startsWith('execution error:') || line.match(/^-:\d+:\d+:/)) {
        const req = this.queue.shift();
        if (req) {
          clearTimeout(req.timer);
          req.reject(new Error(`osascript: ${line}`));
        }
      }
    }
  }

  /** Send a raw JXA expression and return the interactive-mode result string. */
  private rawEval(code: string, timeout = EVAL_TIMEOUT): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.proc || this.proc.killed) {
        return reject(new Error('osascript not running'));
      }

      const timer = setTimeout(() => {
        const idx = this.queue.findIndex(r => r.resolve === resolve);
        if (idx >= 0) this.queue.splice(idx, 1);
        // Kill process on timeout to prevent queue desync — a late response
        // from the timed-out request would otherwise be matched to the next call.
        // Use shutdown() (not kill()) to immediately clear proc/ready so the
        // retry in evaluate() can spawn a fresh process.
        this.shutdown();
        reject(new Error(`osascript timeout after ${timeout}ms`));
      }, timeout);

      this.queue.push({ resolve, reject, timer });

      // osascript -i evaluates one line at a time — flatten to single line
      const flattened = code.replace(/\n/g, ' ') + '\n';
      this.proc.stdin!.write(flattened);
    });
  }

  /**
   * Execute an OmniJS script inside OmniFocus and return the parsed result.
   * The script should be an IIFE that returns a JSON string.
   * Retries once on process death (auto-recovery).
   */
  async evaluate(omniScript: string): Promise<any> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.ensureRunning();

        const escaped = JSON.stringify(omniScript);
        const raw = await this.rawEval(`app.evaluateJavascript(${escaped})`);

        // Interactive mode wraps string results in quotes: => "{\"key\":\"val\"}"
        // Unwrap the string literal first, then parse the JSON content.
        let unwrapped: string;
        try {
          unwrapped = JSON.parse(raw);
        } catch {
          unwrapped = raw;
        }

        const result = safeJsonParse(unwrapped);
        if (result !== null) return result;

        return unwrapped;
      } catch (err: any) {
        const msg = err?.message || '';
        const retriable = msg.includes('process exited')
          || msg.includes('not running')
          || msg.includes('timeout')
          || msg.includes('bridge shutdown');
        if (attempt === 0 && retriable) {
          continue;
        }
        throw err;
      }
    }
  }

  /** Kill the process without clearing instance state (exit handler does that). */
  private kill(): void {
    if (this.proc && !this.proc.killed) {
      this.proc.stdin!.end();
      this.proc.kill();
    }
  }

  /** Shut down the persistent process, cleaning up all pending requests. */
  shutdown(): void {
    // Clear all pending timers FIRST to prevent stale timers from
    // calling shutdown() again and killing a subsequently spawned process
    for (const req of this.queue) {
      clearTimeout(req.timer);
      req.reject(new Error('osascript bridge shutdown'));
    }
    this.queue = [];
    this.kill();
    this.proc = null;
    this.ready = null;
  }
}

const bridge = new OmniJSBridge();

// Clean up on process exit
process.on('exit', () => bridge.shutdown());
process.on('SIGINT', () => { bridge.shutdown(); process.exit(0); });
process.on('SIGTERM', () => { bridge.shutdown(); process.exit(0); });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prewarm the bridge: spawn osascript + connect to OmniFocus.
 * Call during server init so the first tool call doesn't pay the cold-start cost.
 */
export async function prewarm(): Promise<void> {
  await bridge.evaluate('(() => { return JSON.stringify({ok:true}); })()');
}

/**
 * Execute an OmniJS script string inside OmniFocus via the persistent bridge.
 * The script should be an IIFE returning a JSON string, e.g.:
 *   (() => { return JSON.stringify({ count: flattenedTasks.length }); })()
 */
export async function executeOmniJS(script: string): Promise<any> {
  return bridge.evaluate(script);
}

/**
 * Execute an OmniJS script file inside OmniFocus.
 * Use @-prefixed paths for bundled scripts: executeOmniFocusScript('@omnifocusOverview.js')
 */
export async function executeOmniFocusScript(scriptPath: string): Promise<any> {
  let actualPath: string;

  if (scriptPath.startsWith('@')) {
    const scriptName = scriptPath.substring(1);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const distPath = join(__dirname, '..', 'utils', 'omnifocusScripts', scriptName);
    const srcPath = join(__dirname, '..', '..', 'src', 'utils', 'omnifocusScripts', scriptName);

    if (existsSync(distPath)) {
      actualPath = distPath;
    } else if (existsSync(srcPath)) {
      actualPath = srcPath;
    } else {
      actualPath = join(__dirname, '..', 'omnifocusScripts', scriptName);
    }
  } else {
    actualPath = scriptPath;
  }

  const scriptContent = readFileSync(actualPath, 'utf8');
  return bridge.evaluate(scriptContent);
}
