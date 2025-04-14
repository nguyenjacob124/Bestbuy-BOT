const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

// Google Sheet with proxies
const PROXY_SHEET = 'https://docs.google.com/spreadsheets/d/1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8/gviz/tq?tqx=out:json';

async function getRandomProxy() {
  try {
    const res = await axios.get(PROXY_SHEET);
    const json = JSON.parse(res.data.match(/{.*}/s)[0]);
    const proxies = json.table.rows.map(r => r.c?.[0]?.v).filter(Boolean);
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    return proxy || null;
  } catch (err) {
    console.error('Proxy fetch error:', err.message);
    return null;
  }
}

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing ?url=' });

  const proxy = await getRandomProxy();

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(proxy ? [`--proxy-server=${proxy}`] : []),
      ],
    });

    const page = await browser.newPage();

    // Block images, styles, fonts to speed up
    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait manually for title & price to appear
    await page.waitForSelector('h1.sku-title', { timeout: 15000 });
    await page.waitForSelector('[data-testid="price-summary"] .priceView-customer-price span', { timeout: 15000 });

    const title = await page.$eval('h1.sku-title', el => el.textContent.trim());
    const price = await page.$eval('[data-testid="price-summary"] .priceView-customer-price span', el => el.textContent.trim());

    res.json({ title, price });
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/', (req, res) => {
  res.send('✅ Scraper is running. Use /scrape?url=...');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
