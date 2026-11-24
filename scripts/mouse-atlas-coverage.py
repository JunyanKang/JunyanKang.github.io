"""Flag activity features whose gene territory has no overlapping input peak in a library."""
import gzip
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

matrix, output = map(Path, sys.argv[1:])
dataset = output / 'data/mouse_dev_multi'
for i, path in enumerate(sorted(matrix.glob('*_GE'))):
    archive = next(path.with_name(path.name[:-2] + 'arc').glob('*.zip'))
    with zipfile.ZipFile(archive) as z:
        features = next(s for s in z.namelist() if s.endswith('features.tsv.gz'))
        with gzip.GzipFile(fileobj=z.open(features)) as f:
            peaks = [line.decode().split('\t')[0] for line in f]
    bed = ''.join('\t'.join(re.fullmatch(r'(.+):(\d+)-(\d+)',p).groups())+'\n' for p in peaks)
    territory = output / 'mm10-gene-territory.bed'
    matched = subprocess.run(['bedtools','intersect','-nonamecheck','-u','-a',str(territory),'-b','stdin'],input=bed,text=True,capture_output=True,check=True)
    genes = {line.split('\t')[3] for line in matched.stdout.splitlines()}
    metadata = dataset / f'layer{2*i+1}.json.gz'
    with gzip.open(metadata,'rt') as f: meta = json.load(f)
    meta['unmeasured'] = [j for j,g in enumerate(meta['genes']) if g not in genes]
    temp=metadata.with_suffix('.tmp')
    with gzip.open(temp,'wt',compresslevel=2) as f: json.dump(meta,f,separators=(',',':'))
    temp.replace(metadata)
