# OmniFocus MCP

MCP server providing OmniFocus task management tools for Claude.

## Architecture

- **Tools**: defined in `src/tools/definitions/`, implemented in `src/tools/primitives/`
- **OmniJS bridge**: `src/utils/scriptExecution.ts` — persistent `osascript` process via Python pty, no temp files
- **Types**: centralized in `src/types.ts` (status enums, result types, entity interfaces)
- **TOON output**: `src/utils/toonFormat.ts` — read tools encode results as TOON (~40% fewer tokens than JSON)
- **Skill**: standalone Agent Skill in `managing-omnifocus/` (SKILL.md + references)
- **Prompts**: 5 predefined workflow templates in `src/server.ts` (daily plan, weekly review, inbox zero, project health, available tasks)
- **Annotations**: read tools return dual content blocks — user summary + model TOON data
- **Entry point**: `src/server.ts` registers all tools and prompts

## Key Tools

- `database_overview` — lightweight stats + folder/project tree (no individual tasks)
- `query_omnifocus` — filtered queries with field selection and limits
- `batch_*` tools — single-script execution for multi-item operations

## Build & Run

```
npm run build && npm start
```

## Conventions

- New tools: definition in `definitions/`, primitive in `primitives/`, use `executeOmniJS(script)` directly
- OmniJS scripts must be IIFEs that return `JSON.stringify(...)` and handle errors
- Read tool definitions encode output with `toToon()` from `src/utils/toonFormat.ts` with annotations (`audience: ["user"]` for summary, `audience: ["assistant"]` for data); write tools return plain text
- Types go in `src/types.ts`, not scattered across files
- Tool descriptions should guide Claude toward efficient tool selection
- Script execution uses `scriptExecution.ts` — persistent osascript bridge, 30s timeout, output sanitization
- Bundled `.js` scripts in `omnifocusScripts/` use `executeOmniFocusScript('@filename.js')`
