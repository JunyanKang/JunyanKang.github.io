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
    # Each CMS edit represents a fresh build, not a mutation within a cached render.
    @site.filter_cache.clear
    Liquid::Template.parse(@source).render!({'site' => {'data' => {'software' => @software}}}, filters: [Jekyll::Filters], registers: {site: @site})
  end

  def test_tools_and_categories
    result = render_page
    assert_equal @software['projects'].count { |p| p['visible'] == true }, result.scan('<article>').size
    refute_includes result, 'MarkItDown'
    refute_includes result, 'View on GitHub'
    assert_equal @software['projects'].count { |p| p['visible'] == true }, result.scan('class="kl-software-icon kl-github-link"').size
    refute_includes result, 'Releases ↗'
    assert_equal @software['projects'].count { |p| p['visible'] == true && p['releases'] }, result.scan('class="kl-software-icon kl-release-link"').size
    assert_includes result, 'aria-label="Open ERG Viewer on GitHub"'
    plugins = result.split('data-software-group="productivity"').last
    assert_includes plugins, 'Biomed Workbench'
    assert_includes plugins, 'Codex plugin'
  end

  def test_hidden_tools_are_not_rendered_or_deleted
    @software['projects'].find { |p| p['title'] == 'Biomed Workbench' }['visible'] = false
    refute_includes render_page, 'Biomed Workbench'
    assert_equal 6, @software['projects'].size
  end

  def test_recommendation_badge_is_controlled_by_cms_without_changing_visibility
    @software['projects'].each { |p| p.delete('recommended') }
    refute_includes render_page, 'class="kl-recommended"'
    project = @software['projects'].find { |p| p['title'] == 'SCENIC+ GRN Workflow' }
    project['recommended'] = true
    assert_equal 1, render_page.scan('class="kl-recommended"').size
    assert_includes render_page, 'aria-label="Recommended"'
    assert_includes render_page, 'data-icon="thumbs-up"'
    project['recommended'] = false
    refute_includes render_page, 'class="kl-recommended"'
    project['recommended'] = true
    project['visible'] = false
    refute_includes render_page, 'class="kl-recommended"'
  end

  def test_erg_viewer_is_in_imaging_and_can_be_hidden
    project = @software['projects'].find { |p| p['title'] == 'ERG Viewer' }
    assert_equal 'imaging', project['group']
    assert_equal 'https://github.com/JunyanKang/ERG_Viewer', project['url']
    imaging = render_page.split('data-software-group="imaging"').last.split('data-software-group="productivity"').first
    assert_includes imaging, 'ERG Viewer'
    assert_includes imaging, project['url']
    project['visible'] = false
    refute_includes render_page, 'ERG Viewer'
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
