import { gunzipSync, strFromU8 } from 'fflate';
import { createAtlasQuery } from '../../shared/query.mjs';
import type { ExpressionAtlasQueryResult } from '../types';

async function loadJson(path: string) {
  const response = await fetch(`/assets/atlas/v1/${path}`, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Unable to load expression data (${response.status}). Please retry.`);
  if (path.endsWith('.gz')) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Some static hosts decompress .gz files; accept both encodings.
    return JSON.parse(strFromU8(bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes));
  }
  return response.json();
}
export const queryExpressionAtlas: (gene: string) => Promise<ExpressionAtlasQueryResult> = createAtlasQuery(loadJson);

