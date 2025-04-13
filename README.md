# BestBuy Scraper with Google Sheet Proxies

## Features
- Cloud-ready for Render.com deployment
- Dynamic proxy rotation from Google Sheets
- Automatic failover to next proxy if one fails
- Proxy caching to reduce API calls
- Detailed error reporting
- Keep-alive health checks for Render.com
- Output: Product name, prices, availability, image

## Setup

### Google Sheet
The scraper pulls proxies from: [Google Sheet](https://docs.google.com/spreadsheets/d/1HdUUxxJPOt7DkOTEClnIFtjignXiFCs0ye99NF-IjH8/edit)

Format each proxy in Column A as:
- `IP:PORT` (basic proxy)
- `IP:PORT:USERNAME:PASSWORD` (authenticated proxy)

### API Key
Replace the dummy API key in `index.js` with your own Google API key if needed.

## Installation

```bash
# Install dependencies
npm install

# Run locally
npm start
```

## Usage

### Health Check
```
https://your-render-url.com/health
```

### Scrape a Product
```
https://your-render-url.com/scrape?url=https://www.bestbuy.com/site/your-product-url
```

### Test Proxies
```
https://your-render-url.com/test-proxy
```

## Deployment to Render.com

1. Upload this code to your GitHub repository
2. Connect the repository to Render.com
3. Create a new Web Service
4. Set build command: `npm install`
5. Set start command: `node index.js`
6. Deploy!

## Troubleshooting

If scraping fails:
1. Check that your proxies are working using the `/test-proxy` endpoint
2. Ensure your Google API key has access to the Google Sheets API
3. Check Render.com logs for detailed error messages
4. Try with different proxies if Best Buy is blocking your current ones
