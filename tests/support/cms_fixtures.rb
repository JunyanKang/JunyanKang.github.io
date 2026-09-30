# Behavioral tests must not freeze records that editors can change in Pages CMS.
module CmsFixtures
  def self.software
    {
      'groups' => %w[genomics imaging productivity].map { |id| {'id' => id, 'title' => id} },
      'projects' => [
        {'title' => 'Analysis fixture', 'group' => 'genomics'},
        {'title' => 'Imaging fixture', 'group' => 'imaging', 'releases' => 'https://github.com/example/imaging/releases'},
        {'title' => 'Plugin fixture', 'group' => 'productivity', 'category' => 'Codex plugin'},
        {'title' => 'Hidden fixture', 'group' => 'imaging', 'visible' => false}
      ].map { |p| {'visible' => true, 'url' => 'https://github.com/example/tool', 'description' => 'Test software'}.merge(p) }
    }
  end

  def self.external_resources
    {
      'groups' => %w[databases tools labs].map { |id| {'id' => id, 'title' => id} },
      'items' => [
        {'title' => 'Database Alpha', 'group' => 'databases', 'url' => 'https://www.ncbi.nlm.nih.gov/geo/'},
        {'title' => 'Database Beta', 'group' => 'databases', 'url' => 'https://www.ensembl.org/', 'order' => 2},
        {'title' => 'Tool fixture', 'group' => 'tools', 'url' => 'https://www.ebi.ac.uk/'},
        {'title' => 'Researcher fixture', 'group' => 'labs', 'url' => 'https://www.nih.gov/', 'image_kind' => 'portrait'}
      ].map do |item|
        {'visible' => true, 'order' => 1, 'description' => 'Test resource',
         'image' => '/assets/img/brand/kanglab-symbol-v17.png', 'image_kind' => 'logo',
         'image_alt' => 'Test image', 'image_source' => item['url']}.merge(item)
      end
    }
  end
end
