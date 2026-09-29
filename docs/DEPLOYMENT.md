# GitHub Pages and Tencent DNSPod

## Architecture

GitHub stores and builds the public academic site. GitHub Pages serves the static pages and compressed atlas data. Tencent DNSPod manages the domain only; it is not an application server in this setup.

The existing React/Express/MySQL site remains separate in the original project. Accounts, editing, and internal resource management have not been moved to GitHub Pages. The public site has no sign-in requirement and does not send visitor queries to that backend.

## Repository and workflow

- Repository: `JunyanKang/JunyanKang.github.io`
- Branch: `main`
- Pages source: GitHub Actions
- Workflow: `.github/workflows/pages.yml`
- Build: `node scripts/build.mjs`
- Artifact: `_site/`

Do not publish `vendor/`, `node_modules/`, `.env`, the old account notes, or MySQL dumps. The public atlas is the explicit expression-only export in `assets/atlas/v1`.

## Custom domain

First set the Pages custom domain to `kanglab.cool`. In DNSPod, configure:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | junyankang.github.io |

Use the default DNS line and a 600-second TTL. Preserve unrelated DNS records. After DNS validation and certificate issuance, enable **Enforce HTTPS** in Pages settings. GitHub provides the certificate; a separately purchased Tencent SSL certificate is not needed for Pages.

The Actions deployment does not configure a domain merely from a `CNAME` file. The domain must be set in the repository's Pages settings. `_config.yml` should use `url: https://kanglab.cool` after binding, with `baseurl: ''`.

## Validation and recovery

Check home, publications, resources, and `/expression-atlas/?gene=Pax6`; also reload the atlas URL directly. Query a nonexistent gene to verify the no-match state. Test Plot/Data, CSV export, PDF export, and mobile navigation.

If a build fails, the previously deployed site remains available. Fix the failure and push again. To roll back a content change, revert the relevant commit and let Actions redeploy. Do not delete the existing database or its source tables when updating the public snapshot.

References: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [al-folio](https://github.com/alshedivat/al-folio).

