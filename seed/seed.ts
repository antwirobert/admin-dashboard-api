import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "../src/db/index.js";
import {
  account,
  activityLogs,
  customers,
  orders,
  session,
  user,
} from "../src/db/schema.js";

type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: "staff" | "admin";
  password: string;
};

type SeedCustomer = {
  id: string;
  name: string;
  email: string;
};

type SeedOrder = {
  id: string;
  customerId: string;
  status: "pending" | "completed" | "cancelled" | "processing";
  totalAmount: number;
};

type SeedActivityLogs = {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
};

type SeedData = {
  users: SeedUser[];
  customers: SeedCustomer[];
  orders: SeedOrder[];
  activityLogs: SeedActivityLogs[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSeedData = async (): Promise<SeedData> => {
  const dataPath = path.join(__dirname, "data.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as SeedData;
};

const seed = async () => {
  const data = await loadSeedData();

  await db.delete(activityLogs);
  await db.delete(orders);
  await db.delete(customers);
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);

  if (data.users.length) {
    await db
      .insert(user)
      .values(
        data.users.map((seedUser) => ({
          id: seedUser.id,
          name: seedUser.name,
          email: seedUser.email,
          emailVerified: true,
          role: seedUser.role,
        })),
      )
      .onConflictDoNothing({ target: user.id });

    await db
      .insert(account)
      .values(
        data.users.map((seedUser) => ({
          id: `acc_${seedUser.id}`,
          userId: seedUser.id,
          accountId: seedUser.email,
          providerId: "credentials",
          password: seedUser.password,
        })),
      )
      .onConflictDoNothing({ target: [account.providerId, account.accountId] });
  }

  if (data.customers.length) {
    await db
      .insert(customers)
      .values(
        data.customers.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        })),
      )
      .onConflictDoNothing({ target: customers.id });
  }

  if (data.orders.length) {
    await db
      .insert(orders)
      .values(
        data.orders.map((o) => ({
          id: o.id,
          customerId: o.customerId,
          status: o.status,
          totalAmount: o.totalAmount.toString(),
        })),
      )
      .onConflictDoNothing({ target: orders.id });
  }

  if (data.activityLogs.length) {
    await db
      .insert(activityLogs)
      .values(
        data.activityLogs.map((log) => ({
          id: log.id,
          userId: log.userId,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
        })),
      )
      .onConflictDoNothing({ target: activityLogs.id });
  }
};

seed()
  .then(() => {
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
