const puppeteer = require('puppeteer');
const express = require('express');
const fetch = require('node-fetch');
const { google } = require('googleapis');
const app = express();
const port = process.env.PORT || 10000;

// Your Google Sheet ID and range
const SHEET_ID = '1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8';
const SHEET_RANGE = 'Sheet1!A:A'; // Proxies in column A

// Google API key (for public sheets)
const API_KEY = 'AIzaSyDq9RtV9T3uJ8AZlX4nHCqB6f0GO6zkRgk'; // This is a dummy key - replace it with your own

// Cache proxies to avoid excessive API calls
let cachedProxies = [];
let lastProxyFetch = 0;
const PROXY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function getProxiesFromSheet() {
    // Return cached proxies if they're still fresh
    const now = Date.now();
    if (cachedProxies.length > 0 && (now - lastProxyFetch) < PROXY_CACHE_TTL) {
        console.log('Using cached proxies');
        return cachedProxies;
    }

    try {
        const sheets = google.sheets({ version: 'v4' });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: SHEET_RANGE,
            key: API_KEY,
        });
        
        const rows = res.data.values;
        if (rows && rows.length) {
            // Filter out empty values and trim whitespace
            const proxies = rows
                .filter(row => row[0] && row[0].trim().length > 0)
                .map(row => row[0].trim());
                
            console.log(`Fetched ${proxies.length} proxies from Google Sheet`);
            
            // Update cache
            cachedProxies = proxies;
            lastProxyFetch = now;
            
            return proxies;
        } else {
            console.log('No proxy data found in Google Sheet.');
            return [];
        }
    } catch (error) {
        console.error('Error fetching proxies:', error);
        return [];
    }
}

// Fallback proxy if Google Sheet fails
const FALLBACK_PROXIES = [
    '103.105.49.53:80' // Just an example - add more reliable fallbacks if needed
];

// Keep-alive ping every 4 minutes to prevent app from sleeping
const APP_URL = 'https://bestbuy-bot-6my5.onrender.com';
setInterval(() => {
    fetch(`${APP_URL}/health`)
        .then(res => res.text())
        .then(body => console.log(`Health check: ${body}`))
        .catch(err => console.error('Health check failed:', err));
}, 240000);

app.get('/health', (req, res) => {
    res.send('✅ Render app is alive!');
});

// Add some basic error logging middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
});

app.get('/scrape', async (req, res) => {
    const productUrl = req.query.url;
    if (!productUrl) {
        return res.status(400).json({ error: 'Missing URL parameter ?url=' });
    }

    if (!productUrl.includes('bestbuy.com')) {
        return res.status(400).json({ error: 'URL must be from bestbuy.com' });
    }

    let browser = null;
    let proxies = [];
    let currentProxy = '';

    try {
        // Get proxies from Google Sheet (with fallback)
        proxies = await getProxiesFromSheet();
        if (!proxies.length) {
            console.log('No proxies from Google Sheet, using fallbacks');
            proxies = FALLBACK_PROXIES;
        }

        // Try proxies one by one until successful
        for (let i = 0; i < proxies.length; i++) {
            currentProxy = proxies[i];
            console.log(`Trying proxy ${i+1}/${proxies.length}: ${currentProxy}`);
            
            let proxyArgs = [];
            let authOptions = {};
            
            // Parse proxy details (different formats supported)
            const proxyParts = currentProxy.split(':');
            
            if (proxyParts.length >= 2) {
                const [proxyIP, proxyPort] = proxyParts;
                proxyArgs = [`--proxy-server=http://${proxyIP}:${proxyPort}`];
                
                // If proxy has username/password (IP:PORT:USER:PASS format)
                if (proxyParts.length >= 4) {
                    const [, , proxyUser, proxyPass] = proxyParts;
                    authOptions = { username: proxyUser, password: proxyPass };
                }
            }
            
            try {
                browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu',
                        '--window-size=1920x1080',
                        ...proxyArgs
                    ],
                });
                
                const page = await browser.newPage();
                
                // Set a realistic user agent
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
                
                // Set authentication if needed
                if (authOptions.username && authOptions.password) {
                    await page.authenticate(authOptions);
                }
                
                // Set request timeout
                page.setDefaultNavigationTimeout(60000);
                
                // Navigate to the product URL
                await page.goto(productUrl, { waitUntil: 'networkidle2' });
                
                // Check if we're on a BestBuy product page
                const url = page.url();
                if (url.includes('bestbuy.com/identity') || url.includes('captcha')) {
                    console.log('Detected captcha or login page, skipping proxy');
                    await browser.close();
                    browser = null;
                    continue; // Try next proxy
                }
                
                // Extract product info
                const result = await page.evaluate(() => {
                    const productName = document.querySelector('h1.sku-title')?.innerText || 
                                       document.querySelector('.sku-title')?.innerText || null;
                    
                    const priceElement = document.querySelector('.priceView-customer-price span') || 
                                        document.querySelector('.price-box')?.querySelector('span');
                    
                    const regularPriceElement = document.querySelector('.pricing-price__regular-price span') || 
                                              document.querySelector('.regular-price');
                    
                    const imageElement = document.querySelector('.primary-image') || 
                                        document.querySelector('.product-image img') || 
                                        document.querySelector('img.product-main-image');
                    
                    // Get prices, handling different formats
                    const priceText = priceElement?.innerText || '';
                    const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : null;
                    
                    const regularPriceText = regularPriceElement?.innerText || '';
                    const regularPrice = regularPriceText ? 
                                        parseFloat(regularPriceText.replace(/[^\d.]/g, '')) : 
                                        price;
                    
                    const imageUrl = imageElement?.src || null;
                    
                    // Check availability
                    const addToCartBtn = document.querySelector('.fulfillment-add-to-cart-button') || 
                                        document.querySelector('.add-to-cart-button');
                    const availability = addToCartBtn?.innerText.includes('Add to Cart') ? 
                                         'In Stock' : 'Out of Stock';

                    return {
                        productName,
                        productURL: window.location.href,
                        regularPrice,
                        salePrice: price,
                        availability,
                        imageURL: imageUrl
                    };
                });
                
                // Check if we got a valid product
                if (!result.productName) {
                    console.log('No product name found, trying next proxy');
                    await browser.close();
                    browser = null;
                    continue; // Try next proxy
                }
                
                // Success! Close browser and return result
                await browser.close();
                return res.json({
                    ...result,
                    proxyUsed: currentProxy.split(':').slice(0, 2).join(':') // Only show IP:PORT in response
                });
                
            } catch (proxyError) {
                console.error(`Error with proxy ${currentProxy}:`, proxyError);
                if (browser) {
                    await browser.close();
                    browser = null;
                }
                // Continue to next proxy
            }
        }
        
        // If we get here, all proxies failed
        return res.status(500).json({ 
            error: 'Failed to scrape with any proxy', 
            detail: 'Tried all available proxies without success',
            proxiesCount: proxies.length
        });
        
    } catch (error) {
        console.error('Scraper error:', error);
        
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
        
        res.status(500).json({ 
            error: 'Failed to scrape the product page.',
            detail: error.toString(),
            proxy: currentProxy ? currentProxy.split(':').slice(0, 2).join(':') : 'none'
        });
    }
});

// Add a proxy test endpoint
app.get('/test-proxy', async (req, res) => {
    try {
        const proxies = await getProxiesFromSheet();
        res.json({
            proxyCount: proxies.length,
            proxySample: proxies.slice(0, 3).map(p => {
                const parts = p.split(':');
                return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : p;
            })
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to test proxies', detail: error.toString() });
    }
});

app.listen(port, () => {
    console.log(`✅ Scraper running at http://localhost:${port}`);
});
