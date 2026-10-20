import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// Лучший результат каждого игрока (ключ — sdk.player.id Пикабу Игр)
export const leaderboard = pgTable("leaderboard", {
  playerId: text("player_id").primaryKey(),
  name: text().notNull(),
  score: integer().notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
