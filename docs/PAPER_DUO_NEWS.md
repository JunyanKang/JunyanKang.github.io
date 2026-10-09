# Paper Voice and Paper Nexus news

Editorial date: 2026-10-09. This is a joint product introduction, not a claim
that both products were first released on that date.

## Placement

- `_news/paper-voice-paper-nexus.md` is a published Resource story.
- `show_in_hero: true` and `hero_order: -1` place it before existing highlights
  without changing their order. The carousel links to the news article.
- The existing date-sorted Lab news section also includes the story.
- Pages CMS exposes the article, image, publication flag and carousel settings
  through its existing News collection.
- Resources includes a Paper Nexus entry beside Paper Voice. Existing
  recommendation flags are preserved; Nexus is not automatically endorsed.

## Verified sources

Public GitHub content was checked rather than relying on older local Nexus
documentation, which still described topic networks and native installers.

- Paper Voice README: https://github.com/JunyanKang/paper-voice/blob/4c533743dd7226eb780fbe3fb73e0f1835f6d25c/README.en.md
- Paper Voice release: https://github.com/JunyanKang/paper-voice/releases/tag/v1.4.15
- Paper Nexus README: https://github.com/JunyanKang/paper-nexus/blob/0be9754f96df0f5855819ed0fe7d1de0c983efd9/README.en.md
- Paper Nexus release: https://github.com/JunyanKang/paper-nexus/releases/tag/v1.1.2

Version numbers are intentionally omitted from the headline. Download links
use the official latest-release pages. No speed, accuracy or research-impact
claims are made. Offline listening is distinguished from network-dependent
translation and metadata retrieval, and the two plugins remain independent.

## Image provenance and art direction

Cover: a commissioned AI-generated illustration using both official mascot
assets as identity references, not a screenshot of plugin interoperability.
Paper Voice's cream book retains its teal-and-gold headphones; Paper Nexus's
folded page retains its chain-link magnifying glass. Their adjacent hands join
at centre, while the glass remains on the outside. Quiet sound waves and a
small document network suggest listening and discovery. Warm ivory and sage
match the lab site; there is no embedded text or UI, and HTML provides the
accessible title. The revised `cover-wide.webp` is a landscape 16:9 composition
with crop-safe margins around both mascots. `image_fit: contain` keeps the
caption outside the picture; `image_presentation: carousel-banner` fills the
responsive image slot without inset padding or sidebars. Only the surrounding
background is cropped across desktop/mobile ratios. Publication figures are
explicitly excluded from banner cropping. The original 4:3 cover is retained
as an unused alternative.

Both reference images were matched to their public Git blob hashes:

- Voice `addon/assets/mascot.png`: `9d7dd5827cd856443a9f836443316a4ca2518fa8`
- Nexus `addon/assets/nexus.png`: `1ea00daed342b207f73c9efd0c6f5cd0a17ac02d`

Article screenshots come from the same public source commits above:

- Voice: `docs/assets/reading-focus-en.png` (sample passage, labelled as such),
  `docs/assets/reading-panel-en.png` (listening modes), and
  `docs/assets/selection-translation-en.png` (selection translation).
- Nexus: `docs/images/network.png` (coauthors), `docs/images/translation.png`
  (bilingual abstract) and `docs/images/career.png` (public ORCID timeline).
  These are project interface examples, not independently verified biographies.

Each product has three real screenshots. Inline screenshots are lazy-loaded,
use their actual dimensions and link to the full-resolution WebP for inspection.
The narrow Voice panel is capped at 340 CSS pixels instead of being stretched
to the full article width.

Screenshots are only encoded as WebP; their interfaces and displayed content
are not generated or retouched. Both source projects use the MIT licence.
Assets live in `assets/img/news/paper-duo/`; full-size working sources and QA
outputs stay in the ignored `output/paper-duo-news/` directory.
