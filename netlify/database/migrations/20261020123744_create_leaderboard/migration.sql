CREATE TABLE "leaderboard" (
	"player_id" text PRIMARY KEY,
	"name" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
