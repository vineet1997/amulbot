const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("AMULBOT_WORKER_SECRET")!;
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

function dbHeaders(write = false) { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, ...(write ? { "Content-Profile": "amulbot" } : { "Accept-Profile": "amulbot" }), "Content-Type": "application/json" }; }
async function sendTelegram(chatId: number, text: string) { const result = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }) }); return result.ok ? await result.json() : null; }
async function jsonOrThrow(response: Response, operation: string) {
  const body = await response.text();
  if (!response.ok) throw new Error(`${operation} failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-amulbot-worker-secret") !== WORKER_SECRET) return new Response("Unauthorized", { status: 401 });
  try {
    const { checks } = await request.json();
    if (!Array.isArray(checks) || checks.length > 50) return Response.json({ error: "Invalid checks" }, { status: 400 });
    let notifications = 0;
    for (const check of checks) {
      if (!check || typeof check.sku !== "string" || !/^[1-9]\d{5}$/.test(check.pincode)) continue;
      const previousResponse = await fetch(`${PROJECT_URL}/rest/v1/availability_checks?product_sku=eq.${encodeURIComponent(check.sku)}&pincode=eq.${check.pincode}&select=is_available`, { headers: dbHeaders() });
      const previousRows = await jsonOrThrow(previousResponse, "Read availability");
      const [previous] = previousRows;
      const checkedAt = check.checkedAt ?? new Date().toISOString();
      const upsertResponse = await fetch(`${PROJECT_URL}/rest/v1/availability_checks?on_conflict=product_sku,pincode`, { method: "POST", headers: { ...dbHeaders(true), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ product_sku: check.sku, pincode: check.pincode, is_available: check.available === true, checked_at: checkedAt, detail: check.detail ?? null }) });
      await jsonOrThrow(upsertResponse, "Upsert availability");
      if (check.available !== true || previous?.is_available === true) continue;
      const activeResponse = await fetch(`${PROJECT_URL}/rest/v1/alerts?product_sku=eq.${encodeURIComponent(check.sku)}&pincode=eq.${check.pincode}&status=eq.active&select=id,telegram_chat_id,products(name,product_url)`, { headers: dbHeaders() });
      for (const alert of await jsonOrThrow(activeResponse, "Read active alerts")) {
        const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;
        const result = await sendTelegram(alert.telegram_chat_id, `In stock: ${product?.name ?? check.sku} is available for pincode ${check.pincode}.\n\nOrder now: ${product?.product_url ?? "https://shop.amul.com"}`);
        const notificationResponse = await fetch(`${PROJECT_URL}/rest/v1/notifications`, { method: "POST", headers: dbHeaders(true), body: JSON.stringify({ alert_id: alert.id, availability_check_at: checkedAt, status: result ? "sent" : "failed", telegram_message_id: result?.result?.message_id ?? null }) });
        await jsonOrThrow(notificationResponse, "Record notification");
        if (result) { notifications++; const updateResponse = await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ last_notified_at: new Date().toISOString() }) }); await jsonOrThrow(updateResponse, "Update alert"); }
      }
    }
    return Response.json({ ok: true, notifications });
  } catch (error) { console.error("amulbot-record-availability", error); return Response.json({ error: error instanceof Error ? error.message : "Unable to record checks" }, { status: 500 }); }
});
