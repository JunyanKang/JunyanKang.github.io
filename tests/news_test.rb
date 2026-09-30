require 'jekyll'
require 'yaml'
require 'tmpdir'
require 'fileutils'
require_relative '../_plugins/news'

def check(condition, message)
  raise message unless condition
end

cms = YAML.load_file('.pages.yml')['content'].find { |item| item['name'] == 'news' }
check(cms && cms['type'] == 'collection' && cms['path'] == '_news', 'Missing CMS News collection')
fields = cms['fields'].to_h { |f| [f['name'], f] }
check(fields['body']['type'] == 'rich-text', 'News editor must support rich text and images')
check(fields['published']['default'] == false, 'New stories must default to drafts')
%w[title date category summary image image_alt published show_in_hero hero_title hero_order link link_label body].each do |name|
  check(fields.key?(name), "CMS missing #{name}")
end

Dir.mktmpdir('kanglab-news-test') do |source|
  FileUtils.mkdir_p(["#{source}/_news", "#{source}/assets/img", "#{source}/_layouts"])
  File.write("#{source}/assets/img/test.webp", 'fixture')
  File.write("#{source}/_layouts/news.html", '<!doctype html><title>{{ page.title }}</title>{{ content }}')
  File.write("#{source}/index.html", "---\n---\n{% for n in site.news %}{{ n.title }} {% if n.show_in_hero %}FEATURED{% endif %}{% endfor %}")
  base = {'title' => 'Visible story', 'date' => '2020-01-01', 'category' => 'Resource',
          'summary' => 'A resource highlight', 'image' => '/assets/img/test.webp',
          'image_alt' => 'Conceptual artwork', 'published' => true, 'show_in_hero' => true,
          'hero_order' => 1, 'link' => '/expression-atlas/', 'layout' => 'news'}
  write = ->(slug, data) { File.write("#{source}/_news/#{slug}.md", "#{data.to_yaml}---\nAn illustrated news story.") }
  write.call('visible', base)
  write.call('draft', base.merge('title' => 'Hidden draft', 'published' => false))
  write.call('missing-flag', base.reject { |k, _| k == 'published' }.merge('title' => 'Missing flag'))
  write.call('string-flag', base.merge('title' => 'Wrong flag', 'published' => 'true'))
  write.call('future', base.merge('title' => 'Future story', 'date' => '2099-01-01'))
  config = Jekyll.configuration({'source' => source, 'destination' => "#{source}/_site",
    'quiet' => true, 'url' => 'https://example.test', 'unpublished' => true, 'future' => true,
    'plugins' => ['jekyll-sitemap'], 'collections' => {'news' => {'output' => true, 'permalink' => '/news/:name/'}}})
  build = -> { Jekyll::Site.new(config).process }
  build.call
  check(File.exist?("#{source}/_site/news/visible/index.html"), 'Published detail missing')
  %w[draft missing-flag string-flag future].each do |slug|
    check(!File.exist?("#{source}/_site/news/#{slug}/index.html"), "Unpublished route leaked: #{slug}")
    check(!File.read("#{source}/_site/sitemap.xml").include?("/news/#{slug}/"), "Unpublished sitemap leaked: #{slug}")
  end
  check(File.read("#{source}/_site/index.html").include?('FEATURED'), 'Featured news not available')
  write.call('visible', base.merge('show_in_hero' => false))
  build.call
  check(!File.read("#{source}/_site/index.html").include?('FEATURED'), 'Feature switch not applied')
  write.call('visible', base.merge('published' => false))
  build.call
  check(!File.exist?("#{source}/_site/news/visible/index.html"), 'Unpublishing left stale detail page')
  check(!File.read("#{source}/_site/index.html").include?('Visible story'), 'Draft still listed')
  ['javascript:alert(1)', '//example.test/', '/\\example.test'].each do |bad_link|
    write.call('visible', base.merge('link' => bad_link))
    begin
      build.call
      raise "Unsafe link accepted: #{bad_link}"
    rescue Jekyll::Errors::FatalException
      # Invalid published metadata must fail deployment instead of leaking a bad link.
    end
  end
  write.call('visible', base.merge('image' => '/assets/img/missing.webp'))
  begin
    build.call
    raise 'Missing cover accepted'
  rescue Jekyll::Errors::FatalException
  end
end
puts 'News CMS fields, draft/future exclusion, unpublishing, hero switch, sitemap and validation passed.'
