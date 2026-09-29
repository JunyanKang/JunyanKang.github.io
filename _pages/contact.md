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
  <section class="kl-contact-details"><h2>Kang Lab</h2><p>{{ contact.affiliation | escape }}</p><h3>Email</h3><a class="kl-contact-email" href="mailto:{{ contact.email | escape }}">{{ contact.email | escape }}</a><h3>Visit</h3><address><span lang="zh">{{ contact.address_zh | escape }}</span><br>{{ contact.address_en | escape }}</address></section>
  {% assign map = site.data.contact_map %}
  {% capture amap_link %}https://uri.amap.com/search?keyword={{ destination }}&amp;view=map&amp;src=KangLab&amp;callnative=0{% endcapture %}
  {% if map.available %}{% capture amap_link %}https://uri.amap.com/marker?position={{ map.location }}&amp;name={{ destination }}&amp;coordinate=gaode&amp;callnative=0&amp;src=KangLab{% endcapture %}{% endif %}
  <figure class="kl-visit-map" data-contact-map data-address="{{ contact.address_zh | escape }}" data-location="{{ map.location | escape }}">
    <div class="kl-map-toolbar"><span data-map-status aria-live="polite">AMap</span><label for="contact-map-provider">Map <select id="contact-map-provider"><option value="auto">Auto</option><option value="amap">AMap</option><option value="google">Google Maps</option></select></label></div>
    <a class="kl-map-preview" data-amap-preview href="{{ amap_link }}" target="_blank" rel="noopener noreferrer" aria-label="Open directions to {{ contact.address_en | escape }} on AMap">
      {% if map.available %}<img src="{{ map.image | relative_url }}?v={{ map.generated_at | uri_escape }}" width="1500" height="800" alt="AMap street map marking {{ contact.address_zh | escape }}. Click to open directions.">{% else %}<span class="kl-map-unavailable">Map preview unavailable. Open the address in AMap ↗</span>{% endif %}
    </a>
    <iframe data-google-map hidden title="Google map to {{ contact.address_en | escape }}" referrerpolicy="no-referrer" allowfullscreen></iframe>
    <figcaption><span>Street-address location · Pudong, Shanghai</span><a data-map-directions href="{{ amap_link }}" target="_blank" rel="noopener noreferrer">Directions on AMap ↗</a></figcaption>
  </figure>
</div>
<script type="module" src="{{ '/assets/js/contact-map.mjs' | relative_url }}"></script>
