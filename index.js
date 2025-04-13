
const puppeteer = require('puppeteer-core');
const express = require('express');
const fetch = require('node-fetch');
const { google } = require('googleapis');
const chromium = require('chrome-aws-lambda');
const app = express();
const port = process.env.PORT || 10000;

// Google Sheets
const SHEET_ID = '1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8';
const SHEET_RANGE = 'Sheet1!A:A';
const API_KEY = 'AIzaSyDUJ2L0AdhMANBa7l1mZOfTh40NI0f1-NQ';

async function getProxiesFromSheet() {
    try {
        const sheets = google.sheets({ version: 'v4' });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
            key: API_KEY,
        });
        const rows = res.data.values;
        return rows.length ? rows.map(row => row[0]) : [];
    } catch (error) {
        console.error('Google Sheets fetch error:', error);
        return [];
    }
}

// Keep-alive
setInterval(() => {
    fetch('https://bestbuy-bot-6my5.onrender.com/health').catch(() => {});
}, 240000);

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'success', message: 'Render app is alive!' });
});

// Scrape endpoint
app.get('/scrape', async (req, res) => {
    const productUrl = req.query.url;
    if (!productUrl) return res.status(400).json({ error: 'Missing ?url parameter.' });

    const proxies = await getProxiesFromSheet();
    if (!proxies.length) return res.status(500).json({ error: 'No proxies available from Google Sheet.' });

    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [proxyIP, proxyPort, proxyUser, proxyPass] = randomProxy.split(':');

    try {
        const browser = await puppeteer.launch({
            args: [`--proxy-server=http://${proxyIP}:${proxyPort}`, '--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        if (proxyUser && proxyPass) {
            await page.authenticate({ username: proxyUser, password: proxyPass });
        }

        await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const result = await page.evaluate(() => {
            const productName = document.querySelector('h1.sku-title')?.innerText || null;
            const priceElement = document.querySelector('.priceView-customer-price span');
            const regularPriceElement = document.querySelector('.pricing-price__regular-price span');
            const imageElement = document.querySelector('.primary-image') || document.querySelector('.product-image img');
            const price = priceElement ? parseFloat(priceElement.innerText.replace(/[^\d.]/g, '')) : null;
            const regularPrice = regularPriceElement ? parseFloat(regularPriceElement.innerText.replace(/[^\d.]/g, '')) : price;
            const imageUrl = imageElement ? imageElement.src : null;
            const availability = document.querySelector('.fulfillment-add-to-cart-button')?.innerText.includes('Add to Cart') ? 'In Stock' : 'Out of Stock';

            return { productName, productURL: window.location.href, regularPrice, salePrice: price, availability, imageURL: imageUrl };
        });

        await browser.close();
        res.json(result);

    } catch (error) {
        console.error('Scraper error:', error);
        res.status(500).json({ error: 'Failed to scrape the product page.', detail: error.toString() });
    }
});

app.listen(port, () => {
    console.log(`✅ Scraper running at http://localhost:${port}`);
});
