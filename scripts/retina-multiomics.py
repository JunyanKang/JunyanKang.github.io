"""Prepare paired assays for the retinal atlas. All generated files live under output."""
import argparse
import csv
import gzip
import json
import re
import subprocess
import zipfile
from pathlib import Path

import h5py
import numpy as np
from scipy import sparse, io


def write_json(path, data):
    with gzip.open(path, 'wt', compresslevel=2) as f:
        json.dump(data, f, separators=(',', ':'), allow_nan=False)


def read_json(path):
    with gzip.open(path, 'rt') as f:
        return json.load(f)


def write_layer(dest, prefix, matrix, genes, cells):
    matrix = matrix.tocsc()
    matrix.sum_duplicates()
    matrix.eliminate_zeros()
    assert matrix.shape == (len(cells), len(genes)) and len(set(genes)) == len(genes)
    write_json(dest / f'{prefix}.json.gz', dict(cells=list(map(int,cells)), genes=list(genes), lib=matrix.sum(axis=1).A1.tolist()))
    for start in range(0, len(genes), 32):
        offsets = matrix.indptr[start:start+33]
        left,right = offsets[[0,-1]]
        with gzip.open(dest / f'{prefix}-{start//32}.bin.gz', 'wb', compresslevel=1) as f:
            for part in (np.array([len(offsets)],'<i4'), (offsets-left).astype('<i4'),matrix.indices[left:right].astype('<i4'),matrix.data[left:right].astype('<f4')):
                f.write(part.tobytes())


def monkey(args):
    dest = args.output / 'data/monkey_dev_multi'
    manifest = read_json(dest/'dataset.json.gz')
    if any(l['mode']=='Activity' for l in manifest['layers']):
        return
    rows=list(csv.DictReader(open(args.ids),delimiter='\t'))
    with h5py.File(args.source) as f:
        ids={s:i for i,s in enumerate(f['obs/_index'].asstr()[:])}
        indices=np.array([ids[r['cell']] for r in rows]); assert len(set(indices))==manifest['n']
        age=f['obs/age/categories'].asstr()[:][f['obs/age/codes'][:]]
        assert all(age[i]==r['age'] for i,r in zip(indices,rows))
        geo=read_json(dest/'geometry.json.gz'); assert all(manifest['groups'][g]['age']==r['age'] for g,r in zip(geo['group'],rows))
        counts=f['layers/counts']; assert counts.attrs['encoding-type']=='csr_matrix'
        m=sparse.csr_matrix((counts['data'][:],counts['indices'][:],counts['indptr'][:]),shape=counts.attrs['shape'])[indices]
        prefix='layerActivity'; write_layer(dest,prefix,m,f['var/_index'].asstr()[:],range(len(rows)))
        coords=f['obsm/X_wnn.umap'][:][indices]; assert np.isfinite(coords).all()
        geo.update(x=coords[:,0].tolist(),y=coords[:,1].tolist()); write_json(dest/'geometry.json.gz',geo)
        manifest.update(coordinate='WNN UMAP'); manifest['layers'].append(dict(prefix=prefix,mode='Activity',assay='GeneActivity',layer='counts'))
        write_json(dest/'dataset.json.gz.tmp',manifest); (dest/'dataset.json.gz.tmp').replace(dest/'dataset.json.gz')
        print(len(indices),'matched cell IDs and ages; paired WNN UMAP',flush=True)


def read_matrix(path):
    with zipfile.ZipFile(next(path.glob('*.zip'))) as z:
        def open_gz(suffix):
            return gzip.GzipFile(fileobj=z.open(next(s for s in z.namelist() if s.endswith(suffix))))
        def field(name,k):
            with open_gz(name) as inp: return [line.decode().rstrip().split('\t')[k] for line in inp]
        with open_gz('matrix.mtx.gz') as inp: m=io.mmread(inp).tocsr().T.tocsr().astype(np.float32)
        return m,field('barcodes.tsv.gz',0),field('features.tsv.gz',1)


def mouse(args):
    from sklearn.decomposition import TruncatedSVD
    from sklearn.preprocessing import normalize
    from sklearn.cluster import MiniBatchKMeans
    import umap
    dest=args.output/'data/mouse_dev_multi.building'; dest.mkdir(exist_ok=True)
    bed=args.output/'mm10-gene-territory.bed'; genes=sorted({line.split('\t')[3].strip() for line in bed.open()}); lookup={g:i for i,g in enumerate(genes)}
    age_indices=[]; parts=[]; groups=[]; layers=[]; total=0
    for ge in sorted(args.source.glob('*_GE')):
        raw=ge.name.split('_',1)[1][:-3];age=raw.replace('_','.')
        if re.fullmatch(r'E\d{3}',age): age=age[:-1]+'.'+age[-1]
        rna,rc,rg=read_matrix(ge); atac,ac,peaks=read_matrix(ge.with_name(ge.name[:-2]+'arc'))
        assert len(rc)==len(set(rc)) and len(ac)==len(set(ac)); ix={s:i for i,s in enumerate(ac)}
        keep=[i for i,s in enumerate(rc) if s in ix]; assert keep
        atac=atac[[ix[rc[i]] for i in keep]]; rna=rna[keep]; nf=rna.getnnz(axis=1); lib=rna.sum(axis=1).A1; depth=atac.sum(axis=1).A1
        valid=(nf>100)&(nf<7000)&(lib>500)&(lib<30000)&(depth>100)&(depth<100000);rna=rna[valid];atac=atac[valid];assert rna.shape[0]>0
        pb=args.output/'mouse-peaks.bed';
        with pb.open('w') as f:
            for i,p in enumerate(peaks):
                chrom,a,b=re.fullmatch(r'(.+):(\d+)-(\d+)',p).groups();f.write(f'{chrom}\t{a}\t{b}\t{i}\n')
        links=subprocess.check_output(['bedtools','intersect','-a',str(pb),'-b',str(bed),'-wa','-wb'],text=True)
        pairs={(int(v[3]),lookup[v[7]]) for line in links.splitlines() if (v:=line.split('\t'))};pi,gi=zip(*pairs)
        mapping=sparse.csr_matrix((np.ones(len(pi),np.float32),(pi,gi)),shape=(len(peaks),len(genes))); activity=atac@mapping
        # Multiple Ensembl IDs with the same symbol contribute to that symbol's total.
        symbols,idx=np.unique(rg,return_inverse=True);rna=rna@sparse.csr_matrix((np.ones(len(idx),np.float32),(np.arange(len(idx)),idx)),shape=(len(idx),len(symbols)))
        cells=range(total,total+rna.shape[0]); reduced=[]
        for mode,mat,names in [('RNA',rna,symbols),('Activity',activity,genes)]:
            prefix=f'layer{len(layers)}';write_layer(dest,prefix,mat,names,cells);layers.append(dict(mode=mode,prefix=prefix));
            # Same feature axes across libraries for each modality's joint SVD.
            cols={s:i for i,s in enumerate(names)}; shared=sorted(set(genes)&set(cols)) if not parts and mode=='RNA' else None
            keys=(dest/f'{mode}-projection.txt');
            if not keys.exists(): keys.write_text('\n'.join(shared if shared is not None else genes))
            axes=keys.read_text().splitlines()
            ai={s:i for i,s in enumerate(axes)}; ri=[i for i,s in enumerate(names) if s in ai];ci=[ai[names[i]] for i in ri]; align=sparse.csr_matrix((np.ones(len(ri),np.float32),(ri,ci)),shape=(len(names),len(axes))); norm=normalize(mat@align,norm='l1',axis=1)*10000;norm.data=np.log1p(norm.data); reduced.append(norm)
        parts.append(reduced);age_indices.extend([len(groups)]*rna.shape[0]);groups.append(dict(age=age,sample=age));total+=rna.shape[0];print(age,len(keep),rna.shape[0],flush=True)
    factors=[]
    for j in [0,1]:
        mat=sparse.vstack([p[j] for p in parts],format='csr'); variance=np.asarray(mat.power(2).mean(axis=0)-np.square(mat.mean(axis=0))).ravel();best=np.argsort(variance)[-3000:];factors.append(normalize(TruncatedSVD(24,random_state=17).fit_transform(mat[:,best])))
    latent=np.hstack(factors);groups_idx=np.array(age_indices);rng=np.random.default_rng(17); ref=np.concatenate([rng.choice(np.flatnonzero(groups_idx==g),min(1200,np.sum(groups_idx==g)),replace=False) for g in range(len(groups))]);model=umap.UMAP(n_neighbors=30,min_dist=.3,random_state=17).fit(latent[ref]);xy=model.transform(latent);xy[ref]=model.embedding_;assert np.isfinite(xy).all()
    cluster=MiniBatchKMeans(24,random_state=17,n_init=5).fit_predict(latent);write_json(dest/'geometry.json.gz',dict(x=xy[:,0].tolist(),y=xy[:,1].tolist(),group=age_indices,type=cluster.tolist()));write_json(dest/'dataset.json.gz',dict(groups=groups,types=[f'Cluster {i+1}' for i in range(24)],n=total,layers=layers,coordinate='Joint RNA + peak-derived activity UMAP',kind='multi',title='Mouse developing eye'));dest.rename(args.output/'data/mouse_dev_multi');print(total,'complete',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['monkey','mouse']);p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--ids',type=Path);args=p.parse_args();{'monkey':monkey,'mouse':mouse}[args.mode](args)
