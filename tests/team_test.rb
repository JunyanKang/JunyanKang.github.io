require 'liquid'
require 'json'
require 'yaml'
require 'cgi'

template = Liquid::Template.parse(File.read('_pages/profile.html').sub(/\A---.*?---\s*/m, ''))
team = {'members' => []}
# Old CMS roles must also render correctly when a member moves to Alumni.
team['members'] += [
  {'name' => 'New alumnus', 'role' => 'PhD student', 'group' => 'alumni', 'year' => 2023},
  {'name' => 'New alumna', 'role' => "Master's student", 'group' => 'alumni', 'year' => 2023},
  {'name' => 'Current student', 'role' => 'PhD student', 'group' => 'doctoral', 'year' => 2023,
   'photo' => '/assets/img/test.jpg', 'photo_framing' => 'upper-body', 'photo_center_x' => 58, 'photo_scale' => 175}
]
html = template.render!('site' => {'data' => {'team' => team, 'china_map' => {'regions' => []}}})
cards = html.scan(/<article class="kl-member".*?<\/article>/m)
{'New alumnus' => 'PhD graduate', 'New alumna' => "Master's graduate", 'Current student' => 'PhD student'}.each do |name, role|
  card = cards.find { |item| item.include?("<h4>#{name}</h4>") }
  escaped = CGI.escapeHTML(role)
  raise "Wrong displayed role for #{name}" unless card&.include?("class=\"kl-member-role\">#{escaped}</p>")
end
student = cards.find { |item| item.include?('<h4>Current student</h4>') }
raise 'Per-person crop missing from portrait wrapper' unless student.include?('--portrait-center-x:58%;--portrait-scale:175%')
member = team['members'].last
member.merge!('name' => 'Edited name', 'group' => 'alumni', 'graduation_year' => 2026,
              'bio' => 'Edited research interests', 'hometown' => 'New hometown',
              'photo_center_x' => 45, 'photo_scale' => 160)
render = -> { template.render!('site' => {'data' => {'team' => team, 'china_map' => {'regions' => []}}}) }
edited = render.call
%w[Edited\ name Edited\ research\ interests New\ hometown 2026 --portrait-center-x:45%;--portrait-scale:160%].each do |value|
  raise "Member edit ignored: #{value}" unless edited.include?(value)
end
raise 'Moving to Alumni must update the role' unless edited.include?('PhD graduate')
member.delete('photo_center_x')
member.delete('photo_scale')
raise 'Cleared crop values must use defaults' unless render.call.include?('--portrait-center-x:50%;--portrait-scale:175%')
team['members'].delete(member)
raise 'Deleted member still rendered' if render.call.include?('Edited name')
team['members'].clear
raise 'Empty roster should have no member cards' if render.call.include?('<article class="kl-member"')
fields = YAML.load_file('.pages.yml')['content'].find { |item| item['name'] == 'team' }['fields'].find { |f| f['name'] == 'members' }['fields']
%w[photo_center_x photo_scale].each do |key|
  raise "CMS missing #{key}" unless fields.any? { |f| f['name'] == key && f['type'] == 'number' }
end
puts 'Team crop configuration and current/alumni role rendering passed.'
