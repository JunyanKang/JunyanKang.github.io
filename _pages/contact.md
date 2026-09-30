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
  <section class="kl-contact-details">
    <h2>Kang Lab</h2>
    <p>{{ contact.affiliation | escape }}</p>
    <h3>Email</h3>
    <a class="kl-contact-email" href="mailto:{{ contact.email | escape }}">{{ contact.email | escape }}</a>
    <h3>Visit</h3>
    <address>{{ contact.address_en | escape }}</address>
    {% assign recruitment = contact.recruitment %}
    {% if recruitment.enabled == true %}
    <div class="kl-recruitment" aria-labelledby="recruitment-title">
      <h3 id="recruitment-title">{{ recruitment.title | escape }}</h3>
      <p>{{ recruitment.description | escape }}</p>
      <p><a href="mailto:{{ recruitment.email | default: contact.email | escape }}?subject={{ recruitment.subject | url_encode }}">{{ recruitment.email | default: contact.email | escape }}</a></p>
      {% if recruitment.subject != empty and recruitment.subject != nil %}<p class="kl-recruitment-subject">Email subject: <span lang="zh">{{ recruitment.subject | escape }}</span><br><span>Replace 姓名 with your name.</span></p>{% endif %}
      <p>{{ recruitment.closing | escape }}</p>
    </div>
    {% endif %}
  </section>
  {% assign map = site.data.contact_map %}
  {% capture amap_link %}https://uri.amap.com/search?keyword={{ destination }}&amp;view=map&amp;src=KangLab&amp;callnative=0{% endcapture %}
  {% if map.available %}{% capture amap_link %}https://uri.amap.com/marker?position={{ map.location }}&amp;name={{ destination }}&amp;coordinate=gaode&amp;callnative=0&amp;src=KangLab{% endcapture %}{% endif %}
  <figure class="kl-visit-map" data-contact-map data-address="{{ contact.address_zh | escape }}" data-location="{{ map.location | escape }}">
    <div class="kl-map-provider" role="group" aria-label="Map provider">
      <button class="kl-map-provider-button" type="button" data-map-provider="amap" aria-label="高德地图" title="高德地图" aria-pressed="true"><img src="{{ '/assets/img/map-providers/amap.ico' | relative_url }}" width="22" height="22" alt=""></button>
      <button class="kl-map-provider-button" type="button" data-map-provider="google" aria-label="谷歌地图" title="谷歌地图" aria-pressed="false"><img src="{{ '/assets/img/map-providers/google-maps.png' | relative_url }}" width="22" height="22" alt=""></button>
    </div>
    <iframe data-amap-map data-src="{{ '/assets/maps/amap.html' | relative_url }}?v={{ site.time | date: '%s' }}" title="Interactive AMap to {{ contact.address_en | escape }}" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <noscript><a href="{{ amap_link }}" target="_blank" rel="noopener noreferrer">Open in AMap &#8599;</a></noscript>
    <iframe data-google-map hidden title="Google map to {{ contact.address_en | escape }}" referrerpolicy="no-referrer" allowfullscreen></iframe>
  </figure>
</div>
<script type="module" src="{{ '/assets/js/contact-map.mjs' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
