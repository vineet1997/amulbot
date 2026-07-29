import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  productSku: text("product_sku").notNull(),
  pincode: text("pincode").notNull(),
  telegramChatId: text("telegram_chat_id"),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
});
