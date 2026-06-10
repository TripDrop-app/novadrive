CREATE TYPE "personal_expense_category" AS ENUM (
  'food',
  'housing',
  'transport',
  'health',
  'family',
  'entertainment',
  'other'
);

CREATE TABLE IF NOT EXISTS "personal_withdrawals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "withdrawal_date" date NOT NULL,
  "amount_mkd" numeric(12, 2) NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "personal_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "expense_date" date NOT NULL,
  "category" "personal_expense_category" NOT NULL,
  "amount_mkd" numeric(12, 2) NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chemical_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chemical_type" "chemical_type" NOT NULL,
  "started_date" date NOT NULL,
  "ended_date" date,
  "canister_cost_mkd" numeric(12, 2) NOT NULL,
  "yield_washes" integer NOT NULL,
  "wash_count" integer DEFAULT 0 NOT NULL,
  "p1_count" integer DEFAULT 0 NOT NULL,
  "p2_count" integer DEFAULT 0 NOT NULL,
  "p3_count" integer DEFAULT 0 NOT NULL,
  "revenue_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "water_cost_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "electricity_cost_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "profit_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "expense_id" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

UPDATE "settings" SET "chemical_1_yield_washes" = 70 WHERE "chemical_1_yield_washes" IS NULL;
UPDATE "settings" SET "chemical_2_yield_washes" = 70 WHERE "chemical_2_yield_washes" IS NULL;
