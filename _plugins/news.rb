require 'date'
require 'uri'

module KangLab
  # Publishing is opt-in, even when Jekyll is run with --unpublished.
  class News < Jekyll::Generator
    safe true
    priority :highest

    def generate(site)
      collection = site.collections['news']
      return unless collection

      collection.docs.select! { |doc| doc.data['published'] == true }
      collection.docs.each { |doc| validate!(doc, site) }
      collection.docs.reject! { |doc| doc.date > site.time }
    end

    def validate!(doc, site)
      data = doc.data
      %w[title date category summary image image_alt].each do |field|
        fail_news(doc, "Missing #{field}") if data[field].to_s.strip.empty?
      end
      fail_news(doc, 'Missing article body') if doc.content.to_s.strip.empty?
      fail_news(doc, 'Invalid category') unless ['Publication', 'Resource', 'Lab life', 'Event'].include?(data['category'])
      image = data['image'].to_s
      root = File.realpath(File.join(site.source, 'assets/img'))
      candidate = File.expand_path(image.delete_prefix('/'), site.source)
      valid_image = image.start_with?('/assets/img/') && File.file?(candidate) && File.realpath(candidate).start_with?(root + '/')
      fail_news(doc, 'Cover must be an existing image under /assets/img/') unless valid_image
      if data['show_in_hero'] == true
        order = data['hero_order']
        fail_news(doc, 'Carousel order must be a number') unless order.nil? || order.is_a?(Numeric)
      end
      link = data['link'].to_s
      unless link.empty?
        uri = URI.parse(link)
        internal = link.start_with?('/') && !link.start_with?('//') && !link.include?('\\') && !link.match?(/[\r\n]/)
        external = uri.scheme == 'https' && uri.host && !uri.userinfo
        fail_news(doc, 'Related link must be a site path or HTTPS URL') unless internal || external
      end
      data['description'] = data['summary']
      data['og_image'] = data['image']
      data['hero_order'] ||= 10
    rescue URI::InvalidURIError
      fail_news(doc, 'Invalid related link')
    end

    def fail_news(doc, message)
      raise Jekyll::Errors::FatalException, "News #{doc.relative_path}: #{message}"
    end
  end
end
