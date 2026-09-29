export const normalizeGene = value => String(value ?? '').trim().toLowerCase();

export function geneBucket(value) {
  let hash = 2166136261;
  for (const char of normalizeGene(value)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return (hash & 255).toString(16).padStart(2, '0');
}

// Resolve whole gene symbols and aliases, never substrings inside unrelated aliases.
export function createAtlasQuery(loadJson) {
  let manifestPromise;
  let mappingsPromise;
  const buckets = new Map();
  const loadBucket = key => {
    if (!buckets.has(key)) {
      const promise = loadJson(`genes/${key}.json.gz`).catch(error => { buckets.delete(key); throw error; });
      buckets.set(key, promise);
      if (buckets.size > 24) buckets.delete(buckets.keys().next().value);
    }
    return buckets.get(key);
  };
  return async gene => {
    const normalizedQuery = normalizeGene(gene);
    if (!normalizedQuery || normalizedQuery.length > 120) throw new Error('Enter a gene symbol (up to 120 characters).');
    manifestPromise ??= loadJson('manifest.json').catch(error => { manifestPromise = null; throw error; });
    mappingsPromise ??= loadJson('orthologs.json.gz').catch(error => { mappingsPromise = null; throw error; });
    const [manifest, mappings] = await Promise.all([manifestPromise, mappingsPromise]);
    const orthologs = mappings.filter(item =>
      normalizeGene(item.humanSymbol) === normalizedQuery ||
      normalizeGene(item.mouseSymbol) === normalizedQuery ||
      normalizeGene(item.alias).split(/[,;|\s]+/).includes(normalizedQuery)
    ).sort((a, b) => Number(b.preferred) - Number(a.preferred) ||
      (a.humanSymbol || '').localeCompare(b.humanSymbol || '') || a.id - b.id
    ).slice(0, 12);
    const candidateGenes = [...new Set([normalizedQuery,
      ...orthologs.map(item => normalizeGene(item.humanSymbol)),
      ...orthologs.map(item => normalizeGene(item.mouseSymbol))].filter(Boolean))];
    const keys = [...new Set(candidateGenes.map(geneBucket))];
    const shards = new Map(await Promise.all(keys.map(async key => [key, await loadBucket(key)])));
    return {
      query: gene, normalizedQuery, candidateGenes, orthologs,
      datasets: manifest.datasets.map(dataset => {
        const candidates = [normalizedQuery, ...candidateGenes.filter(g => g !== normalizedQuery).sort()];
        const selected = candidates.map(g => shards.get(geneBucket(g))[g]?.[dataset.key]).find(Boolean);
        return {
          ...dataset,
          hasMatch: Boolean(selected), matchedGene: selected?.[0] ?? null,
          samples: dataset.sampleNames.map((name, index) => ({ name, value: selected?.[1][index] ?? null })),
        };
      }),
    };
  };
}
