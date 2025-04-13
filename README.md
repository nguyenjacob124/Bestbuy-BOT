
# BestBuy BOT with Proxy Rotation (Render.com + Google Sheets)

## Features
- Reads proxies from Google Sheet (dynamic!)
- Random proxy selection per scrape
- Fully compatible with Render.com (Chromium headless browser)
- Health check endpoint: /health
- Scrape BestBuy products: /scrape?url=...

## Deployment
1. Upload to your GitHub repo: nguyenjacob124/Bestbuy-BOT
2. In Render.com:
   - Build Command: npm install
   - Start Command: npm start

## Test Endpoints
- Health: https://your-render-url.onrender.com/health
- Scrape: https://your-render-url.onrender.com/scrape?url=https://www.bestbuy.com/site/your-product

Replace "your-render-url" with your actual Render app URL.

## Enjoy 🚀
