
const puppeteer = require('puppeteer');
const express = require('express');
const fetch = require('node-fetch');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 10000;

// Your Google Sheet ID and range
const SHEET_ID = '1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8';
const SHEET_RANGE = 'Sheet1!A:A'; // Proxies in column A

// Google API key (public sheet doesn't need auth)
const API_KEY = 'AIzaSyDq9RtV9T3uJ8AZlX4nHCqB6f0GO6zkRgk'; // Dummy key (you need to set)

async function getProxiesFromSheet() {
    try {
        const sheets = google.sheets({ version: 'v4' });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
            key: API_KEY,
        });
        const rows = res.data.values;
        if (rows.length) {
            return rows.map(row => row[0]);
        } else {
            console.log('No proxy data found.');
            return [];
        }
    } catch (error) {
        console.error('Error fetching proxies:', error);
        return [];
    }
}

// Keep-alive ping every 4 minutes
setInterval(() => {
    fetch('https://bestbuy-bot-6my5.onrender.com/health').catch(() => {});
}, 240000);

app.get('/health', (req, res) => {
    res.send('✅ Render app is alive!');
});

app.get('/scrape', async (req, res) => {
    const productUrl = req.query.url;
    if (!productUrl) {
        return res.status(400).json({ error: 'Missing URL parameter ?url=' });
    }

    const proxies = await getProxiesFromSheet();
    if (!proxies.length) {
        return res.status(500).json({ error: 'No proxies available from Google Sheet.' });
    }

    // Pick a random proxy
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [proxyIP, proxyPort, proxyUser, proxyPass] = randomProxy.split(':');

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                `--proxy-server=http://${proxyIP}:${proxyPort}`
            ],
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

            return {
                productName,
                productURL: window.location.href,
                regularPrice,
                salePrice: price,
                availability,
                imageURL: imageUrl
            };
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
