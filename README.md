
# Cloud Proxy Scraper (Render.com + Google Sheet Proxies)

## Features
- Cloud-ready Render.com setup
- Dynamic Google Sheet proxy rotation
- Failover: next proxy auto if fail
- Health check /keep alive for Render.com
- Output: Product name, prices, availability, image

## Usage

### Deploy
1. Upload to your GitHub
2. Connect to Render.com
3. Set build command: npm install
4. Set start command: node index.js

### Test
https://your-render-url.com/health
https://your-render-url.com/scrape?url=YOUR_PRODUCT_URL
