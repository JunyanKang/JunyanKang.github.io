# Portrait delivery

2026-09-30 optimization, without changing filenames, aspect ratios, people or CSS crop settings:

| Set | Images | Original bytes | Web bytes | Reduction |
| --- | ---: | ---: | ---: | ---: |
| Team | 11 | 51,621,293 | 611,738 | 98.81% |
| External researchers | 20 | 1,083,638 | 298,908 | 72.42% |

Team photographs are bounded by 640 x 1280 pixels (the ten large portraits are now 640 x 960). Their cards are 84 x 104 CSS pixels with a configurable upper-body crop. External portraits target a 224-pixel bounding box for 56-pixel cards. Already small files are retained if re-encoding would enlarge them. JPEGs use quality 86, full chroma resolution and progressive encoding. Original color is converted to sRGB before metadata stripping. No generated image editing is involved.

Member/resource images retain lazy loading and async decoding. The above-the-fold PI image uses high fetch priority and async decoding. Map previews clone and reuse the same compressed member images.

## Maintenance

Requires local ImageMagick (`magick`) and Ruby. This is an explicit maintenance task, not a build prerequisite:

```sh
node scripts/optimize-portraits.mjs          # candidates and report only
node scripts/optimize-portraits.mjs --apply  # replace only if smaller
```

Each run creates candidates, originals and a byte-size report under ignored `output/portrait-optimization-<timestamp>/`. Compact portraits are skipped to avoid repeated lossy encoding. The initial original-image backup is `output/portrait-optimization-1790744158303/originals/`; originals are also recoverable from Git history before this optimization. Do not publish the backup directory. New CMS uploads are not automatically recompressed; run this maintenance command after uploading large replacement portraits.
