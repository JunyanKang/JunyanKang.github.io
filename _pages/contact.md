---
title: Contact
permalink: /contact/
nav: true
nav_order: 5
---
{% assign contact = site.data.contact %}
{% assign destination = contact.address_zh | uri_escape %}
<header class="kl-page-heading"><p class="kl-eyebrow">CONNECT WITH US</p><h1>Contact & collaboration</h1><p>Visit the lab, discuss a research question, or explore a collaboration.</p></header>
<div class="kl-visit-layout">
  <section class="kl-contact-details"><h2>Kang Lab</h2><p>{{ contact.affiliation | escape }}</p><h3>Email</h3><a class="kl-contact-email" href="mailto:{{ contact.email | escape }}">{{ contact.email | escape }}</a><h3>Visit</h3><address><span lang="zh">{{ contact.address_zh | escape }}</span><br>{{ contact.address_en | escape }}</address><div class="kl-links"><a class="kl-button" href="https://uri.amap.com/search?keyword={{ destination }}&amp;city=310000&amp;view=map&amp;src=KangLab&amp;callnative=0" target="_blank" rel="noopener noreferrer">高德地图 / Directions ↗</a><a href="https://map.baidu.com/search/{{ destination }}" target="_blank" rel="noopener noreferrer">百度地图 ↗</a></div></section>
  <figure class="kl-visit-map"><iframe title="Map to 350 Yanqiao Road, Shanghai" src="https://maps.google.com/maps?q={{ destination }}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><figcaption>上海市浦东新区 · Pudong, Shanghai. If the embedded map is unavailable, use the AMap or Baidu links.</figcaption></figure>
</div>
