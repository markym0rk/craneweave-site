#!/usr/bin/env ruby
# frozen_string_literal: true

require "nokogiri"
require "pathname"

SITE_ROOT = Pathname.new(__dir__).parent

PAGES = [
  ["Homepage", "/", "index.html"],
  ["Sketch homepage preview", "/sketch/", "sketch/index.html"],
  ["College admissions", "/college/", "college/index.html"],
  ["BS/MD programs", "/bsmd/", "bsmd/index.html"],
  ["MBA admissions", "/mba/", "mba/index.html"],
  ["Law school", "/law/", "law/index.html"],
  ["Medical school", "/med/", "med/index.html"],
  ["Banking & consulting recruiting", "/recruiting/", "recruiting/index.html"],
  ["AI coaching for teams", "/organizations/", "organizations/index.html"],
  ["Cohort programs", "/programs/", "programs/index.html"],
  ["Coach on Craneweave", "/coaches/", "coaches/index.html"],
  ["Pricing", "/pricing/", "pricing/index.html"],
  ["About", "/about/", "about/index.html"],
  ["Get started", "/start/", "start/index.html"],
  ["Privacy policy", "/privacy/", "privacy/index.html"],
  ["Terms of service", "/terms/", "terms/index.html"]
].freeze

COPY_NODES = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,legend,label,button,a,option," \
             "output,figcaption,blockquote,caption,th,td,span,strong,b,small,input,textarea"
COPY_TAGS = COPY_NODES.split(",").freeze

def clean_text(node)
  return "" unless node

  copy = node.dup
  copy.css("svg,[aria-hidden='true']").remove
  copy.css("br").each { |br| br.replace("\n") }
  copy.css("div,p,h1,h2,h3,h4,h5,h6").each do |block|
    block.add_previous_sibling(Nokogiri::XML::Text.new(" ", copy.document))
  end
  if copy.name == "li"
    copy.css("span,small").each { |inline| inline.add_previous_sibling(Nokogiri::XML::Text.new(" ", copy.document)) }
  elsif copy.name == "figcaption"
    copy.element_children.select { |child| child.name == "span" }.each do |inline|
      inline.add_previous_sibling(Nokogiri::XML::Text.new(" ", copy.document))
    end
  elsif copy.name == "p" && copy["class"].to_s.split.include?("c-label")
    copy.css("small").each { |inline| inline.add_previous_sibling(Nokogiri::XML::Text.new(" ", copy.document)) }
  end
  copy.text.gsub(/\u00a0/, " ").gsub(/[[:space:]]+/, " ").strip
end

def covered_by_copy_parent?(node)
  node.ancestors.any? do |ancestor|
    next false unless COPY_TAGS.include?(ancestor.name)
    next false if ancestor.name == "a" && has_block_copy_children?(ancestor)

    true
  end
end

def has_block_copy_children?(node)
  !node.css("h1,h2,h3,h4,h5,h6,p,li,dt,dd,legend,label,button,figcaption,blockquote,caption,th,td").empty?
end

def conditional?(node)
  node.ancestors.any? { |ancestor| ancestor.key?("hidden") || ancestor.name == "noscript" } ||
    node.key?("hidden") || node.name == "noscript"
end

def render_main(main)
  lines = []
  main.css(COPY_NODES).each do |node|
    next if node.ancestors.any? { |ancestor| %w[script style svg].include?(ancestor.name) }
    next if node["aria-hidden"] == "true"
    next if covered_by_copy_parent?(node)
    next if node.name == "a" && has_block_copy_children?(node)

    text = if %w[input textarea].include?(node.name)
             node["placeholder"].to_s.strip
           else
             clean_text(node)
           end
    next if text.empty?

    marker = conditional?(node) ? "[Conditional / initially hidden] " : ""
    line = case node.name
           when /\Ah([1-6])\z/
             level = [Regexp.last_match(1).to_i + 2, 6].min
             "#{'#' * level} #{text}"
           when "li"
             "- #{text}"
           when "label"
             kind = node.at_css("input[type='radio'],input[type='checkbox']") ? "Option" : "Field"
             "- **#{kind}:** #{text}"
           when "legend"
             "**Field group:** #{text}"
           when "button"
             "**Button:** #{text}"
           when "a"
             "**Link / CTA:** #{text}"
           when "input", "textarea"
             "**Placeholder:** #{text}"
           when "dt"
             "**Summary label:** #{text}"
           when "dd"
             "**Summary value:** #{text}"
           when "output"
             "**Live value:** #{text}"
           when "blockquote"
             "> #{text}"
           else
             text
           end
    lines << marker + line
  end

  lines.join("\n\n")
end

def unique_values(document, selector, attribute)
  document.css(selector).map do |node|
    value = node[attribute].to_s.gsub(/[[:space:]]+/, " ").strip
    value unless value.empty?
  end.compact.uniq
end

def metadata(document)
  title = clean_text(document.at_css("title"))
  description = document.at_css("meta[name='description']")&.[]("content").to_s.strip
  og_title = document.at_css("meta[property='og:title']")&.[]("content").to_s.strip
  og_description = document.at_css("meta[property='og:description']")&.[]("content").to_s.strip

  lines = ["- **Browser title:** #{title}", "- **Meta description:** #{description}"]
  lines << "- **Social title:** #{og_title}" unless og_title == title
  lines << "- **Social description:** #{og_description}" unless og_description == description
  lines << "- **Open Graph fields:** Mirror the browser title and meta description." if og_title == title && og_description == description
  robots = document.at_css("meta[name='robots']")&.[]("content").to_s.strip
  lines << "- **Robots directive:** #{robots}" unless robots.empty?
  lines.join("\n")
end

def navigation_ctas
  rows = PAGES.map do |_name, route, relative_path|
    document = Nokogiri::HTML(SITE_ROOT.join(relative_path).read)
    nav = clean_text(document.at_css(".nav-right .btn"))
    drawer = clean_text(document.at_css(".drawer-cta .btn"))
    sticky = document.at_css(".sticky-bar a") ? clean_text(document.at_css(".sticky-bar a")) : "—"
    [route, nav, drawer, sticky]
  end

  rows.map { |row| "| #{row.join(' | ')} |" }.join("\n")
end

def form_success_copy
  rows = []
  PAGES.each do |_name, route, relative_path|
    document = Nokogiri::HTML(SITE_ROOT.join(relative_path).read)
    document.css("form[data-done]").each do |form|
      rows << [route, form["id"].to_s, form["data-done"].to_s,
               form["data-done-sub"].to_s.empty? ? "Check your inbox for a reply from team@craneweave.com." : form["data-done-sub"]]
    end
  end
  rows.map { |row| "| #{row.join(' | ')} |" }.join("\n")
end

puts <<~MARKDOWN
  # Craneweave website copy — live-site master

  This document inventories the editable copy currently implemented in `craneweave-site/`.
  It is organized for line editing: keep replacement wording beneath the same route and label.

  Scope: all 16 HTML pages, repeated navigation and footer copy, page titles and descriptions,
  form labels/placeholders, conditional success/error/fallback states, non-empty image alt text,
  and meaningful ARIA labels. Decorative marks and empty alt text are intentionally omitted.

  Source snapshot: August 22, 2026. The HTML and `assets/cw.js` remain the production source of truth;
  edits to this Markdown file do not automatically update the website.

  ## Sitemap

  #{PAGES.map { |name, route, _path| "- `#{route}` — #{name}" }.join("\n")}

  ---

  ## Shared site copy

  ### Skip link

  Skip to content

  ### Desktop navigation

  **Students & families**

  - College admissions — Match with a coach who got in to your dream school.
  - BS/MD programs — Two applications, one coach who survived both.
  - MBA admissions — Your story, pressure-tested by someone who got in.
  - Law school — Personal statements on rolling-admissions time.
  - Medical school — Plan ahead of nine months of deadlines.
  - Banking & consulting — Your answers, judged by someone who got the offer.
  - Not sure which? See every track · Pricing

  **Organizations**

  - AI coaching for teams — Every employee paired with a named coach.
  - Cohort programs — Access organizations, districts, and scholarship programs.

  **Primary links**

  - Coaches
  - Pricing
  - Help

  ### Mobile navigation drawer

  **Students & families**

  - College admissions
  - BS/MD programs
  - MBA admissions
  - Law school
  - Medical school
  - Banking & consulting

  **Organizations**

  - AI coaching for teams
  - Cohort programs

  **Craneweave**

  - Coach on Craneweave
  - Pricing
  - About
  - Help — team@craneweave.com

  ### Navigation and sticky CTA variants

  | Route | Desktop CTA | Drawer CTA | Mobile sticky CTA |
  |---|---|---|---|
  #{navigation_ctas}

  ### Footer

  **Brand**

  Expert coaching made effortless. Admissions, recruiting, and AI coaching for teams.

  team@craneweave.com

  **Students & families**

  - College admissions
  - BS/MD programs
  - MBA admissions
  - Law school
  - Medical school
  - Banking & consulting

  **Organizations**

  - AI coaching for teams
  - Cohort programs

  **Craneweave**

  - Get started
  - Pricing
  - Coach on Craneweave
  - About

  **Help**

  - Questions
  - Email the team
  - Privacy
  - Terms

  © 2026 Craneweave. No guarantees, ever — walk away from anyone who offers one.

  - Privacy
  - Terms
  - team@craneweave.com

  ### Shared accessibility labels

  - Primary
  - Craneweave home
  - Open menu
  - Menu
  - Close menu

  ---
MARKDOWN

PAGES.each do |name, route, relative_path|
  document = Nokogiri::HTML(SITE_ROOT.join(relative_path).read)
  main = document.at_css("main")
  puts
  puts "# PAGE: #{name} `#{route}`"
  puts
  puts "**Source:** `craneweave-site/#{relative_path}`"
  puts
  puts "## Metadata"
  puts
  puts metadata(document)
  puts
  puts "## Visible page copy"
  puts
  puts render_main(main)

  alt_text = unique_values(main, "img[alt]", "alt")
  unless alt_text.empty?
    puts
    puts "## Image alt text"
    puts
    puts alt_text.map { |value| "- #{value}" }.join("\n")
  end

  aria_labels = unique_values(main, "[aria-label]", "aria-label")
  unless aria_labels.empty?
    puts
    puts "## Page-specific accessibility labels"
    puts
    puts aria_labels.map { |value| "- #{value}" }.join("\n")
  end

  puts
  puts "---"
end

puts <<~MARKDOWN

  # Conditional and interaction copy from `assets/cw.js`

  These strings appear after user selections, validation, submission, or a failed network handoff.
  Braced values such as `{email}` and editorial tokens such as `[count]` are runtime substitutions.

  ## Shared goal and stage labels

  - College admissions
  - BS/MD programs
  - MBA admissions
  - Law school
  - Medical school
  - Banking & consulting
  - My team's AI skills
  - Applying this cycle
  - Next cycle
  - Still exploring

  ## Plan labels, prices, and plan-detail strings

  - **Core:** $299/month — 4 reviews a month · 72-hour turnaround · cancel monthly
  - **Plus:** $499/month — 8 reviews a month · 48-hour turnaround · priority matching
  - **Season Pass:** $1,999/season — Aug 1–Jan 15 · 24 reviews any time · priority access in the November crunch
  - **One review:** From $49 — A single essay, school list, full application, or check-in review · no subscription

  ## Homepage plan-estimate variants

  - Start here — or take the whole senior season on the Season Pass, $1,999.
  - Start here. Plus is $499 for 8 reviews at 48 hours.
  - Start here. A season plan built around next cycle’s deadlines.
  - Start here. Or try one à la carte review from $49 first.
  - **Pilot proposal:** In writing — Answer three questions about your team. We send back a pilot plan within 24 hours.
  - **Founding cohort:** From $299/month — Opens [October 2026 / January 2027]. Joining the list is free and holds your place.

  ## Pricing-estimator variants

  - Nothing to review yet? Try one à la carte review when you have a draft.
  - [count] review fits in one month of Core.
  - [count] reviews fit in one month of Core.
  - [count] reviews in a month needs Plus.
  - More than 24 reviews — email us and we’ll quote it in writing.
  - [count] reviews is more than Plus covers in a month — the Season Pass pools 24 across Aug 1–Jan 15.
  - **Button:** Try one review
  - **Button:** Get started

  ## Get-started flow — coach-match mode

  - **Button:** Find your coach
  - **Step 3 heading:** Where should we send your match?
  - **Hint:** We reply in writing with your coach match — or, if we can’t match your list, we tell you before you pay anything. Nothing is charged until you choose a plan.
  - **Success heading:** Received. Your match is on its way.
  - **Success body:** Check {email} for a reply from team@craneweave.com. We answer in writing — and if we can’t match your list, we tell you before you pay anything.
  - **Notes placeholder:** Target schools, deadlines, what you’ve tried.

  ## Get-started flow — founding-cohort mode

  - **Button:** Hold my place
  - **Step 3 heading:** Where should we reach you when the cohort opens?
  - **Hint:** Joining the list is free and holds your place. Published pricing from $299/month — nothing is charged until you choose a plan.
  - **Success heading:** Received. Your place is held.
  - **Success body:** We’ll email {email} the moment your coach match is ready. Nothing is charged until you choose a plan.
  - **Notes placeholder:** Target programs, rounds, whether you’re reapplying.

  ## Get-started flow — organization mode

  - **Button:** Get a pilot proposal in writing
  - **Step 3 heading:** Where should we send the pilot plan?
  - **Hint:** A written pilot plan within 24 hours. No sales call unless you want one.
  - **Success heading:** Received. Your pilot proposal is on its way.
  - **Success body:** A written pilot plan will reach {email} within 24 hours, from team@craneweave.com. No sales call unless you want one.
  - **Notes placeholder:** Tools you have seats for, who’s in the pilot, what a good result looks like.

  ## Get-started summary variants

  - Step [1 / 2 / 3] of 3
  - Company
  - Where you are
  - Team size
  - Filled out by
  - [team size] people
  - Chosen on the pricing page. Pick a goal to continue.
  - Choose a goal to see the plan we’d suggest.

  ## Validation messages

  - Choose what you’re working toward.
  - Pick the one that’s closest.
  - Pick the piece you want reviewed first.
  - Enter an email address we can reply to.
  - Pick one.
  - Required.

  ## Form success messages declared in page markup

  | Route | Form | Main message | Supporting message |
  |---|---|---|---|
  #{form_success_copy}

  ## Failed-send fallback

  **We couldn’t send this from the page.** Your email app should open with the request pre-filled — press Send there. If nothing opened, copy this and email it to team@craneweave.com:

  - **Textarea label:** Your request
  - **Generated request labels:** To: · Subject:
  - **Button:** Open my email app
  - **Button:** Copy the request
  - **Temporary copied state:** Copied

  ## Generic form-success fallback

  - Received. We answer in writing.
  - Check your inbox for a reply from team@craneweave.com.
MARKDOWN
