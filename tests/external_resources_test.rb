require 'jekyll'
require 'yaml'
require_relative '../_plugins/external_resources'

def check(condition, message)
  raise message unless condition
end

data = YAML.load_file('_data/external_resources.yml')
validator = KangLab::ExternalResources.new
validator.validate!(data)
site = Jekyll::Site.new(Jekyll.configuration({'quiet' => true}))
template = File.read('_includes/kanglab-external-resources.liquid')
render = lambda do |value|
  site.filter_cache.clear
  Liquid::Template.parse(template).render!({'site' => {'data' => {'external_resources' => value}}},
    filters: [Jekyll::Filters], registers: {site: site})
end
copy = -> { Marshal.load(Marshal.dump(data)) }
html = render.call(data)
check(render.call(nil).strip.empty?, 'Absent external data should not break other resources')
check(html.scan('class="kl-external-link"').size == data['items'].size, 'All links should render')
check(html.scan('class="kl-external-group"').size == 3, 'Expected three categories')
check(html.scan('rel="noopener noreferrer"').size == data['items'].size, 'External links need safe new-tab attributes')
check(html.scan('loading="lazy"').size == data['items'].size, 'Expected images for all curated resources')
researchers = data['items'].select { |item| item['group'] == 'labs' }
check(researchers.size == 20, 'Expected twenty curated researchers')
check(html.scan('kl-external-visual--portrait').size == researchers.size, 'Expected a portrait for each researcher')
check(researchers.all? { |item| item['image_kind'] == 'portrait' && !item['image_source'].to_s.empty? }, 'Each portrait must have provenance')
data['items'].each { |item| check(html.include?(item['image']), "Missing image for #{item['title']}") }
mutated = copy.call
mutated['items'][0].delete('image')
validator.validate!(mutated)
check(render.call(mutated).include?('<span aria-hidden="true">N</span>'), 'Missing-image initial fallback failed')
{'image' => '/assets/img/missing-image.png', 'image_kind' => 'invalid', 'image_alt' => '', 'image_source' => 'javascript:alert(1)'}.each do |field, value|
  invalid = copy.call
  invalid['items'][0][field] = value
  begin
    validator.validate!(invalid)
    raise "Invalid image field accepted: #{field}"
  rescue Jekyll::Errors::FatalException
  end
end
mutated = copy.call
mutated['items'].first['visible'] = false
check(!render.call(mutated).include?('NCBI GEO'), 'Hidden resource leaked')
mutated['items'].each { |item| item['visible'] = false if item['group'] == 'labs' }
check(!render.call(mutated).include?('external-labs'), 'Empty category still displayed')
mutated['items'].each { |item| item.delete('visible') }
check(!render.call(mutated).include?('id="external-resources"'), 'Visibility must be opt-in')
mutated = copy.call
mutated['items'][0]['title'] = '<script>alert(1)</script>'
mutated['items'][0]['description'] = '<img onerror="alert(1)">'
check(!render.call(mutated).include?('<script>'), 'Title not escaped')
check(render.call(mutated).include?('&lt;img'), 'Description not escaped')
mutated = copy.call
mutated['items'][0]['order'] = 99
html = render.call(mutated)
check(html.index('Ensembl') < html.index('NCBI GEO'), 'CMS ordering ignored')
%w[javascript:alert(1) http://example.com/ https://example.com/ https://localhost/ https://127.0.0.1/].each do |url|
  invalid = copy.call
  invalid['items'][0]['url'] = url
  begin
    validator.validate!(invalid)
    raise "Invalid URL accepted: #{url}"
  rescue Jekyll::Errors::FatalException
  end
end
%w[group order].each do |field|
  invalid = copy.call
  invalid['items'][0][field] = 'invalid'
  begin
    validator.validate!(invalid)
    raise "Invalid #{field} accepted"
  rescue Jekyll::Errors::FatalException
  end
end
invalid = copy.call
invalid['items'][1]['url'] = invalid['items'][0]['url']
begin
  validator.validate!(invalid)
  raise 'Duplicate URL accepted'
rescue Jekyll::Errors::FatalException
end
cms = YAML.load_file('.pages.yml')['content'].find { |entry| entry['name'] == 'external_resources' }
check(cms['path'] == '_data/external_resources.yml', 'CMS points to wrong file')
fields = cms['fields'].find { |field| field['name'] == 'items' }['fields']
check(fields.find { |f| f['name'] == 'visible' }['default'] == false, 'New links must default to hidden')
%w[image image_kind image_alt image_source].each do |key|
  check(fields.any? { |f| f['name'] == key }, "CMS missing #{key}")
end
page = File.read('_pages/resources.html')
check(page.index('id="lab-data"') < page.index('id="software"'), 'Dataset section must precede software')
check(page.index('include kanglab-external-resources') > page.index('Research software will be listed'), 'External resources must be third')
puts 'PASS external resource ordering, visibility, escaping, categories, CMS and URL validation'
