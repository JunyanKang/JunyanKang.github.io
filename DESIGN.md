# Kang Lab Interface

## Direction

Vantage-inspired precision: a continuous dark steel website, a real retinal
single-cell 3D UMAP, and layered dark scholarly reading surfaces. The user's latest
request supersedes the earlier dark-hero/light-content direction. Apply the same
system to the complete homepage, every academic route, news articles and atlas.
Preserve the approved retinal emblem, staff portraits, genuine paper
figures, scientific content, CMS fields and published routes.

## Shared System

The source of truth is `assets/css/design-system.css`, shared with the atlas.

- Canvas: `#0a1013`; panel: `#111b20`; raised surface: `#18242a`.
- Ink: `#e9f0ef`; secondary: `#a9bbbf`; link: `#b3d8de`.
- Primary action: `#c5ed74` with dark text; lime is not a large panel fill.
- Authentic paper images, partner logos and map tiles retain their source colors.
  Do not invert scientific images. Chart exports retain their light print palette.
- Self-hosted Geologica variable font, with its OFL license. Light display/body
  weights; stronger controls and bibliographic titles. No italic display fragments.
- Body 16px; metadata 12-14px; controls 14-16px; section titles 30-46px.
  Homepage display type scales independently; academic titles remain compact.
- Content cap 1312px; responsive gutters 20-64px; a 4px spacing foundation.
- Flat panels, 4px corners, quiet rules; pill-shaped actions and active navigation.
- Research uses an anchor rail; publications use a year rail; the team uses a
  portrait directory; resources use category navigation. Do not force every page
  into the same card grid. The atlas remains a data tool, not a marketing page.

## Interaction

- Mobile navigation uses Menu, closes on Escape and restores focus. Without JS,
  links remain available. Keep visible keyboard focus and disabled states.
- Publication search retains `q`, provides a result count and Clear; external
  resource search matches displayed names, descriptions and affiliations.
- News filters are derived from published CMS content. The homepage news carousel
  retains dot navigation, fixed image geometry and genuine news destinations.
- Publication figures use contain. Never independently enlarge/crop individual
  scientific screenshots to fill a decorative slot.
- Homepage UMAP media uses a stable 16:9 frame with separate desktop/mobile
  encodes, a poster fallback, autoplay/muted/loop, and a working Pause/Play control.
  Pause when hidden/offscreen; preserve an explicit user pause. Per user request,
  this video does not stop automatically for OS reduced-motion preference.
  Existing CSS transition/carousel motion preferences remain supported.
- Gene-highlight phases use expression-dependent glow by explicit user request,
  overriding Vantage's default no-bloom rule. Zero expression must not emit glow;
  categorical phases, native surface geometry and camera framing stay unchanged.
- The video is an embedding, not physical retinal anatomy. Surfaces are computed
  cluster envelopes, not tissue boundaries. Hiding outside cells is a rendering
  selection, never deletion or alteration of expression values or source objects.
- Do not modify atlas data, normalization or plot scales as part of the redesign.
  Plot dimensions may adapt to label density or an explicit layout preset, with
  the exported chart retaining the selected geometry and complete labels.

## Expression Workbench

Keep the plot, not configuration, as the main working area. Dataset title and
Plot/Table state share a desktop row. Compact is the sole preset and the default for every dataset;
fine width, minimum height and label-size controls live in collapsed Custom size.
Controls have a 44px interaction target. The graph uses the available width and
grows in normal page flow without internal scrolling or dropping sample names.
Dense categories and matrix columns wrap into ordered vertical blocks on narrow
screens. Chart blocks retain one common numeric domain; the complete SVG is
exported. RNA and protein use identical 14px bars, regardless of sample count.
PDF exports include full geometry on a white print surface; CSV retains all values.
Phone layouts use the same dataset selection state through a labelled native
select, with secondary gene annotations collapsed. Scientific caveats stay visible.

## Content Boundaries

Do not restore removed introductory headers, footer boilerplate, carousel arrow
buttons or an admin gear. The footer symbol remains the CMS entry point. Preserve
Pages CMS additions, removals and visibility flags. Publish only rendered UMAP
media, never source QS files, matrices or private absolute-path provenance.

## Verification

Use real browser screenshots and interactions, not static markup alone. Check
320px through desktop layouts, navigation, searches, filters, media playback and
links. Run site/atlas tests, all six Ruby content suites and the combined build.
Record skill-lint limitations explicitly: external stylesheets must be included
in the audit, scholarly metadata has different density needs from a hero, and
the video's reduced-motion policy is an explicit user override. A local build
does not establish publication; verify GitHub Pages and live assets after push.

The translucent map-provider control preserves the user's explicit request for
a compact overlay. Section gaps vary by content hierarchy, not arbitrary cards:
reading columns, compact software listings and control groups have distinct density.

Expression workbench state and data integrity: new gene queries retain the chosen dataset, view mode, and sizing settings. A gene absent from that dataset stays visibly absent rather than silently switching context. CSV exports retain source numeric precision; small nonzero display values use scientific notation. Plots identify their measurement unit and protein replicate-mean aggregation explicitly.
