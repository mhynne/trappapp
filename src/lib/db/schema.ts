import {
  bigserial,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceToken: uuid("device_token").notNull().unique(),
    nickname: text("nickname").notNull(),
    isBanned: boolean("is_banned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("participants_device_token_key").on(t.deviceToken)],
);

export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  label: text("label").notNull(),
  qrToken: text("qr_token").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityPeriods = pgTable("activity_periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  pointsUp: numeric("points_up", { precision: 6, scale: 2 })
    .notNull()
    .default("1.0"),
  pointsDown: numeric("points_down", { precision: 6, scale: 2 })
    .notNull()
    .default("0.5"),
  dailyPointsCap: numeric("daily_points_cap", { precision: 6, scale: 2 })
    .notNull()
    .default("40"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const trips = pgTable(
  "trips",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    periodId: integer("period_id").references(() => activityPeriods.id, {
      onDelete: "set null",
    }),
    scannedFloorId: integer("scanned_floor_id")
      .notNull()
      .references(() => floors.id),
    fromFloor: integer("from_floor").notNull(),
    toFloor: integer("to_floor").notNull(),
    floorsUp: integer("floors_up").notNull(),
    floorsDown: integer("floors_down").notNull(),
    points: numeric("points", { precision: 6, scale: 2 }).notNull(),
    capped: boolean("capped").notNull().default(false),
    flagged: boolean("flagged").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("trips_participant_created_idx").on(t.participantId, t.createdAt)],
);

export type Participant = typeof participants.$inferSelect;
export type Floor = typeof floors.$inferSelect;
export type ActivityPeriod = typeof activityPeriods.$inferSelect;
export type Trip = typeof trips.$inferSelect;
