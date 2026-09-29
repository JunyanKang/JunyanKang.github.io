---
title: Home
permalink: /
nav: false
---

<section class="kl-intro">
  <div class="kl-intro-copy">
    <p class="kl-eyebrow">KANG LAB · RETINAL BIOLOGY</p>
    <h1>The retina across<br>development,<br>aging & evolution.</h1>
    <p class="kl-intro-description">We study how retinal cells acquire their identities, change with age, and diversify across species, connecting molecular mechanisms with single-cell and spatial genomics.</p>
    <div class="kl-links kl-hero-actions"><a class="kl-button" href="{{ '/research/' | relative_url }}">Explore our research <span aria-hidden="true">↗</span></a><a class="kl-text-link" href="{{ '/expression-atlas/' | relative_url }}">Query the expression atlas <span aria-hidden="true">↗</span></a></div>
    <p class="kl-affiliation">Shanghai Ninth People's Hospital<br>Shanghai Jiao Tong University School of Medicine</p>
  </div>
  <figure class="kl-hero-figure"><img src="{{ '/assets/img/retinal-layers-concept.png' | relative_url }}" width="1448" height="1086" alt="Conceptual illustration of layered retinal cells, including rods, cones and retinal neurons" fetchpriority="high"><figcaption>Retinal cell diversity <span>Conceptual illustration</span></figcaption></figure>
</section>

<section class="kl-section">
  <div class="kl-section-heading"><div><p class="kl-eyebrow">OUR QUESTIONS</p><h2>Research directions</h2></div><a href="{{ '/research/' | relative_url }}">Explore all directions ↗</a></div>
  <a class="kl-retina-feature" href="{{ '/research/#retina' | relative_url }}"><div><span class="kl-number">01 / PRIMARY FOCUS</span><h3>Retinal development, aging & evolution</h3><p>How is retinal cell diversity generated, maintained over time, and reshaped across species?</p></div><div class="kl-focus-topics"><span>Development</span><span>Aging</span><span>Evolution</span></div></a>
  <div class="kl-theme-grid">
    <a href="{{ '/research/#rna' | relative_url }}"><span class="kl-number">02 / MOLECULAR MECHANISMS</span><h3>RNA & translation</h3><p>Post-transcriptional regulation, stored mRNAs and biomolecular condensation.</p><span class="kl-text-link">Discover this direction ↗</span></a>
    <a href="{{ '/research/#cell-fate' | relative_url }}"><span class="kl-number">03 / CELL IDENTITY</span><h3>Cell fate & chromatin</h3><p>Gene-regulatory mechanisms underlying differentiation and changes in cell identity.</p><span class="kl-text-link">Discover this direction ↗</span></a>
  </div>
</section>

<section class="kl-section">
  <div class="kl-section-heading"><div><p class="kl-eyebrow">SELECTED WORK</p><h2>From questions to discoveries</h2></div><a href="{{ '/publications/' | relative_url }}">All publications ↗</a></div>
  {% assign selected = site.data.publications_all.items | where: 'selected', true %}
  {% for paper in selected %}{% include kanglab-publication.liquid paper=paper compact=true %}{% endfor %}
</section>

<section class="kl-section kl-open-section">
  <div class="kl-section-heading"><div><p class="kl-eyebrow">OPEN SCIENCE</p><h2>Explore, query, reuse.</h2></div><a href="{{ '/resources/' | relative_url }}">All resources ↗</a></div>
  <div class="kl-open-grid"><article class="kl-open-atlas"><span class="kl-status">PUBLIC · NO SIGN-IN</span><h3>Expression atlas</h3><p>Query genes across seven bulk, single-cell and spatial datasets. Compare expression, explore orthologs and download figures or data.</p><a class="kl-button" href="{{ '/expression-atlas/' | relative_url }}">Open the atlas ↗</a></article><article><span class="kl-status">SOFTWARE & WORKFLOWS</span><h3>Tools for reproducible research</h3><p>Explore research software and workflows for regulatory genomics, spatial analysis and scientific literature.</p><a class="kl-text-link" href="{{ '/resources/#software' | relative_url }}">Browse software ↗</a></article></div>
</section>

<section class="kl-section kl-team-banner"><div><p class="kl-eyebrow">PEOPLE & IDEAS</p><h2>Science is a shared effort.</h2><p>Our work brings together retinal biology, molecular mechanisms and computational approaches.</p></div><div class="kl-links"><a href="{{ '/team/' | relative_url }}">Meet the team ↗</a><a href="{{ '/contact/' | relative_url }}">Get in touch ↗</a></div></section>
