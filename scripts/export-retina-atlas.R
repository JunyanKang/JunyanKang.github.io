args <- commandArgs(TRUE)
stopifnot(length(args) == 3)
suppressPackageStartupMessages(library(SeuratObject))
suppressPackageStartupMessages(library(Matrix))
configs <- list(
  monkey_dev_space = c("Monkey developing eye", "spatial", "stage", "stage", "celltype", "spatial_x", "spatial_y"),
  monkey_age_space = c("Monkey aging retina", "spatial", "age", "replicates", "celltype", "coor_x", "coor_y"),
  mouse_dev_space = c("Mouse developing eye", "spatial", "age", "chip_id", "celltype_0806", "stereo", ""),
  mouse_age_space = c("Mouse aging retina", "spatial", "age", "orig.ident", "celltype", "coor_x", "coor_y"),
  human_age_space = c("Human aging retina", "spatial", "age", "chip_id", "Clean_cluster_celltype2", "stereo", ""),
  monkey_dev_multi = c("Monkey developing retina", "multi", "age", "orig.ident", "celltype", "umap.harmony", ""),
  monkey_age_multi = c("Monkey aging retina", "multi", "age", "group", "celltype", "wnn.umap", ""),
  mouse_dev_multi = c("Mouse developing eye", "multi", "stage", "sample", "celltype", "umap", "")
)
key <- args[2]
cfg <- configs[[key]]
stopifnot(length(cfg) == 7)
dest <- file.path(args[3], key)
stage <- paste0(dest, ".building")
stopifnot(!dir.exists(dest))
dir.create(stage, recursive=TRUE, showWarnings=FALSE)
write_json <- function(value, name) {
  conn <- gzfile(file.path(stage, name), "wb", compression=2)
  on.exit(close(conn))
  writeBin(charToRaw(jsonlite::toJSON(value, auto_unbox=TRUE, digits=8, na="null")), conn)
}
obj <- readRDS(args[1])
meta <- obj@meta.data
cells <- rownames(meta)
coords <- if (cfg[7] == "") {
  Embeddings(obj[[cfg[6]]])[cells,1:2,drop=FALSE]
} else as.matrix(meta[,cfg[6:7]])
stopifnot(nrow(coords) == length(cells), all(is.finite(coords)), !anyDuplicated(cells))
ages <- as.character(meta[[cfg[3]]])
samples <- as.character(meta[[cfg[4]]])
types <- as.character(meta[[cfg[5]]])
stopifnot(length(types)==length(cells), !anyNA(ages), !anyNA(samples))
types[is.na(types) | types==""] <- "Unannotated"
groups <- unique(data.frame(age=ages, sample=samples))
group_key <- function(age,sample) paste(age,sample,sep="\034")
group_index <- match(group_key(ages,samples),group_key(groups$age,groups$sample))-1L
if (key == "monkey_age_space") stopifnot(all(table(groups$age)==2),nrow(unique(meta[c("chip_id","replicates")]))==8)
write_json(list(x=I(coords[,1]),y=I(coords[,2]),group=I(group_index),
                type=I(match(types,unique(types))-1L)), "geometry.json.gz")
assays <- names(obj@assays)
matrix_names <- c(RNA=if ("Spatial" %in% assays) "Spatial" else "RNA")
activity <- intersect(c("ACTIVITY","GeneActivity"), assays)
if (length(activity)) matrix_names["Activity"] <- activity[1]
manifest <- list(title=cfg[1],kind=cfg[2],coordinate=cfg[6],groups=groups,
                 types=I(unique(types)),n=length(cells),layers=list())
for (modality in names(matrix_names)) {
  assay <- obj[[matrix_names[[modality]]]]
  layers <- grep("^counts($|\\.)",Layers(assay),value=TRUE)
  stopifnot(length(layers)>0)
  covered <- integer()
  for (layer in layers) {
    mat <- as(LayerData(assay,layer=layer),"dgCMatrix")
    ids <- match(colnames(mat),cells)-1L
    stopifnot(!anyNA(ids),!anyDuplicated(ids),!any(ids %in% covered),!anyDuplicated(rownames(mat)))
    covered <- c(covered,ids)
    lib <- Matrix::colSums(mat)
    trans <- Matrix::t(mat)
    prefix <- paste0("layer",length(manifest$layers))
    write_json(list(cells=I(ids),lib=I(lib),genes=I(rownames(mat))),paste0(prefix,".json.gz"))
    for (start in seq.int(1,nrow(mat),by=32)) {
      end <- min(start+31L,nrow(mat))
      offsets <- trans@p[start:(end+1L)]
      n <- offsets[length(offsets)]-offsets[1]
      pos <- if(n) seq.int(offsets[1]+1L,length.out=n) else integer()
      conn <- gzfile(file.path(stage,paste0(prefix,"-", (start-1L)%/%32,".bin.gz")),"wb",compression=1)
      writeBin(as.integer(length(offsets)),conn,endian="little")
      writeBin(as.integer(offsets-offsets[1]),conn,endian="little")
      writeBin(trans@i[pos],conn,endian="little")
      writeBin(trans@x[pos],conn,size=4,endian="little")
      close(conn)
    }
    manifest$layers[[length(manifest$layers)+1]] <- list(prefix=prefix,mode=modality,assay=matrix_names[[modality]],layer=layer)
    rm(mat,trans)
    gc()
  }
}
write_json(manifest,"dataset.json.gz")
stopifnot(file.rename(stage,dest))
cat(key, length(cells), nrow(groups), "complete\n")
