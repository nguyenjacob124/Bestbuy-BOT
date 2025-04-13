
# BestBuy Scraper (Render.com Ready)

This is a Puppeteer-based scraper for BestBuy product details, deployed on Render.com.

## Features
- Express.js API server
- Dynamic Keep Alive (auto self-ping every 4 mins)
- Input: Product URL
- Output: JSON (Product Name, Regular Price, Sale Price, Availability, Image)

## Usage

### Install dependencies
npm install

### Run locally
node index.js

Access:
http://localhost:10000/scrape?url=https://www.bestbuy.com/site/your-product-url

### Deploy to Render.com
1. Connect this repo to Render.com
2. Set build command:
npm install
3. Set start command:
node index.js
4. Deploy!

Public URL (example):
https://bestbuy-bot-6my5.onrender.com/scrape?url=YOUR_PRODUCT_URL

## Health Check
Render self-ping URL:
https://bestbuy-bot-6my5.onrender.com/health
