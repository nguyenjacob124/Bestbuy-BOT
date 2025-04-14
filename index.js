const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL in request body' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    const title = await page.title();
    await browser.close();

    res.json({ title });
  } catch (error) {
    console.error('Error scraping:', error);
    res.status(500).json({ error: 'Failed to scrape the page', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Puppeteer Scraper is running.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});