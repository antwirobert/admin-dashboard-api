import { Router } from "express";
import { db } from "../db/index.js";
import { activityLogs, orders } from "../db/schema.js";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();

router.get("/metrics", async (_, res) => {
  try {
    const totalOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);

    const revenue = await db
      .select({
        total: sql<number>`coalesce(sum(total_amount),0)`,
      })
      .from(orders)
      .where(eq(orders.status, "completed"));

    const pendingOrders = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, "pending"));

    res.status(200).json({
      totalOrders: totalOrders[0]?.count,
      revenue: revenue[0]?.total,
      pendingOrders: pendingOrders[0]?.count,
    });
  } catch (e) {
    console.error(`GET /metrics error: ${e}`);
    res.status(500).json("Failed to get dashboard metrics");
  }
});

router.get("/activity", async (_, res) => {
  try {
    const recentActivities = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs);

    res.status(200).json({
      data: recentActivities,
      pagination: {
        limit: 10,
        recentActivitiesCount: recentActivities.length,
        totalActivities: total[0]?.count,
      },
    });
  } catch (e) {
    console.error(`GET /activity error: ${e}`);
    res.status(500).json("Failed to fetch recent activity logs");
  }
});

export default router;
