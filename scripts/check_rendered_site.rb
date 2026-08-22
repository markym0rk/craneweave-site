#!/usr/bin/env ruby
# frozen_string_literal: true

require "nokogiri"
require "pathname"
require "uri"

ROOT = Pathname.new(__dir__).parent.join("_site").realpath
EXPECTED_PAGES = 19
AUDIENCES = ["Students & applicants", "Professionals", "Organizations"].freeze
ALLOWED_FORMS = {
  "start/index.html" => ["start-form"],
  "coaches/index.html" => ["apply-form"]
}.freeze

documents = {}
parse = lambda do |path|
  documents[path.to_s] ||= Nokogiri::HTML5(path.read)
end

resolve = lambda do |href, source|
  uri = URI.parse(href)
  raw_path = URI::DEFAULT_PARSER.unescape(uri.path.to_s)
  target = if raw_path.empty?
             source
           elsif raw_path.start_with?("/")
             ROOT.join(raw_path.delete_prefix("/"))
           else
             source.dirname.join(raw_path).cleanpath
           end
  target = target.join("index.html") if raw_path.end_with?("/") || target.directory?
  [target, URI::DEFAULT_PARSER.unescape(uri.fragment.to_s)]
rescue URI::InvalidURIError
  [nil, ""]
end

issues = []
pages = 0
redirects = 0

ROOT.glob("**/*.html").sort.each do |file|
  document = parse.call(file)
  if document.at_css('meta[http-equiv="refresh"]')
    redirects += 1
    next
  end

  pages += 1
  relative = file.relative_path_from(ROOT).to_s

  issues << "#{relative}: unresolved Liquid" if file.read.match?(/\{%|\{\{/)

  ids = document.css("[id]").map { |node| node["id"] }
  duplicate_ids = ids.group_by(&:itself).select { |_id, values| values.length > 1 }.keys
  issues << "#{relative}: duplicate IDs: #{duplicate_ids.join(', ')}" unless duplicate_ids.empty?

  primary_nav = document.css('nav.nav[aria-label="Primary"]')
  menu_labels = document.css(".nav-links > li.has-menu > .menu-btn").map do |button|
    button.children.reject { |child| child.element? }.map(&:text).join.strip
  end
  issues << "#{relative}: primary nav count #{primary_nav.length}" unless primary_nav.length == 1
  issues << "#{relative}: audience menus #{menu_labels.inspect}" unless menu_labels == AUDIENCES
  issues << "#{relative}: drawer count #{document.css('#drawer.drawer').length}" unless document.css("#drawer.drawer").length == 1
  issues << "#{relative}: footer count #{document.css('footer').length}" unless document.css("footer").length == 1

  form_ids = document.css("form").map { |form| form["id"] }.compact
  expected_forms = ALLOWED_FORMS.fetch(relative, [])
  issues << "#{relative}: forms #{form_ids.inspect}, expected #{expected_forms.inspect}" unless form_ids == expected_forms

  nav_cta = document.at_css(".nav-right > .btn")
  drawer_cta = document.at_css(".drawer-cta > .btn")
  if !nav_cta || !drawer_cta || nav_cta.text.strip != drawer_cta.text.strip || nav_cta["href"] != drawer_cta["href"]
    issues << "#{relative}: desktop/drawer CTA mismatch"
  end

  sticky_cta = document.at_css(".sticky-bar > .btn")
  if relative == "start/index.html"
    issues << "#{relative}: reservation flow must not have a sticky CTA" if sticky_cta
  elsif !sticky_cta || sticky_cta.text.strip != nav_cta&.text&.strip || sticky_cta["href"] != nav_cta&.[]("href")
    issues << "#{relative}: sticky CTA mismatch"
  end

  document.css("a[href]").each do |anchor|
    href = anchor["href"]
    next if href.start_with?("mailto:", "tel:", "javascript:", "//")

    begin
      next unless URI.parse(href).scheme.nil?
    rescue URI::InvalidURIError
      issues << "#{relative}: invalid href #{href}"
      next
    end

    target, fragment = resolve.call(href, file)
    if !target || !target.file?
      issues << "#{relative}: broken href #{href}"
    elsif !fragment.empty? && target.extname == ".html" &&
          !parse.call(target).css("[id]").any? { |node| node["id"] == fragment }
      issues << "#{relative}: missing fragment #{href}"
    end
  end

  document.css("img[src],script[src],source[srcset],link[href]").each do |node|
    value = node["src"] || node["srcset"]&.split&.first || node["href"]
    next if value.nil? || value.empty? || value.start_with?("data:", "http:", "https:", "//")

    target, = resolve.call(value, file)
    issues << "#{relative}: broken asset #{value}" unless target&.file?
  end
end

issues << "expected #{EXPECTED_PAGES} rendered pages, found #{pages}" unless pages == EXPECTED_PAGES

if issues.empty?
  puts "OK — #{pages} pages + #{redirects} redirects: routes, fragments, assets, IDs, audience menus, forms, shared shell, and CTA parity."
  exit 0
end

warn "FAIL — #{issues.length} rendered-site problem(s):"
issues.each { |issue| warn "  - #{issue}" }
exit 1
