import { relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  numeric,
  pgEnum,
  text,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

/* ----------------------------- */
/* Common timestamps             */
/* ----------------------------- */
const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ----------------------------- */
/* Enums                         */
/* ----------------------------- */
export const roleEnum = pgEnum("role", ["admin", "staff"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "completed",
  "cancelled",
  "processing",
]);

/* ----------------------------- */
/* Users                         */
/* ----------------------------- */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  role: roleEnum("role").notNull().default("staff"),
  ...timestamps,
});

/* ----------------------------- */
/* Sessions                      */
/* ----------------------------- */
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
    tokenUnique: uniqueIndex("session_token_unique").on(table.token),
  }),
);

/* ----------------------------- */
/* Accounts                      */
/* ----------------------------- */
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
    accountUnique: uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  }),
);

/* ----------------------------- */
/* Verification                  */
/* ----------------------------- */
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

/* ----------------------------- */
/* Customers                     */
/* ----------------------------- */
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }),
  ...timestamps,
});

/* ----------------------------- */
/* Orders                        */
/* ----------------------------- */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
  }),
);

/* ----------------------------- */
/* Activity Logs                 */
/* ----------------------------- */
export const activityLogs = pgTable("activity_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: text("entity_id").notNull(),
  ...timestamps,
});

/* ----------------------------- */
/* Relations                     */
/* ----------------------------- */
export const usersRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  activityLogs: many(activityLogs),
}));

export const sessionsRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountsRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(user, {
    fields: [activityLogs.userId],
    references: [user.id],
  }),
}));

/* ----------------------------- */
/* Types                         */
/* ----------------------------- */
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
