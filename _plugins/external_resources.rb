require 'uri'

module KangLab
  class ExternalResources < Jekyll::Generator
    safe true

    def generate(site)
      validate!(site.data['external_resources'], site.source)
    end

    def validate!(data, source = File.expand_path('..', __dir__))
      return unless data
      groups = data.fetch('groups').map { |g| g.fetch('id') }
      fail_resource('Invalid or duplicate category IDs') unless groups.uniq == groups && groups.all? { |g| g.match?(/\A[a-z][a-z0-9-]*\z/) }
      urls = []
      data.fetch('items').select { |item| item['visible'] == true }.each do |item|
        %w[title description url group].each do |field|
          fail_resource("Missing #{field}") if item[field].to_s.strip.empty?
        end
        fail_resource("Unknown category for #{item['title']}") unless groups.include?(item['group'])
        fail_resource("Order must be numeric for #{item['title']}") unless item['order'].is_a?(Numeric)
        uri = URI.parse(item['url'])
        fail_resource("Use a public HTTPS URL for #{item['title']}") unless uri.scheme == 'https' && uri.host && !uri.userinfo
        host = uri.host.downcase
        fail_resource("Placeholder or local URL for #{item['title']}") if host == 'localhost' || host.end_with?('.localhost', '.local') || host.match?(/\A(?:127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/) || %w[example.com example.org example.net].any? { |domain| host == domain || host.end_with?(".#{domain}") }
        normalized = item['url'].sub(%r{/$}, '')
        fail_resource("Duplicate URL for #{item['title']}") if urls.include?(normalized)
        urls << normalized
        image = item['image'].to_s
        unless image.empty?
          root = File.realpath(File.join(source, 'assets/img'))
          path = File.expand_path(image.delete_prefix('/'), source)
          valid = image.start_with?('/assets/img/') && image.match?(/\.(?:png|jpe?g|webp|svg|ico)\z/i) && File.file?(path) && File.realpath(path).start_with?(root + '/')
          fail_resource("Invalid local image for #{item['title']}") unless valid
          fail_resource("Missing image description for #{item['title']}") if item['image_alt'].to_s.strip.empty?
          fail_resource("Invalid image type for #{item['title']}") unless %w[logo portrait].include?(item['image_kind'])
          image_source = URI.parse(item['image_source'].to_s)
          fail_resource("Missing HTTPS image source for #{item['title']}") unless image_source.scheme == 'https' && image_source.host && !image_source.userinfo
        end
      end
    rescue URI::InvalidURIError, KeyError => e
      fail_resource(e.message)
    end

    def fail_resource(message)
      raise Jekyll::Errors::FatalException, "External resources: #{message}"
    end
  end
end
