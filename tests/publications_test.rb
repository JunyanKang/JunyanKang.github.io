require 'liquid'
require 'yaml'

template = Liquid::Template.parse(File.read('_includes/kanglab-publication.liquid'))
authors = [
  {'name' => 'First <Author>', 'first_author' => true},
  {'name' => 'Both Roles', 'first_author' => true, 'corresponding_author' => true},
  {'name' => 'Corresponding', 'corresponding_author' => true},
  {'name' => 'Unmarked'}
]
paper = {'title' => 'Test', 'authors' => 'Test authors', 'author_entries' => authors, 'url' => 'https://example.com', 'year' => 2026}
html = template.render!('include' => {'paper' => paper})
raise 'First-author markers missing' unless html.scan('title="First author">*</sup>').size == 2
raise 'Corresponding-author markers missing' unless html.scan('title="Corresponding author">#</sup>').size == 2
raise 'Author names must be escaped' unless html.include?('First &lt;Author&gt;') && !html.include?('First <Author>')
raise 'Unmarked author received a marker' unless html.include?('Unmarked</p>')
raise 'Author separators missing' unless html.include?('</sup>, Both Roles')
plain = template.render!('include' => {'paper' => paper.merge('author_entries' => [{'name' => 'Unmarked'}])})
raise 'Unchecked flags must not render' if plain.include?('<sup')
config = YAML.load_file('.pages.yml')
items = config['content'].find { |c| c['name'] == 'publications' }['fields'].find { |f| f['name'] == 'items' }
field = items['fields'].find { |f| f['name'] == 'author_entries' }
raise 'CMS author list is not configured' unless field['type'] == 'object' && field['list']
raise 'CMS author legend is truncated' unless field['description'].include?('# Corresponding author')
%w[first_author corresponding_author].each do |role|
  raise "Missing CMS toggle #{role}" unless field['fields'].any? { |f| f['name'] == role && f['type'] == 'boolean' }
end
puts 'PASS author markers, escaping, separators, unchecked flags and CMS toggles'
