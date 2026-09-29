---
title: Contact
permalink: /contact/
nav: true
nav_order: 5
---
{% assign contact = site.data.contact %}
{% assign destination = contact.address_zh | uri_escape %}
<h1 class="kl-visually-hidden">Contact</h1>
<div class="kl-visit-layout">
  <section class="kl-contact-details"><h2>Kang Lab</h2><p>{{ contact.affiliation | escape }}</p><h3>Email</h3><a class="kl-contact-email" href="mailto:{{ contact.email | escape }}">{{ contact.email | escape }}</a><h3>Visit</h3><address>{{ contact.address_en | escape }}</address></section>
  {% assign map = site.data.contact_map %}
  {% capture amap_link %}https://uri.amap.com/search?keyword={{ destination }}&amp;view=map&amp;src=KangLab&amp;callnative=0{% endcapture %}
  {% if map.available %}{% capture amap_link %}https://uri.amap.com/marker?position={{ map.location }}&amp;name={{ destination }}&amp;coordinate=gaode&amp;callnative=0&amp;src=KangLab{% endcapture %}{% endif %}
  <figure class="kl-visit-map" data-contact-map data-address="{{ contact.address_zh | escape }}" data-location="{{ map.location | escape }}">
    <div class="kl-map-provider" role="group" aria-label="Map provider">
      <button class="kl-map-provider-button" type="button" data-map-provider="amap" aria-label="高德地图" title="高德地图" aria-pressed="true"><img src="{{ '/assets/img/map-providers/amap.ico' | relative_url }}" width="22" height="22" alt=""></button>
      <button class="kl-map-provider-button" type="button" data-map-provider="google" aria-label="谷歌地图" title="谷歌地图" aria-pressed="false"><img src="{{ '/assets/img/map-providers/google-maps.png' | relative_url }}" width="22" height="22" alt=""></button>
    </div>
    <a class="kl-map-preview" data-amap-preview href="{{ amap_link }}" target="_blank" rel="noopener noreferrer" aria-label="Open directions to {{ contact.address_en | escape }} on AMap">
      {% if map.available %}<img src="{{ map.image | relative_url }}?v={{ map.generated_at | uri_escape }}" width="1500" height="800" alt="AMap street map marking {{ contact.address_zh | escape }}. Click to open directions.">{% else %}<span class="kl-map-unavailable">Map preview unavailable. Open the address in AMap ↗</span>{% endif %}
    </a>
    <iframe data-google-map hidden title="Google map to {{ contact.address_en | escape }}" referrerpolicy="no-referrer" allowfullscreen></iframe>
  </figure>
</div>
<script type="module" src="{{ '/assets/js/contact-map.mjs' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
