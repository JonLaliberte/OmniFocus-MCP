import { encode } from '@toon-format/toon';

/**
 * Encode a value as TOON (Token-Oriented Object Notation) for LLM consumption.
 * ~40% fewer tokens than JSON with better LLM parsing accuracy.
 */
export function toToon(data: unknown): string {
  return encode(data);
}
