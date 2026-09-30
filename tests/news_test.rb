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
  FileUtils.mkdir_p(["#{source}/_news", "#{source}/assets/img", "#{source}/_layouts", "#{source}/_includes"])
  %w[kanglab-carousel.liquid kanglab-news-card.liquid].each do |name|
    FileUtils.cp("_includes/#{name}", "#{source}/_includes/#{name}")
  end
  File.write("#{source}/assets/img/test.webp", 'fixture')
  File.write("#{source}/_layouts/news.html", '<!doctype html><title>{{ page.title }}</title>{{ content }}')
  File.write("#{source}/index.html", "---\n---\n{% include kanglab-carousel.liquid %}{% for n in site.news %}{% include kanglab-news-card.liquid story=n %}{% endfor %}")
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
  check(File.read("#{source}/_site/index.html").include?('data-carousel '), 'Featured news not available')
  write.call('visible', base.merge('show_in_hero' => false))
  build.call
  check(!File.read("#{source}/_site/index.html").include?('data-carousel '), 'Feature switch not applied')
  check(File.exist?("#{source}/_site/news/visible/index.html"), 'Removing from carousel must not unpublish news')
  check(File.read("#{source}/_site/index.html").include?('kl-news-card'), 'Non-featured news must remain listed')
  write.call('visible', base.merge('published' => false))
  build.call
  check(!File.exist?("#{source}/_site/news/visible/index.html"), 'Unpublishing left stale detail page')
  check(!File.read("#{source}/_site/index.html").include?('Visible story'), 'Draft still listed')

  # Exercise CMS serialization and editorial changes against the real templates.
  ['2020-02-03', Date.new(2020, 2, 3), Time.utc(2020, 2, 3)].each do |date|
    write.call('visible', base.merge('date' => date, 'title' => 'Edited <title>', 'hero_title' => '',
                                    'hero_order' => nil, 'category' => 'Publication', 'image_fit' => 'cover'))
    build.call
    html = File.read("#{source}/_site/index.html")
    check(html.include?('Edited &lt;title&gt;'), 'Title editing, escaping or empty hero-title fallback failed')
    check(html.include?('datetime="2020-02-03"'), 'CMS date serialization failed')
    check(html.include?('kl-carousel-slide--contain') && html.include?('kl-news-image--contain'), 'Publication figure cropped')
  end
  %w[original team-photo conference-photo].each do |framing|
    write.call('visible', base.merge('image_presentation' => framing, 'summary' => 'Edited summary'))
    build.call
    check(File.read("#{source}/_site/index.html").include?("data-photo-framing=\"#{framing}\""), 'Photo framing edit ignored')
  end
  write.call('visible', base.merge('hero_order' => 20))
  write.call('added', base.merge('title' => 'Added story', 'hero_title' => 'First slide', 'hero_order' => 1))
  build.call
  html = File.read("#{source}/_site/index.html")
  check(html.index('<h2>First slide</h2>') < html.index('<h2>Visible story</h2>'), 'Carousel order edit ignored')
  check(html.scan('data-slide-to=').size == 2, 'Carousel does not support added stories')
  FileUtils.mv("#{source}/_news/added.md", "#{source}/_news/renamed.md")
  build.call
  check(File.exist?("#{source}/_site/news/renamed/index.html"), 'Renamed news missing')
  check(!File.exist?("#{source}/_site/news/added/index.html"), 'Renaming left stale detail')
  FileUtils.rm("#{source}/_news/renamed.md")
  write.call('visible', base.merge('published' => false))
  build.call
  check(!File.exist?("#{source}/_site/news/renamed/index.html"), 'Deleting left stale detail')
  check(!File.read("#{source}/_site/index.html").include?('data-carousel '), 'Empty carousel should use fallback')
  ['javascript:alert(1)', '//example.test/', '/\\example.test'].each do |bad_link|
    write.call('visible', base.merge('link' => bad_link))
    begin
      build.call
      raise "Unsafe link accepted: #{bad_link}"
    rescue Jekyll::Errors::FatalException
      # Invalid published metadata must fail deployment instead of leaking a bad link.
    end
  end
  %w[image_source_url image_license_url].each do |field|
    write.call('visible', base.merge(field => 'javascript:alert(1)'))
    begin
      build.call
      raise "Unsafe credit link accepted: #{field}"
    rescue Jekyll::Errors::FatalException
    end
  end
  write.call('visible', base.merge('image' => '/assets/img/missing.webp'))
  begin
    build.call
    raise 'Missing cover accepted'
  rescue Jekyll::Errors::FatalException
  end
end
puts 'News CMS edits, date formats, real carousel/card rendering, rename/delete, publishing toggles, sitemap and safety validation passed.'
