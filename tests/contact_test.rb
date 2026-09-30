require 'jekyll'
require 'yaml'
require 'cgi'

def check(condition, message)
  raise message unless condition
end

site = Jekyll::Site.new(Jekyll.configuration({'quiet' => true}))
source = File.read('_pages/contact.md').sub(/\A---.*?---\s*/m, '')
render = lambda do |contact|
  site.filter_cache.clear
  Liquid::Template.parse(source).render!({'site' => {'data' => {'contact' => contact}}},
    filters: [Jekyll::Filters], registers: {site: site})
end
base = {'email' => 'contact@example.test', 'address_en' => 'Test address'}
recruitment = {'enabled' => true, 'title' => 'Test position', 'description' => 'Send an updated CV.',
               'email' => 'jobs@example.test', 'subject' => 'Application & name', 'closing' => 'Until filled.'}
check(!render.call(base).include?('class="kl-recruitment"'), 'Absent recruitment must stay hidden')
check(!render.call(base.merge('recruitment' => recruitment.merge('enabled' => false))).include?('class="kl-recruitment"'), 'Recruitment switch ignored')
html = render.call(base.merge('recruitment' => recruitment))
check(html.index('</address>') < html.index('class="kl-recruitment"'), 'Recruitment must follow the address')
%w[title description closing].each { |key| check(html.include?(recruitment[key]), "Recruitment #{key} missing") }
mailto = html.match(/href="(mailto:jobs@example.test[^"]*)"/)[1]
check(CGI.parse(mailto.split('?', 2)[1])['subject'] == [recruitment['subject']], 'Email subject must be URL encoded')
check(html.include?('Application &amp; name'), 'Subject not escaped')
edited = recruitment.merge('title' => 'Edited <position>', 'email' => nil, 'subject' => '')
html = render.call(base.merge('recruitment' => edited))
check(html.include?('Edited &lt;position&gt;'), 'Recruitment title edit/escaping failed')
check(html.include?('mailto:contact@example.test?subject='), 'Application email fallback failed')
check(!html.include?('Email subject:'), 'Cleared subject should not leave a caption')

cms = YAML.load_file('.pages.yml')['content']
fields = cms.find { |entry| entry['name'] == 'contact' }['fields']
editor = fields.find { |field| field['name'] == 'recruitment' }
check(editor && editor['type'] == 'object', 'Recruitment editor missing')
%w[enabled title description email subject closing].each do |key|
  check(editor['fields'].any? { |field| field['name'] == key }, "Missing recruitment field #{key}")
end
team_fields = cms.find { |entry| entry['name'] == 'team' }['fields']
%w[pi members].each do |key|
  hint = team_fields.find { |field| field['name'] == key }['fields'].find { |field| field['name'] == 'photo' }['description']
  check(hint.include?('200 KB') && hint.include?('4:5') && hint.include?('640 × 800') && hint.include?('413'), "Missing pre-upload size/aspect-ratio guidance for #{key}")
end
puts 'Contact recruitment placement, CMS edits, visibility, email subject, escaping and upload guidance passed.'
