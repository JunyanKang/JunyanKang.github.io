# Kang Lab Lockups

The v17 emblem is the shared master for all three arrangements. Its curves are
not stretched independently. The website composes the symbol with live text so
the wordmark remains crisp at small sizes.

- Desktop masthead: horizontal lockup, 64px symbol and optically centered text.
- Narrow masthead (700px and below): standalone 44px symbol; the home link keeps
  the accessible name "Kang Lab home" even when the wordmark is hidden.
- Footer: stacked lockup, 72px symbol (64px on mobile), a smaller centered
  wordmark, and affiliation information alongside rather than below it.
- Browser and touch icon: standalone 192px RGBA PNG.

`assets/css/brand.css` is shared by the academic pages and expression atlas.
Horizontal text is approximately 1.4 times the emblem width; stacked text is
approximately 0.85 times its width. Optical sizing uses the visible letterforms,
not the full font line box. The wordmark is Avenir Next Condensed Bold where
installed, with Avenir Next, Segoe UI and sans-serif fallbacks. Platform font
metrics may vary slightly. The wordmark uses the emblem's deep teal (#005865).

`assets/img/brand/kanglab-symbol-v17.png` is a transparent, normalized 256px web export
of the accepted image-edit-separated emblem. Internal negative spaces remain
transparent. Original design iterations and editable-presentation working files
are preserved under the ignored `output/logo-design-20260930/` directory, not
published as site content.

Do not add a large brand panel above page content, distort the emblem, or reuse
the older retinal-K wordmark in new layouts. The footer admin shortcut remains
independent from the home link.
