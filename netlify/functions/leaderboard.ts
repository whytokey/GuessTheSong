import type { Config } from "@netlify/functions";
import { desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { leaderboard } from "../../db/schema.js";

// Максимум за раунд: 10 треков, множитель стрика до ×3 → 2400 очков
const MAX_SCORE = 2400;

export default async (req: Request) => {
  if (req.method === "GET") {
    const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit")) || 3, 1), 50);
    const rows = await db
      .select({ name: leaderboard.name, score: leaderboard.score })
      .from(leaderboard)
      .orderBy(desc(leaderboard.score), leaderboard.updatedAt)
      .limit(limit);
    return Response.json({ entries: rows.map((r, i) => ({ rank: i + 1, ...r })) });
  }

  if (req.method === "POST") {
    let body: { playerId?: unknown; name?: unknown; score?: unknown };
    try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    const playerId = typeof body.playerId === "string" ? body.playerId.trim().slice(0, 128) : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
    const score = Math.floor(Number(body.score));
    if (!playerId || !Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
      return new Response("Invalid payload", { status: 400 });
    }
    await db
      .insert(leaderboard)
      .values({ playerId, name, score })
      .onConflictDoUpdate({
        target: leaderboard.playerId,
        set: {
          score: sql`GREATEST(${leaderboard.score}, excluded.score)`,
          name: sql`CASE WHEN excluded.name <> '' THEN excluded.name ELSE ${leaderboard.name} END`,
          updatedAt: sql`CASE WHEN excluded.score > ${leaderboard.score} THEN now() ELSE ${leaderboard.updatedAt} END`,
        },
      });
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/leaderboard",
};
