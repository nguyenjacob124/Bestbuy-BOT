const puppeteer = require('puppeteer');
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 10000;

// Your Google Sheet ID and range
const SHEET_ID = '1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8';
const SHEET_RANGE = 'Sheet1!A:A'; // Proxies in column A

// Your new Google API key
const API_KEY = 'AIzaSyDUJ2L0AdhMANBa7l1mZOfTh40NI0f1-NQ';

// Fallback proxy if Google Sheet fails
const FALLBACK_PROXIES = [
    '103.105.49.53:80' // Add more reliable fallbacks if needed
];

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
        console.log('Fetching proxies from Google Sheet...');
        
        // Direct fetch approach with your API key
        const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${API_KEY}`;
        console.log(`Requesting: ${sheetUrl}`);
        
        const response = await fetch(sheetUrl);
        
        if (!response.ok) {
            console.error(`Google Sheets API error: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error(`Error details: ${errorText}`);
            throw new Error(`Google Sheets API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.values && data.values.length) {
            // Filter out empty values and trim whitespace
            const proxies = data.values
                .filter(row => row[0] && row[0].trim().length > 0)
                .map(row => row[0].trim());
                
            console.log(`Successfully fetched ${proxies.length} proxies from Google Sheet`);
            
            // Update cache
            cachedProxies = proxies;
            lastProxyFetch = now;
            
            return proxies;
        } else {
            console.log('No proxy data found in Google Sheet, using fallbacks');
            return FALLBACK_PROXIES;
        }
    } catch (error) {
        console.error('Error fetching proxies from Google Sheet:', error);
        return FALLBACK_PROXIES;
    }
}

// Health check endpoint - keep this very simple
app.get('/health', (req, res) => {
    res.send('✅ Render app is alive!');
});

// Basic error handling middleware
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
        // Get proxies from sheet (with fallback)
        proxies = await getProxiesFromSheet();
        
        // Try proxies one by one until successful
        for (let i = 0; i < proxies.length; i++) {
            currentProxy = proxies[i];
            console.log(`Trying proxy ${i+1}/${proxies.length}: ${currentProxy}`);
            
            let proxyArgs = [];
            let authOptions = {};
            
            // Parse proxy details
            const proxyParts = currentProxy.split(':');
            
            if (proxyParts.length >= 2) {
                const [proxyIP, proxyPort] = proxyParts;
                proxyArgs = [`--proxy-server=http://${proxyIP}:${proxyPort}`];
                
                // If proxy has username/password
                if (proxyParts.length >= 4) {
                    const [, , proxyUser, proxyPass] = proxyParts;
                    authOptions = { username: proxyUser, password: proxyPass };
                }
            }
            
            try {
                console.log('Launching browser with puppeteer...');
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
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWe
