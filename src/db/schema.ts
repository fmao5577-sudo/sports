import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const cacheEntries = pgTable(
  "cache_entries",
  {
    key: text("key").primaryKey(),
    payload: jsonb("payload").notNull(),
    source: text("source").notNull(),
    confidence: text("confidence").notNull().default("medium"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull(),
  },
  (table) => [index("cache_entries_expires_idx").on(table.expiresAt)],
);

export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    canonicalName: text("canonical_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    primarySource: text("primary_source").notNull(),
    sourceIds: jsonb("source_ids").notNull().$type<Record<string, string>>(),
    payload: jsonb("payload").notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("entities_type_name_idx").on(table.type, table.normalizedName),
  ],
);

export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id").notNull(),
    alias: text("alias").notNull(),
    source: text("source").notNull(),
    sourceId: text("source_id"),
  },
  (table) => [
    uniqueIndex("entity_aliases_unique_idx").on(table.source, table.alias, table.sourceId),
    index("entity_aliases_entity_idx").on(table.entityId),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityName: text("entity_name").notNull(),
    extra: jsonb("extra").$type<Record<string, string | number | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("favorites_unique_idx").on(table.clientId, table.entityType, table.entityId),
    index("favorites_client_idx").on(table.clientId),
  ],
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    query: text("query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("search_history_client_idx").on(table.clientId, table.createdAt)],
);

export const recentlyViewed = pgTable(
  "recently_viewed",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityName: text("entity_name").notNull(),
    href: text("href").notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recently_viewed_client_idx").on(table.clientId, table.viewedAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_client_idx").on(table.clientId, table.createdAt)],
);

export const userPrefs = pgTable("user_prefs", {
  clientId: text("client_id").primaryKey(),
  locale: text("locale").notNull().default("ar"),
  theme: text("theme").notNull().default("dark"),
  timezone: text("timezone"),
  notifyGoals: boolean("notify_goals").notNull().default(true),
  notifyKickoff: boolean("notify_kickoff").notNull().default(true),
  notifyFulltime: boolean("notify_fulltime").notNull().default(true),
  notifyCards: boolean("notify_cards").notNull().default(true),
  notifyTransfers: boolean("notify_transfers").notNull().default(true),
  notifyNews: boolean("notify_news").notNull().default(true),
  notifyLineups: boolean("notify_lineups").notNull().default(true),
  notifyInjuries: boolean("notify_injuries").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourceHealth = pgTable("source_health", {
  source: text("source").primaryKey(),
  status: text("status").notNull(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
  latencyMs: integer("latency_ms"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
