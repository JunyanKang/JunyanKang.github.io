require 'jekyll'
require 'yaml'

class SoftwareVisibilityTest
  def assert_equal(expected, actual)
    raise "Expected #{expected.inspect}, got #{actual.inspect}" unless expected == actual
  end

  def assert_includes(text, value)
    raise "Missing #{value}" unless text.include?(value)
  end

  def refute_includes(text, value)
    raise "Unexpected #{value}" if text.include?(value)
  end
  def setup
    @site = Jekyll::Site.new(Jekyll.configuration({'quiet' => true}))
    @software = YAML.load_file('_data/software.yml')
    @source = File.read('_pages/resources.html').sub(/\A---.*?---\s*/m, '')
  end

  def render_page
    Liquid::Template.parse(@source).render!({'site' => {'data' => {'software' => @software}}}, filters: [Jekyll::Filters], registers: {site: @site})
  end

  def test_tools_and_categories
    result = render_page
    assert_equal 5, result.scan('<article>').size
    refute_includes result, 'MarkItDown'
    plugins = result.split('data-software-group="productivity"').last
    assert_includes plugins, 'Biomed Workbench'
    assert_includes plugins, 'Codex plugin'
  end

  def test_hidden_tools_are_not_rendered_or_deleted
    @software['projects'].find { |p| p['title'] == 'Biomed Workbench' }['visible'] = false
    refute_includes render_page, 'Biomed Workbench'
    assert_equal 5, @software['projects'].size
  end

  def test_empty_categories_and_unpublished_tools_are_not_rendered
    @software['projects'].each { |p| p['visible'] = false }
    @software['projects'].first.delete('visible')
    result = render_page
    refute_includes result, 'data-software-group='
    refute_includes result, 'data-software-filter='
    assert_includes result, 'Research software will be listed here'
  end
end

SoftwareVisibilityTest.instance_methods.grep(/^test_/).each do |method|
  test = SoftwareVisibilityTest.new
  test.setup
  test.public_send(method)
  puts "PASS #{method}"
end
