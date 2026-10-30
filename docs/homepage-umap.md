# Homepage UMAP Visualization

The homepage film uses the laboratory's `monkey_dev_retina_multiomics.qs`
analysis object. It is not generated artwork, an anatomical reconstruction,
or a 2D UMAP with an invented third coordinate.

## Scientific Source

- Source object: 79,037 cells; 37,781 indexed RNA features.
- CellScope's native engine computed three-dimensional UMAP from the original
  stored weighted-nearest-neighbor distances, using 20 neighbors, 300 epochs,
  seed 123, min_dist 0.3 and spread 1. The previously validated result is reused.
- Original cell identities, cell-type annotations and stored RNA/data values are
  preserved. No expression normalization or biological analysis is newly applied
  for the website.
- The phases show original cell-type categories, followed by RHO, GNAT2, RLBP1,
  POU4F2 and VSX2 expression. These markers were selected using observed expression
  in the dataset, not assumed exclusive specificity. VSX2, for example, is not
  exclusive to bipolar cells.

## Display Semantics

CellScope's native surface builder produces category envelopes and determines
whether each cell is inside its own category surface. Outside cells are hidden
only in this visualization; no cells are deleted from the source or used to
revise scientific summaries. Surfaces describe the embedding, not tissue borders.

Surface geometry and membership are native CellScope outputs. An isolated
rasterization helper uses CellScope's projection core for a rigid 3D orbit;
FFmpeg encodes the final movie. This is not a GUI screen recording or a claim of
pixel-identical Figure-export rendering. Framing and isotropic scale stay fixed.

Per-gene color intensity is the square root of the stored value divided by that
gene's positive-value 99th percentile, clipped to [0, 1]. This is a display mapping
only. Brightness is **not comparable between genes**. Sequential gene phases are
not developmental progression or trajectories. Zero-expression cells remain dim;
surfaces become more transparent during expression phases. No legend is displayed.

Gene phases also use a bounded, local expression-dependent halo. Only inside
cells with positive stored expression emit it; zero-expression cells, hidden
outside cells and the surfaces themselves do not emit. The halo follows the same
per-gene positive p99 reference and existing phase crossfade. At 720p its Gaussian
sigma ranges from 1.2 to 2.2 pixels, truncated at three sigma, with a bounded
composite of at most 20% of the remaining channel brightness. It does not enlarge
cell cores, alter the surface, rescale the camera or blur the whole image. Nearby
halos can overlap, so glow is a visual emphasis, not an additional quantitative
measurement. Categorical phases remain unchanged. This halo pass belongs to the
isolated website renderer, not a claim about CellScope's GUI export features.

## Web Delivery

The 20-second silent H.264 loop has desktop and mobile encodes plus a WebP poster.
The homepage offers Pause/Play, preserves an explicit pause, and suspends playback
when offscreen or in a hidden tab. At the user's request, OS reduced-motion
preference does not automatically stop this particular video.

Source objects and matrices are not distributed with the website. Private build
records retain exact hashes, surface parameters, visible-cell counts, topology
checks, marker summaries and frame/encoding validation.
