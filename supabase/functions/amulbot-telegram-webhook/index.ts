const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("AMULBOT_TELEGRAM_WEBHOOK_SECRET")!;

function dbHeaders(write = false) {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, ...(write ? { "Content-Profile": "amulbot" } : { "Accept-Profile": "amulbot" }), "Content-Type": "application/json" };
}

async function telegram(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

  try {
    const update = await request.json();
    const message = update.message;
    const chatId = message?.chat?.id;
    const match = message?.text?.match(/^\/start\s+a_([a-f0-9]{32})$/i);
    if (!chatId || !match) return new Response("ok");

    const code = match[1];
    const alertResponse = await fetch(`${PROJECT_URL}/rest/v1/alerts?connection_code=eq.${code}&status=eq.pending&select=id,product_sku,pincode`, { headers: dbHeaders() });
    const [alert] = await alertResponse.json();
    if (!alert) { await telegram(chatId, "That alert link has expired or was already used. Create a new alert at the website."); return new Response("ok"); }

    await fetch(`${PROJECT_URL}/rest/v1/telegram_users?on_conflict=chat_id`, { method: "POST", headers: { ...dbHeaders(true), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ chat_id: chatId, username: message.from?.username ?? null, first_name: message.from?.first_name ?? null, last_seen_at: new Date().toISOString() }) });

    const duplicateResponse = await fetch(`${PROJECT_URL}/rest/v1/alerts?product_sku=eq.${encodeURIComponent(alert.product_sku)}&pincode=eq.${alert.pincode}&telegram_chat_id=eq.${chatId}&status=eq.active&select=id`, { headers: dbHeaders() });
    const duplicates = await duplicateResponse.json();
    if (duplicates.length) {
      await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ status: "deleted", connection_code: null }) });
      await telegram(chatId, `You are already tracking ${alert.product_sku} for ${alert.pincode}.`);
    } else {
      await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ telegram_chat_id: chatId, status: "active", connection_code: null, activated_at: new Date().toISOString() }) });
      await telegram(chatId, `You're all set. AmulBot will alert you when ${alert.product_sku} is available for ${alert.pincode}.`);
    }
    return new Response("ok");
  } catch (error) {
    console.error("amulbot-telegram-webhook", error);
    return new Response("ok");
  }
});
