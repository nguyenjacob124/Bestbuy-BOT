const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/scrape', async (req, res) => {
  const productUrl = req.query.url;
  const proxy = req.query.proxy;

  if (!productUrl) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        proxy ? `--proxy-server=${proxy}` : ''
      ],
      headless: true
    });

    const page = await browser.newPage();

    if (proxy && proxy.includes('@')) {
      const proxyAuth = proxy.split('@')[0].replace('http://', '');
      const [username, password] = proxyAuth.split(':');
      await page.authenticate({ username, password });
    }

    await page.waitForTimeout(1000 + Math.random() * 2000);

    console.log(`Navigating to: ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector('h1.sku-title')?.innerText.trim() || null;
      const price = document.querySelector('.priceView-hero-price span')?.innerText.trim() || null;
      const availability = document.querySelector('.fulfillment-fulfillment-summary')?.innerText.trim() || 'No info';
      const image = document.querySelector('.primary-image')?.src || null;
      return { title, price, availability, image };
    });

    result.url = productUrl;

    console.log('Scraping done:', result);

    res.json(result);

  } catch (error) {
    console.error('Error scraping:', error);
    res.status(500).json({ error: error.toString() });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
