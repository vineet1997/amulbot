import 'dotenv/config';
import { chromium } from 'playwright';

const recordUrl = process.env.AMULBOT_RECORD_URL;
const workerSecret = process.env.AMULBOT_WORKER_SECRET;
if (!recordUrl || !workerSecret) throw new Error('Missing AMULBOT_RECORD_URL or AMULBOT_WORKER_SECRET.');

const targetsUrl = recordUrl.replace(/amulbot-record-availability(?:\?.*)?$/, 'amulbot-worker-targets');
if (targetsUrl === recordUrl) throw new Error('AMULBOT_RECORD_URL must point to the amulbot-record-availability function.');

const baselineProducts = [
  { sku: 'WPCCP03_01', name: 'Amul Chocolate Whey Protein, 34 g | Pack of 30 sachets', product_url: 'https://shop.amul.com/en/product/amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets' },
  { sku: 'WPCCP05_02', name: 'Amul Chocolate Whey Protein, 34 g | Pack of 60 sachets', product_url: 'https://shop.amul.com/en/product/amul-chocolate-whey-protein-34-g-or-pack-of-60-sachets' },
  { sku: 'WPCCP06_01', name: 'Amul Chocolate Whey Protein Gift Pack, 34 g | Pack of 10 sachets', product_url: 'https://shop.amul.com/en/product/amul-chocolate-whey-protein-gift-pack-34-g-or-pack-of-10-sachets' },
  { sku: 'WPW32_30', name: 'Amul Whey Protein, 32 g | Pack of 30 Sachets', product_url: 'https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-30-sachets' },
  { sku: 'WPW32_60', name: 'Amul Whey Protein, 32 g | Pack of 60 Sachets', product_url: 'https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-60-sachets' },
  { sku: 'HPL200_30', name: 'Amul High Protein Plain Lassi, 200 mL | Pack of 30', product_url: 'https://shop.amul.com/en/product/amul-high-protein-plain-lassi-200-ml-or-pack-of-30' },
  { sku: 'HPR200_30', name: 'Amul High Protein Rose Lassi, 200 mL | Pack of 30', product_url: 'https://shop.amul.com/en/product/amul-high-protein-rose-lassi-200-ml-or-pack-of-30' },
  { sku: 'HPB200_30', name: 'Amul High Protein Buttermilk, 200 mL | Pack of 30', product_url: 'https://shop.amul.com/en/product/amul-high-protein-buttermilk-200-ml-or-pack-of-30' },
  { sku: 'HPM250_32', name: 'Amul High Protein Milk, 250 mL | Pack of 32', product_url: 'https://shop.amul.com/en/product/amul-high-protein-milk-250-ml-or-pack-of-32' },
];

async function getTargets() {
  const response = await fetch(targetsUrl, { headers: { 'x-amulbot-worker-secret': workerSecret } });
  if (!response.ok) throw new Error(`Could not load monitoring targets: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  if (!Array.isArray(payload.targets)) throw new Error('Worker target response is invalid.');
  return payload.targets;
}

async function checkProduct(page, product) {
  await page.goto(product.product_url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.getByRole('heading', { name: product.name, exact: true }).waitFor({ timeout: 30_000 });
  const text = await page.locator('body').innerText();
  const soldOut = /\bSold Out\b/i.test(text) || /\bNotify Me\b/i.test(text);
  const addToCart = /\bAdd to Cart\b/i.test(text);
  if (!soldOut && !addToCart) throw new Error('Product availability control not identified.');
  return addToCart && !soldOut;
}

const targets = await getTargets();
const byPincode = new Map();
for (const target of targets) {
  if (!/^[1-9]\d{5}$/.test(target.pincode) || typeof target.sku !== 'string' || typeof target.product_url !== 'string') continue;
  const products = byPincode.get(target.pincode) ?? [];
  if (!products.some((product) => product.sku === target.sku)) products.push(target);
  byPincode.set(target.pincode, products);
}
for (const pincode of (process.env.AMULBOT_PINCODES ?? '').split(',').map((value) => value.trim()).filter((value) => /^[1-9]\d{5}$/.test(value))) {
  const products = byPincode.get(pincode) ?? [];
  for (const product of baselineProducts) if (!products.some((target) => target.sku === product.sku)) products.push(product);
  byPincode.set(pincode, products);
}

const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const [pincode, products] of byPincode) {
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
        try {
          const available = await checkProduct(page, product);
          checks.push({ sku: product.sku, pincode, status: available ? 'available' : 'unavailable', checkedAt: new Date().toISOString() });
        } catch (error) {
          checks.push({ sku: product.sku, pincode, status: 'unknown', checkedAt: new Date().toISOString(), detail: String(error) });
        }
      }
    } catch (error) {
      for (const product of products) checks.push({ sku: product.sku, pincode, status: 'unknown', checkedAt: new Date().toISOString(), detail: String(error) });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }

const response = await fetch(recordUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-amulbot-worker-secret': workerSecret }, body: JSON.stringify({ checks }) });
if (!response.ok) throw new Error(`AmulBot API failed: ${response.status} ${await response.text()}`);
console.log(JSON.stringify({ checks, result: await response.json() }));
