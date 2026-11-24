args <- commandArgs(TRUE)
suppressPackageStartupMessages(library(SeuratObject))
suppressPackageStartupMessages(library(Matrix))
obj <- readRDS(args[1]); cells <- rownames(obj@meta.data); dest <- args[2]
if ('umap' %in% names(obj@reductions)) {
  name <- if ('umap_post_harmony' %in% names(obj@reductions)) 'umap_post_harmony' else 'umap'
  xy <- Embeddings(obj[[name]])[cells,1:2]
} else {
  set.seed(17)
  age <- obj@meta.data$stage
  ref <- unlist(lapply(split(seq_along(cells),age),function(i) sample(i,min(1500L,length(i)))))
  mat <- LayerData(obj[['RNA']],layer='counts')[,cells]
  norm <- function(m) { m <- m %*% Diagonal(x=10000/pmax(1,colSums(m))); m@x <- log1p(m@x); m }
  landmark <- norm(mat[,ref]); var <- rowMeans(landmark^2)-rowMeans(landmark)^2
  features <- head(order(var,decreasing=TRUE),1500); train <- as.matrix(t(landmark[features,]))
  pca <- irlba::prcomp_irlba(train,n=30,center=TRUE,scale.=FALSE)
  model <- uwot::umap(pca$x,n_neighbors=30,min_dist=.3,ret_model=TRUE,n_threads=3,n_sgd_threads=1,verbose=FALSE)
  xy <- matrix(0,length(cells),2); others <- setdiff(seq_along(cells),ref)
  for (i in split(others,ceiling(seq_along(others)/8000))) {
    pcs <- sweep(as.matrix(t(norm(mat[,i])[features,])),2,pca$center) %*% pca$rotation
    xy[i,] <- uwot::umap_transform(pcs,model,n_threads=3,n_sgd_threads=1)
  }
  xy[ref,] <- model$embedding; name <- 'RNA UMAP (stage-stratified reference projection)'
}
stopifnot(nrow(xy)==length(cells),all(is.finite(xy)))
conn <- gzfile(file.path(dest,'umap.json.gz.tmp'),'wb'); writeBin(charToRaw(jsonlite::toJSON(list(x=I(xy[,1]),y=I(xy[,2]),name=name),auto_unbox=TRUE,digits=6)),conn); close(conn)
stopifnot(file.rename(file.path(dest,'umap.json.gz.tmp'),file.path(dest,'umap.json.gz')))
cat(name,length(cells),'complete\n')
