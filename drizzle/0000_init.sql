CREATE TYPE "public"."free_wash_reason" AS ENUM('testing', 'complaint', 'family', 'other');
CREATE TYPE "public"."expense_category" AS ENUM('chemicals', 'equipment', 'repairs', 'misc');
CREATE TYPE "public"."chemical_type" AS ENUM('c1', 'c2');

CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"electricity_rate_mkd" numeric(10, 4) DEFAULT '17.99' NOT NULL,
	"water_rate_mkd_per_m3" numeric(10, 4) DEFAULT '35.34' NOT NULL,
	"chemical_1_cost_mkd" numeric(10, 2) DEFAULT '2850' NOT NULL,
	"chemical_2_cost_mkd" numeric(10, 2) DEFAULT '2850' NOT NULL,
	"chemical_1_yield_washes" integer,
	"chemical_2_yield_washes" integer,
	"meter_baseline_kwh" numeric(12, 3),
	"water_per_p1_liters" integer DEFAULT 100 NOT NULL,
	"water_per_p2_p3_liters" integer DEFAULT 125 NOT NULL,
	"electricity_extra_p3_kwh" numeric(6, 2) DEFAULT '11' NOT NULL,
	"base_kwh_per_wash" numeric(8, 4),
	"token_value_mkd" integer DEFAULT 200 NOT NULL,
	"price_p1_mkd" integer DEFAULT 100 NOT NULL,
	"price_p2_mkd" integer DEFAULT 150 NOT NULL,
	"price_p3_mkd" integer DEFAULT 200 NOT NULL,
	"setup_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "daily_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_date" date NOT NULL,
	"p1_count" integer DEFAULT 0 NOT NULL,
	"p2_count" integer DEFAULT 0 NOT NULL,
	"p3_count" integer DEFAULT 0 NOT NULL,
	"counter_reset_confirmed" boolean DEFAULT false NOT NULL,
	"meter_reading_kwh" numeric(12, 3),
	"cash_collected_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tokens_collected" integer DEFAULT 0 NOT NULL,
	"gross_revenue_mkd" numeric(12, 2) NOT NULL,
	"water_cost_mkd" numeric(12, 2) NOT NULL,
	"electricity_cost_mkd" numeric(12, 2) NOT NULL,
	"chemical_1_cost_mkd" numeric(12, 2) NOT NULL,
	"chemical_2_cost_mkd" numeric(12, 2) NOT NULL,
	"misc_expenses_mkd" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_profit_mkd" numeric(12, 2) NOT NULL,
	"delta_kwh" numeric(10, 3),
	"expected_kwh" numeric(10, 3),
	"revenue_per_wash_mkd" numeric(10, 2),
	"cost_per_wash_mkd" numeric(10, 2),
	"profit_per_wash_mkd" numeric(10, 2),
	"cash_discrepancy_warning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "free_washes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_entry_id" uuid NOT NULL,
	"program" integer NOT NULL,
	"quantity" integer NOT NULL,
	"reason" "free_wash_reason" NOT NULL
);

CREATE TABLE "entry_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_entry_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text NOT NULL,
	"new_value" text NOT NULL,
	"amended_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "token_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity" integer NOT NULL,
	"amount_mkd" numeric(12, 2) NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);

CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount_mkd" numeric(12, 2) NOT NULL,
	"note" text,
	"chemical_type" "chemical_type",
	"canister_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "chemical_canister_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chemical_type" "chemical_type" NOT NULL,
	"canister_count" integer DEFAULT 1 NOT NULL,
	"amount_mkd" numeric(12, 2),
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);

ALTER TABLE "free_washes" ADD CONSTRAINT "free_washes_daily_entry_id_daily_entries_id_fk" FOREIGN KEY ("daily_entry_id") REFERENCES "public"."daily_entries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "entry_amendments" ADD CONSTRAINT "entry_amendments_daily_entry_id_daily_entries_id_fk" FOREIGN KEY ("daily_entry_id") REFERENCES "public"."daily_entries"("id") ON DELETE cascade ON UPDATE no action;
