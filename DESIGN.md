# Kang Lab Interface

## Direction

Vantage-inspired precision: dark steel homepage introduction, a real retinal
single-cell 3D UMAP, and light scholarly reading surfaces. This is a full redesign,
not the previous warm-paper/serif refinement. The user approved the dual-surface
direction. Preserve the approved retinal emblem, staff portraits, genuine paper
figures, scientific content, CMS fields and published routes.

## Shared System

The source of truth is `assets/css/design-system.css`, shared with the atlas.

- Canvas: `#f8f9f6`; ink: `#1c2c31`; secondary ink: `#52656a`.
- Dark canvas: `#0a1013`; dark ink: `#eef4f3`; secondary: `#b7c6c8`.
- Light-surface actions: `#276476`; dark-surface primary action: `#c5ed74`.
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
- The video is an embedding, not physical retinal anatomy. Surfaces are computed
  cluster envelopes, not tissue boundaries. Hiding outside cells is a rendering
  selection, never deletion or alteration of expression values or source objects.
- Do not modify atlas data, normalization, plot scales or export geometry as part
  of a typography/layout redesign.

## Boundaries

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
