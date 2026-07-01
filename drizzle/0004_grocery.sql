CREATE TYPE "grocery_item_decision" AS ENUM ('pending', 'need', 'skip');
CREATE TYPE "grocery_session_phase" AS ENUM ('swiping', 'shopping');

CREATE TABLE IF NOT EXISTS "grocery_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "emoji" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "grocery_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phase" "grocery_session_phase" DEFAULT 'swiping' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "grocery_session_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "grocery_sessions"("id") ON DELETE CASCADE,
  "item_id" uuid NOT NULL REFERENCES "grocery_items"("id") ON DELETE CASCADE,
  "decision" "grocery_item_decision" DEFAULT 'pending' NOT NULL,
  "in_cart" boolean DEFAULT false NOT NULL,
  "removed" boolean DEFAULT false NOT NULL,
  UNIQUE("session_id", "item_id")
);
