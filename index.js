
const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', async (req, res) => {
    const productUrl = req.query.url;
    if (!productUrl) {
        return res.status(400).json({ error: 'Missing URL parameter ?url=' });
    }

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto(productUrl, { waitUntil: 'networkidle2' });

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
        res.status(500).json({ error: 'Failed to scrape the product page.' });
    }
});

app.listen(port, () => {
    console.log(`Scraper running at http://localhost:${port}`);
});
