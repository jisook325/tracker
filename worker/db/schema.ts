import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").default(sql`CURRENT_TIMESTAMP`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  googleUserId: text("google_user_id").notNull().unique(),
  email: text("email"),
  createdAt: createdAt(),
});

export const userSettings = sqliteTable("user_settings", {
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .primaryKey(),
  moodOptions: text("mood_options"), // JSON string of up to 5 moods
  createdAt: createdAt(),
});

export const dayEntries = sqliteTable(
  "day_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(), // YYYY-MM-DD (local)
    mood: text("mood"),
    moodDateSource: text("mood_date_source", { enum: ["today", "yesterday"] }),
    createdAt: createdAt(),
  },
  (table) => ({
    userDateIdx: uniqueIndex("day_entries_user_date_idx").on(table.userId, table.date),
  }),
);

export const sleepEvents = sqliteTable("sleep_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", { enum: ["bed", "wake"] }).notNull(),
  timestampLocal: text("timestamp_local").notNull(), // ISO local datetime string
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type DayEntry = typeof dayEntries.$inferSelect;
export type SleepEvent = typeof sleepEvents.$inferSelect;
