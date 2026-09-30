require 'liquid'
require 'json'
require 'yaml'
require 'cgi'

template = Liquid::Template.parse(File.read('_pages/profile.html').sub(/\A---.*?---\s*/m, ''))
team = JSON.parse(File.read('_data/team.json'))
# Old CMS roles must also render correctly when a member moves to Alumni.
team['members'] += [
  {'name' => 'New alumnus', 'role' => 'PhD student', 'group' => 'alumni', 'year' => 2023},
  {'name' => 'New alumna', 'role' => "Master's student", 'group' => 'alumni', 'year' => 2023},
  {'name' => 'Current student', 'role' => 'PhD student', 'group' => 'doctoral', 'year' => 2023}
]
html = template.render!('site' => {'data' => {'team' => team, 'china_map' => {'regions' => []}}})
cards = html.scan(/<article class="kl-member".*?<\/article>/m)
{'New alumnus' => 'PhD graduate', 'New alumna' => "Master's graduate", 'Current student' => 'PhD student', 'Yu Liu' => 'PhD graduate', 'Yu-Tong Liu' => "Master's graduate"}.each do |name, role|
  card = cards.find { |item| item.include?("<h4>#{name}</h4>") }
  escaped = CGI.escapeHTML(role)
  raise "Wrong displayed role for #{name}" unless card&.include?("class=\"kl-member-role\">#{escaped}</p>")
end
ding = cards.find { |item| item.include?('<h4>Lu-Yue Ding</h4>') }
raise 'Per-person crop missing from portrait wrapper' unless ding.include?('--portrait-center-x:58%;--portrait-scale:175%')
fields = YAML.load_file('.pages.yml')['content'].find { |item| item['name'] == 'team' }['fields'].find { |f| f['name'] == 'members' }['fields']
%w[photo_center_x photo_scale].each do |key|
  raise "CMS missing #{key}" unless fields.any? { |f| f['name'] == key && f['type'] == 'number' }
end
puts 'Team crop configuration and current/alumni role rendering passed.'
