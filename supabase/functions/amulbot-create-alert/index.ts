const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_USERNAME = Deno.env.get("AMULBOT_TELEGRAM_BOT_USERNAME") ?? "Amul_protein_122002_bot";
const APP_ORIGINS = new Set(
  [
    "https://amulbot.vercel.app",
    Deno.env.get("AMULBOT_APP_ORIGIN")?.replace(/\/$/, ""),
  ].filter((origin): origin is string => Boolean(origin)),
);

const cors = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function headers(write = false) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    ...(write ? { "Content-Profile": "amulbot" } : { "Accept-Profile": "amulbot" }),
    "Content-Type": "application/json",
  };
}

function corsHeaders(origin: string | null) {
  return { ...cors, ...(isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}) };
}

function isAllowedOrigin(origin: string | null) {
  return origin !== null && APP_ORIGINS.has(origin);
}

function reply(body: unknown, origin: string | null, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, origin, 405);
  if (!isAllowedOrigin(origin)) return reply({ error: "Invalid origin" }, origin, 403);

  try {
    const { sku, pincode } = await request.json();
    if (typeof sku !== "string" || typeof pincode !== "string" || !/^[1-9]\d{5}$/.test(pincode)) {
      return reply({ error: "Choose a listed product and a valid Indian pincode." }, origin, 400);
    }

    const productResponse = await fetch(`${PROJECT_URL}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}&active=is.true&select=sku`, { headers: headers() });
    const products = await productResponse.json();
    if (!productResponse.ok || products.length !== 1) return reply({ error: "This product is not currently trackable." }, origin, 400);

    const connectionCode = crypto.randomUUID().replaceAll("-", "");
    const alertResponse = await fetch(`${PROJECT_URL}/rest/v1/alerts`, {
      method: "POST",
      headers: { ...headers(true), Prefer: "return=representation" },
      body: JSON.stringify({ product_sku: sku, pincode, connection_code: connectionCode }),
    });
    if (!alertResponse.ok) throw new Error(await alertResponse.text());

    return reply({ telegram_url: `https://t.me/${BOT_USERNAME}?start=a_${connectionCode}` }, origin);
  } catch (error) {
    console.error("amulbot-create-alert", error);
    return reply({ error: "We could not create your alert. Please try again." }, origin, 500);
  }
});
