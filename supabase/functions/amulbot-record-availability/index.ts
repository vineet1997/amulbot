const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("AMULBOT_WORKER_SECRET")!;
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

function dbHeaders(write = false) { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, ...(write ? { "Content-Profile": "amulbot" } : { "Accept-Profile": "amulbot" }), "Content-Type": "application/json" }; }
async function jsonOrThrow(response: Response, operation: string) { const body = await response.text(); if (!response.ok) throw new Error(`${operation} failed (${response.status}): ${body}`); return body ? JSON.parse(body) : null; }
async function sendTelegram(chatId: number, text: string, feedbackId?: string) {
  const reply_markup = feedbackId ? { inline_keyboard: [[
    { text: "Caught it ✅", callback_data: `c:${feedbackId}` },
    { text: "Missed it 💔", callback_data: `m:${feedbackId}` },
    { text: "Stock was wrong", callback_data: `w:${feedbackId}` },
  ]] } : undefined;
  const result = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, reply_markup }) });
  return result.ok ? await result.json() : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-amulbot-worker-secret") !== WORKER_SECRET) return new Response("Unauthorized", { status: 401 });
  try {
    const { checks } = await request.json();
    if (!Array.isArray(checks) || checks.length > 50) return Response.json({ error: "Invalid checks" }, { status: 400 });
    let notifications = 0; let unknownTotal = 0; let availableTotal = 0;
    for (const check of checks) {
      if (!check || typeof check.sku !== "string" || !/^[1-9]\d{5}$/.test(check.pincode)) continue;
      const status = check.status === "available" || check.status === "unavailable" || check.status === "unknown" ? check.status : check.available === true ? "available" : "unavailable";
      const checkedAt = typeof check.checkedAt === "string" ? check.checkedAt : new Date().toISOString();
      const detail = typeof check.detail === "string" ? check.detail.slice(0, 2000) : null;
      await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/availability_observations`, { method: "POST", headers: dbHeaders(true), body: JSON.stringify({ product_sku: check.sku, pincode: check.pincode, status, checked_at: checkedAt, detail }) }), "Record observation");
      if (status === "unknown") { unknownTotal++; continue; }
      if (status === "available") availableTotal++;
      const previousRows = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/availability_checks?product_sku=eq.${encodeURIComponent(check.sku)}&pincode=eq.${check.pincode}&select=is_available`, { headers: dbHeaders() }), "Read availability");
      const [previous] = previousRows;
      await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/availability_checks?on_conflict=product_sku,pincode`, { method: "POST", headers: { ...dbHeaders(true), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ product_sku: check.sku, pincode: check.pincode, is_available: status === "available", checked_at: checkedAt, detail }) }), "Upsert availability");
      if (status !== "available" || previous?.is_available === true) continue;
      const activeAlerts = await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?product_sku=eq.${encodeURIComponent(check.sku)}&pincode=eq.${check.pincode}&status=eq.active&select=id,telegram_chat_id,products(name,product_url)`, { headers: dbHeaders() }), "Read active alerts");
      for (const alert of activeAlerts) {
        const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;
        const result = await sendTelegram(alert.telegram_chat_id, `AmulBot signal: ${product?.name ?? check.sku} was confirmed available for pincode ${check.pincode} at ${new Date(checkedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.\n\nOrder now: ${product?.product_url ?? "https://shop.amul.com"}\n\nDid you catch it?`, alert.id);
        await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/notifications`, { method: "POST", headers: dbHeaders(true), body: JSON.stringify({ alert_id: alert.id, availability_check_at: checkedAt, status: result ? "sent" : "failed", telegram_message_id: result?.result?.message_id ?? null }) }), "Record notification");
        if (result) { notifications++; await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/alerts?id=eq.${alert.id}`, { method: "PATCH", headers: dbHeaders(true), body: JSON.stringify({ last_notified_at: new Date().toISOString() }) }), "Update alert"); }
      }
    }
    await jsonOrThrow(await fetch(`${PROJECT_URL}/rest/v1/worker_runs`, { method: "POST", headers: dbHeaders(true), body: JSON.stringify({ checks_total: checks.length, available_total: availableTotal, unknown_total: unknownTotal }) }), "Record worker run");
    return Response.json({ ok: true, notifications, unknownTotal });
  } catch (error) { console.error("amulbot-record-availability", error); return Response.json({ error: error instanceof Error ? error.message : "Unable to record checks" }, { status: 500 }); }
});
