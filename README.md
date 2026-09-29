# Kang Lab

Kang Lab's laboratory website, built with **al-folio 1.0.15** and a standalone public expression atlas. The homepage foregrounds the laboratory, its research, publications, and shared resources; the PI appears on the team page.

## Website

- Home: https://kanglab.cool
- GitHub Pages: https://junyankang.github.io
- Publications: `/publications/`
- Open-source software: `/resources/`
- Public gene queries: `/expression-atlas/?gene=Pax6`
- ORCID: https://orcid.org/0000-0001-5191-5217

The academic pages use the official `al_folio_core` Jekyll runtime. Site-specific pages, typography, and the publication list are maintained here. ERG and colocalization analysis are intentionally **not** embedded; the resources page links to GitHub software repositories instead. Upstream project links distinguish forks from original repositories.

## Expression atlas

Seven datasets are released as a read-only snapshot of the existing database, with the data owner's approval. Queries run in the browser without an account or server. The release contains **185,917 expression records** and **24,546 ortholog mappings**, distributed over 256 compressed gene shards (approximately 33 MiB in total).

Values and sample names are preserved without rounding or averaging during export. The public atlas has a dedicated layout matching the laboratory website; plotting, heatmap views, clustering controls and PDF/CSV exports retain the original calculation logic. Complete aliases are matched rather than arbitrary substrings, avoiding accidental matches such as `AN2` within `TSPAN24`.

`assets/atlas/v1/manifest.json` records counts, sample names, timestamps, and SHA-256 checksums. The website does not require the original Excel, CSV, or RDS files. It is a published snapshot; changes to the old database do not automatically update the website.

## Local build

Requires Ruby 3.3+, Bundler, and Node.js 22.

```sh
bundle install
npm ci --prefix atlas
npm test --prefix atlas
node --test tests/*.test.mjs
node scripts/build.mjs
python3 -m http.server 4381 --bind 127.0.0.1 --directory _site
```

Open http://127.0.0.1:4381. Use the complete build command: Jekyll alone does not build the React atlas.

## Update content

Use the footer **Admin** link for the hosted content editor. Invited editors sign in by email, without a GitHub account. One-time repository-owner authorization and email invitation are required before editing works. See the [management guide](docs/CONTENT_MANAGEMENT.md).

| Content | Location |
| --- | --- |
| Home and research | `_pages/about.md`, `_pages/research.md` |
| Software links | `_data/software.yml` |
| ORCID publications and affiliations | `_data/publications.json`, `_data/profile.json` |
| All CMS-managed publications and figure previews | `_data/publications_manual.json` |
| Team / photo / hometown map | `_data/team.json`, `assets/img/team/` |
| Contact email / map address | `_data/contact.json` |
| CMS forms | `.pages.yml` |
| Style | `assets/css/kanglab.css` |
| Atlas UI | `atlas/src/pages/ExpressionAtlasPage.tsx` |
| Query and alias matching | `atlas/shared/query.mjs` |

Refresh public scholarly metadata explicitly:

```sh
node scripts/import-orcid.mjs
```

This uses ORCID for works/affiliations and DOI-verified Crossref publisher metadata for author lists. Only newly discovered works are appended to the CMS catalog; existing edits, hidden entries and deletions are respected. The public list and BibTeX are generated from that catalog, not directly from the ORCID snapshot. Review the changes before pushing; no unverified publications are invented.

## Refresh atlas from the original project

The following commands run **only in the original `labsite4/academic-site` directory**, where the sibling `backend/` and `frontend/` exist:

```sh
node scripts/export-atlas.mjs
node scripts/verify-atlas-db.mjs
npm test --prefix atlas
node scripts/build.mjs
```

The public atlas UI is maintained independently; a data refresh does not copy the old site layout. The legacy sync script requires an explicit `--replace-public-ui` flag and must not be part of a normal data refresh.

The export reads three expression-related tables in a read-only, consistent transaction. It does not initialize, seed, or modify the database. Credentials are read from the existing local backend environment and are not copied into this repository. Previous export directories are ignored by Git and must not be included in a deployment.

## Publish

Push to `main` to run integrity tests, compile the atlas, build Jekyll, and deploy through GitHub Actions. Pull requests build and test without deployment. Changes limited to this README or `docs/` skip deployment.

See [deployment and domain configuration](docs/DEPLOYMENT.md). No Node.js, MySQL, or paid cloud server is required for the public website.

## Attribution and data provenance

### Contact map

The contact page defaults to an AMap street-map preview with a clickable navigation link. A country-only IP lookup (`https://api.country.is/`) selects AMap for mainland China (`CN`) and Google Maps elsewhere. If lookup fails or times out, AMap remains available; visitors can override the provider. This third-party request reveals the visitor's network IP to country.is; the website does not store the IP, request GPS access, or use it for analytics. VPNs can affect the automatic choice.

Configure the **GitHub Actions repository secret** `AMAP_WEB_SERVICE_KEY` with a Web Service API key. Production builds resolve the CMS contact address and generate an unmodified AMap PNG (including attribution) before publishing. The key is never included in browser requests or public files. If the API is unavailable, a checked-in, key-free map snapshot is used only when its address exactly matches the current contact address. A changed address with failed generation stops production deployment rather than displaying the wrong map. Local and pull-request builds use that same snapshot or an address-link fallback. Review AMap's service terms and quota for this use. To refresh the fallback after changing the address, copy the successfully generated `assets/maps/contact-amap.png` and `_data/contact_map.json` to `assets/maps/contact-amap-fallback.png` and `assets/maps/contact-amap-fallback.json`, updating the latter's `image` path accordingly; never copy the API key.

al-folio is MIT-licensed; see [third-party notices](THIRD_PARTY_NOTICES.md). Dataset provenance is retained in the manifest. Public availability does not replace the source datasets' original citation and licensing requirements. Account information, private team records, environment files, and database dumps are not part of this repository.
