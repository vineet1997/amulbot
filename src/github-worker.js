import 'dotenv/config';
import { chromium } from 'playwright';

const products = [
  { sku: 'WPCCP03_01', name: 'Amul Chocolate Whey Protein, 34 g | Pack of 30 sachets', url: 'https://shop.amul.com/product/amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets' },
  { sku: 'WPCCP05_02', name: 'Amul Chocolate Whey Protein, 34 g | Pack of 60 sachets', url: 'https://shop.amul.com/product/amul-chocolate-whey-protein-34-g-or-pack-of-60-sachets' },
  { sku: 'WPCCP06_01', name: 'Amul Chocolate Whey Protein, 34 g | Pack of 10 sachets', url: 'https://shop.amul.com/product/amul-chocolate-whey-protein-34-g-or-pack-of-10-sachets' },
];

const pincodes = (process.env.AMULBOT_PINCODES ?? '').split(',').map((value) => value.trim()).filter((value) => /^[1-9]\d{5}$/.test(value));
if (!pincodes.length || !process.env.AMULBOT_RECORD_URL || !process.env.AMULBOT_WORKER_SECRET) throw new Error('Missing AMULBOT_PINCODES, AMULBOT_RECORD_URL, or AMULBOT_WORKER_SECRET.');

async function checkProduct(page, product) {
  await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.getByRole('heading', { name: product.name, exact: true }).waitFor({ timeout: 30_000 });
  const text = await page.locator('body').innerText();
  const soldOut = /\bSold Out\b/i.test(text) || /\bNotify Me\b/i.test(text);
  const addToCart = /\bAdd to Cart\b/i.test(text);
  if (!soldOut && !addToCart) throw new Error('Product availability control not identified.');
  return addToCart && !soldOut;
}

const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const pincode of pincodes) {
    const context = await browser.newContext({ locale: 'en-IN', userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' });
    const page = await context.newPage();
    try {
      await page.goto('https://shop.amul.com/en/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const input = page.getByPlaceholder('Enter Your Pincode');
      await input.waitFor({ state: 'visible', timeout: 30_000 });
      await input.fill(pincode);
      await page.getByRole('button', { name: pincode, exact: true }).click();
      await input.waitFor({ state: 'hidden', timeout: 30_000 });
      for (const product of products) {
        try { checks.push({ sku: product.sku, pincode, available: await checkProduct(page, product), checkedAt: new Date().toISOString() }); }
        catch (error) { checks.push({ sku: product.sku, pincode, available: false, checkedAt: new Date().toISOString(), detail: String(error) }); }
      }
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

const response = await fetch(process.env.AMULBOT_RECORD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-amulbot-worker-secret': process.env.AMULBOT_WORKER_SECRET }, body: JSON.stringify({ checks }) });
if (!response.ok) throw new Error(`AmulBot API failed: ${response.status} ${await response.text()}`);
console.log(JSON.stringify({ checks, result: await response.json() }));
