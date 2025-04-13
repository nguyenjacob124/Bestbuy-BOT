
# BestBuy Scraper

This is a Puppeteer-based scraper for BestBuy product details.

## Usage

### Install dependencies
```
npm install
```

### Run locally
```
node index.js
```

Access:
```
http://localhost:3000/?url=https://www.bestbuy.com/site/your-product-url
```

### Deploy to Render.com
1. Connect GitHub repo to Render
2. Set build command:
```
npm install
```
3. Set start command:
```
node index.js
```
4. Deploy and get public endpoint.

## Output

JSON structure:
```
{
  "productName": "Dell XPS 13",
  "productURL": "https://...",
  "regularPrice": 999.99,
  "salePrice": 849.99,
  "availability": "In Stock",
  "imageURL": "https://..."
}
```
