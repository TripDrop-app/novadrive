import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

export const freeWashReasonEnum = pgEnum("free_wash_reason", [
  "testing",
  "complaint",
  "family",
  "other",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "chemicals",
  "equipment",
  "repairs",
  "misc",
]);

export const chemicalTypeEnum = pgEnum("chemical_type", ["c1", "c2"]);

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  electricityRateMkd: numeric("electricity_rate_mkd", { precision: 10, scale: 4 })
    .notNull()
    .default("17.99"),
  waterRateMkdPerM3: numeric("water_rate_mkd_per_m3", { precision: 10, scale: 4 })
    .notNull()
    .default("35.34"),
  chemical1CostMkd: numeric("chemical_1_cost_mkd", { precision: 10, scale: 2 })
    .notNull()
    .default("2850"),
  chemical2CostMkd: numeric("chemical_2_cost_mkd", { precision: 10, scale: 2 })
    .notNull()
    .default("2850"),
  chemical1YieldWashes: integer("chemical_1_yield_washes"),
  chemical2YieldWashes: integer("chemical_2_yield_washes"),
  meterBaselineKwh: numeric("meter_baseline_kwh", { precision: 12, scale: 3 }),
  waterPerP1Liters: integer("water_per_p1_liters").notNull().default(100),
  waterPerP2P3Liters: integer("water_per_p2_p3_liters").notNull().default(125),
  electricityExtraP3Kwh: numeric("electricity_extra_p3_kwh", { precision: 6, scale: 2 })
    .notNull()
    .default("11"),
  baseKwhPerWash: numeric("base_kwh_per_wash", { precision: 8, scale: 4 }),
  tokenValueMkd: integer("token_value_mkd").notNull().default(200),
  priceP1Mkd: integer("price_p1_mkd").notNull().default(100),
  priceP2Mkd: integer("price_p2_mkd").notNull().default(150),
  priceP3Mkd: integer("price_p3_mkd").notNull().default(200),
  setupCompleted: boolean("setup_completed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyEntries = pgTable("daily_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionDate: date("session_date").notNull(),
  p1Count: integer("p1_count").notNull().default(0),
  p2Count: integer("p2_count").notNull().default(0),
  p3Count: integer("p3_count").notNull().default(0),
  counterResetConfirmed: boolean("counter_reset_confirmed").notNull().default(false),
  meterReadingKwh: numeric("meter_reading_kwh", { precision: 12, scale: 3 }),
  cashCollectedMkd: numeric("cash_collected_mkd", { precision: 12, scale: 2 }).notNull().default("0"),
  tokensCollected: integer("tokens_collected").notNull().default(0),
  grossRevenueMkd: numeric("gross_revenue_mkd", { precision: 12, scale: 2 }).notNull(),
  waterCostMkd: numeric("water_cost_mkd", { precision: 12, scale: 2 }).notNull(),
  electricityCostMkd: numeric("electricity_cost_mkd", { precision: 12, scale: 2 }).notNull(),
  chemical1CostMkd: numeric("chemical_1_cost_mkd", { precision: 12, scale: 2 }).notNull(),
  chemical2CostMkd: numeric("chemical_2_cost_mkd", { precision: 12, scale: 2 }).notNull(),
  miscExpensesMkd: numeric("misc_expenses_mkd", { precision: 12, scale: 2 }).notNull().default("0"),
  netProfitMkd: numeric("net_profit_mkd", { precision: 12, scale: 2 }).notNull(),
  deltaKwh: numeric("delta_kwh", { precision: 10, scale: 3 }),
  expectedKwh: numeric("expected_kwh", { precision: 10, scale: 3 }),
  revenuePerWashMkd: numeric("revenue_per_wash_mkd", { precision: 10, scale: 2 }),
  costPerWashMkd: numeric("cost_per_wash_mkd", { precision: 10, scale: 2 }),
  profitPerWashMkd: numeric("profit_per_wash_mkd", { precision: 10, scale: 2 }),
  cashDiscrepancyWarning: boolean("cash_discrepancy_warning").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const freeWashes = pgTable("free_washes", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyEntryId: uuid("daily_entry_id")
    .notNull()
    .references(() => dailyEntries.id, { onDelete: "cascade" }),
  program: integer("program").notNull(),
  quantity: integer("quantity").notNull(),
  reason: freeWashReasonEnum("reason").notNull(),
});

export const entryAmendments = pgTable("entry_amendments", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyEntryId: uuid("daily_entry_id")
    .notNull()
    .references(() => dailyEntries.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value").notNull(),
  newValue: text("new_value").notNull(),
  amendedAt: timestamp("amended_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tokenSales = pgTable("token_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  quantity: integer("quantity").notNull(),
  amountMkd: numeric("amount_mkd", { precision: 12, scale: 2 }).notNull(),
  soldAt: timestamp("sold_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseDate: date("expense_date").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amountMkd: numeric("amount_mkd", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  chemicalType: chemicalTypeEnum("chemical_type"),
  canisterCount: integer("canister_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incomeEntries = pgTable("income_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  incomeDate: date("income_date").notNull(),
  amountMkd: numeric("amount_mkd", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chemicalCanisterEvents = pgTable("chemical_canister_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  chemicalType: chemicalTypeEnum("chemical_type").notNull(),
  canisterCount: integer("canister_count").notNull().default(1),
  amountMkd: numeric("amount_mkd", { precision: 12, scale: 2 }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

export type Settings = typeof settings.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type FreeWash = typeof freeWashes.$inferSelect;
