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

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Identiteten. Alltid normalisert til små bokstaver før lagring. */
  email: text("email").notNull(),
  nickname: text("nickname").notNull(),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Engangskoder for innlogging. Koden lagres bare som hash. */
export const loginCodes = pgTable(
  "login_codes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("login_codes_email_created_idx").on(t.email, t.createdAt)],
);

/** Et bygg. Hver lokasjon har sitt eget sett etasjer. */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const floors = pgTable(
  "floors",
  {
    id: serial("id").primaryKey(),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    /** Unikt per lokasjon, ikke globalt – to bygg kan ha hver sin 3. etasje. */
    number: integer("number").notNull(),
    label: text("label").notNull(),
    qrToken: text("qr_token").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("floors_location_number_idx").on(t.locationId, t.number)],
);

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
    /** Utledet av etasjen, men lagret direkte så resultatlisten slipper en kobling. */
    locationId: integer("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
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

/** Meldinger fra brukerne om problemer. Begge koblingene er valgfrie, fordi
 * skjemaet skal virke også når man ikke får logget inn. */
export const supportReports = pgTable(
  "support_reports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    message: text("message").notNull(),
    contactEmail: text("contact_email"),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    fromPage: text("from_page"),
    userAgent: text("user_agent"),
    serviceWorker: boolean("service_worker"),
    appVersion: text("app_version"),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_reports_handled_created_idx").on(t.handledAt, t.createdAt)],
);

export type Participant = typeof participants.$inferSelect;
export type SupportReport = typeof supportReports.$inferSelect;
export type LoginCode = typeof loginCodes.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Floor = typeof floors.$inferSelect;
export type ActivityPeriod = typeof activityPeriods.$inferSelect;
export type Trip = typeof trips.$inferSelect;
