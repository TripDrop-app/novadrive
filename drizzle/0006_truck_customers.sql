CREATE TABLE IF NOT EXISTS "truck_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_name" text NOT NULL,
  "phone" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "truck_washes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "truck_customers"("id") ON DELETE CASCADE,
  "plate" text NOT NULL,
  "wash_date" date NOT NULL,
  "amount_mkd" numeric(12, 2) NOT NULL,
  "note" text,
  "paid" boolean DEFAULT false NOT NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
