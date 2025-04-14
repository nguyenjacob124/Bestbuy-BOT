const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send({ error: 'Missing URL' });

  let browser;

  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ],
      headless: 'new'
    });

    const page = await browser.newPage();

    // Block images, stylesheets, fonts
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const title = await page.$eval('h1.sku-title', el => el.innerText.trim());
    const price = await page.$eval('[data-testid="price-summary"] .priceView-customer-price span', el => el.innerText.trim());

    res.json({ title, price });

  } catch (error) {
    console.error('Scrape Error:', error.message);
    res.status(500).send({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get('/health', (_, res) => {
  res.send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
