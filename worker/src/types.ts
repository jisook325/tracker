import { dayEntries, sleepEvents, users } from "../db/schema";

export type CellState = "empty" | "partial" | "full";
export type User = typeof users.$inferSelect;
export type DayEntry = typeof dayEntries.$inferSelect;
export type SleepEvent = typeof sleepEvents.$inferSelect;
