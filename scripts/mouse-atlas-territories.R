suppressPackageStartupMessages(library(EnsDb.Mmusculus.v79))
g <- genes(EnsDb.Mmusculus.v79, columns=c('gene_name','gene_biotype'))
g <- g[g$gene_biotype=='protein_coding' & !is.na(g$gene_name) & g$gene_name!='']
chr <- as.character(seqnames(g)); canonical <- chr %in% c(as.character(1:19),'X','Y','MT'); g <- g[canonical]; chr <- chr[canonical]
# BED is zero based and half open. Extend 2 kb upstream on the gene strand.
write.table(data.frame(ifelse(chr=='MT','chrM',paste0('chr',chr)),pmax(0,start(g)-1L-ifelse(strand(g)=='+',2000L,0L)),end(g)+ifelse(strand(g)=='-',2000L,0L),g$gene_name),commandArgs(TRUE)[1],sep='\t',row.names=FALSE,col.names=FALSE,quote=FALSE)
