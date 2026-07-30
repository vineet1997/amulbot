const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("AMULBOT_TELEGRAM_WEBHOOK_SECRET")!;

function dbHeaders(write = false) { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, ...(write ? { "Content-Profile": "amulbot" } : { "Accept-Profile": "amulbot" }), "Content-Type": "application/json" }; }
async function telegram(chatId: number, text: string) { await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) }); }
async function answerCallbackQuery(id: string, text: string) { await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callback_query_id: id, text, show_alert: false }) }); }
async function jsonOrThrow(response: Response, label: string) { const text = await response.text(); if (!response.ok) throw new Error(`${label} failed (${response.status}): ${text}`); return text ? JSON.parse(text) : null; }

async function recordFeedback(callback: { id: string; data?: string; from?: { id?: number } }) {
  const match = callback.data?.match(/^([cmw]):([0-9a-f-]{36})$/i);
  if (!match || !callback.from?.id) return answerCallbackQuery(callback.id, "That feedback link is no longer valid.");
  const outcome = match[1].toLowerCase() === "c" ? "caught" : match[1].toLowerCase() === "m" ? "missed" : "wrong_stock";
  const alerts = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${match[2]}&select=id,telegram_chat_id,product_sku,pincode`, { headers: dbHeaders() }), "Read feedback alert");
  const [alert] = alerts;
  if (!alert || Number(alert.telegram_chat_id) !== callback.from.id) return answerCallbackQuery(callback.id, "This feedback belongs to another alert.");
  await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/catch_feedback`, { method: "POST", headers: dbHeaders(true), body: JSON.stringify({ alert_id: alert.id, product_sku: alert.product_sku, pincode: alert.pincode, outcome }) }), "Save feedback");
  const response = outcome === "caught" ? "Nice catch! You helped make Amulbot better." : outcome === "missed" ? "Logged. We will keep watching." : "Thank you — we will treat this signal carefully.";
  return answerCallbackQuery(callback.id, response);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });
  try {
    const update = await request.json();
    if (update.callback_query) { await recordFeedback(update.callback_query); return new Response("ok"); }
    const message = update.message;
    const chatId = message?.chat?.id;
    const match = message?.text?.match(/^\/start\s+a_([a-f0-9]{32})$/i);
    if (!chatId || !match) return new Response("ok");
    const alertRows = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?connection_code=eq.${match[1]}&status=eq.pending&select=id,product_sku,pincode`, { headers: dbHeaders() }), "Read pending alert");
    const [alert] = alertRows;
    if (!alert) { await telegram(chatId, "That alert link has expired or was already used. Create a new alert at the website."); return new Response("ok"); }
    await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/telegram_users?on_conflict=chat_id`, { method: "POST", headers: { ...dbHeaders(true), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ chat_id: chatId, username: message.from?.username ?? null, first_name: message.from?.first_name ?? null, last_seen_at: new Date().toISOString() }) }), "Save Telegram user");
    const duplicates = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?product_sku=eq.${encodeURIComponent(alert.product_sku)}&pincode=eq.${alert.pincode}&telegram_chat_id=eq.${chatId}&status=eq.active&select=id`, { headers: dbHeaders() }), "Read duplicate alerts");
    if (duplicates.length) { await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ status: "deleted", connection_code: null }) }), "Remove duplicate alert"); await telegram(chatId, `You are already tracking ${alert.product_sku} for ${alert.pincode}.`); }
    else { await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ telegram_chat_id: chatId, status: "active", connection_code: null, activated_at: new Date().toISOString() }) }), "Activate alert"); await telegram(chatId, `You are all set. AmulBot will alert you when ${alert.product_sku} is available for ${alert.pincode}.`); }
    return new Response("ok");
  } catch (error) { console.error("amulbot-telegram-webhook", error); return new Response("ok"); }
});
