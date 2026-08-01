# PixelSwitch multi-page converter website

PixelSwitch is a static, browser-based file conversion website organized into four directly linked categories:

- Image Tools
- PDF & Office
- Archives & Data
- Advanced Tools

## Included pages

- `index.html` — home page with live conversion and download counters
- `activity.html` — full counter details by category, tool, input type and output type
- `all-tools.html` — complete tool directory
- `image-tools.html`
- `pdf-office-tools.html`
- `archive-data-tools.html`
- `advanced-tools.html`
- `converter.html?tool=convert` — converter workspace
- `about.html`
- `contact.html`

Each category name in the desktop header links to its category page and reveals that category’s tools on mouse hover or keyboard focus. On mobile, the arrow beside a category toggles its tool list. **All Tools** is a direct link to the complete flat tool directory; it has no collapsible menu or category groups. The footer includes social sharing icons, category links, popular tools, live activity, privacy, contact and the sitemap.

## Run locally

```bash
cd pixelswitch-website
python -m http.server 8000
```

Open `http://localhost:8000`. Use HTTP rather than opening pages with `file://`, because browser modules and some third-party libraries require an HTTP origin.

## Live conversion and download counters

The website records a conversion only after output files are created successfully. A download is recorded when an individual result or the **Download all** button is used.

By default, counters use browser `localStorage`, so they are private to that browser and update instantly across tabs. No filenames or file contents are stored.

For shared site-wide totals, deploy the included API and set both API values in `site-config.js`:

```js
window.PIXELSWITCH_CONFIG = {
  commentsApiUrl: 'https://your-api.example/api',
  contactApiUrl: '',
  activityApiUrl: 'https://your-api.example/api'
};
```

The shared API stores only the tool ID, conversion/download counts, aggregate byte totals and update time.

## Configure production SEO URLs

The HTML uses deployment-neutral root-relative canonical and structured-data URLs. The XML sitemap must contain your real absolute domain before launch.

Run:

```bash
python -m pip install -r requirements-seo.txt
python configure-site.py https://www.your-real-domain.com
```

This updates canonical URLs, Open Graph URLs, structured data, `sitemap.xml` and the sitemap entry in `robots.txt`.

SEO features included:

- Unique titles and meta descriptions
- Index/follow robots metadata
- Canonical links
- Open Graph and Twitter metadata
- WebSite, WebApplication, Organization, Breadcrumb and FAQ structured data
- Semantic headings, breadcrumb navigation and descriptive internal links
- Crawlable category pages and tool links
- XML sitemap and robots file
- Visible supported-format content and FAQ content
- Responsive category hover menus, keyboard focus support and mobile category toggles
- Direct, non-collapsible All Tools directory

Search ranking cannot be guaranteed by code alone. After deployment, submit the sitemap in Google Search Console and Bing Webmaster Tools, verify indexing, improve page speed, publish genuinely useful content, and earn relevant links.

## Shared comments and activity API

```bash
cd comments-api
cp .env.example .env
npm install
npm start
```

The API provides comments, replies, helpful votes and aggregate activity counters using Express and SQLite. Before a large public launch, add authentication for administration, moderation, spam protection, monitoring, backups, abuse reporting, terms and a complete privacy policy.

## Contact form

When `contactApiUrl` is empty, the contact form downloads the visitor's message as a text file. Connect a secure form endpoint to receive messages.

## Conversion limitations

Some advanced modules load from CDNs. PPTX conversion is text-first. PDF compression rasterizes pages. Office formatting, OCR, fonts and 3D output can differ from the source. Unsupported DRM, encrypted archives and proprietary formats are not bypassed.
