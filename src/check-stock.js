import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const productName = 'Amul Chocolate Whey Protein, 34 g | Pack of 30 sachets';
const productUrl = 'https://shop.amul.com/product/amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets';
const stateFile = path.resolve('.data', 'state.json');
const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'AMUL_PINCODE'];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

async function readState() {
  if (!existsSync(stateFile)) return { available: false };
  return JSON.parse(await readFile(stateFile, 'utf8'));
}

async function saveState(state) {
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

async function checkAvailability() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: 'en-IN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
    });
    const page = await context.newPage();

    await page.goto('https://shop.amul.com/en/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const pincodeInput = page.getByPlaceholder('Enter Your Pincode');
    await pincodeInput.waitFor({ state: 'visible', timeout: 30_000 });
    await pincodeInput.fill(process.env.AMUL_PINCODE);
    await page.getByRole('button', { name: process.env.AMUL_PINCODE, exact: true }).click();
    await pincodeInput.waitFor({ state: 'hidden', timeout: 30_000 });

    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.getByRole('heading', { name: productName, exact: true }).waitFor({ timeout: 30_000 });

    const bodyText = await page.locator('body').innerText();
    const soldOut = /\bSold Out\b/i.test(bodyText) || /\bNotify Me\b/i.test(bodyText);
    const addToCart = /\bAdd to Cart\b/i.test(bodyText);

    if (!soldOut && !addToCart) throw new Error('Could not identify the product availability control.');
    return { available: addToCart && !soldOut, checkedAt: new Date().toISOString() };
  } finally {
    await browser.close();
  }
}

async function sendTelegram(text) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(`Telegram notification failed: ${payload.description ?? response.status}`);
}

const testAlert = process.argv.includes('--test-alert');
const previous = await readState();
const result = await checkAvailability();
const shouldNotify = testAlert || (result.available && !previous.available);

if (shouldNotify) {
  const prefix = testAlert ? 'Test alert' : 'In stock';
  await sendTelegram(`${prefix}: ${productName} is available for pincode ${process.env.AMUL_PINCODE}.\n\nOrder now: ${productUrl}`);
}

await saveState({ ...result, notifiedAt: shouldNotify ? new Date().toISOString() : previous.notifiedAt ?? null });
console.log(JSON.stringify({ ...result, notified: shouldNotify }));
