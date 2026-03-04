import { Router } from "express";
import { db } from "../db";
import { activityLogs, orders } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    const offset = (currentPage - 1) * limitPerPage;

    // const filterConditions = []

    // const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);
    const totalCount = countResult[0]?.count ?? 0;

    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: allOrders,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (e) {
    console.error(`GET /orders error: ${e}`);
    res.status(500).json("Failed to get all orders");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) res.status(400).json({ error: "Invalid orderId" });

    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!existingOrder)
      res.status(404).json({ error: "Order details not found" });

    res.status(200).json({ data: existingOrder });
  } catch (e) {
    console.error(`GET /orders/:id error: ${e}`);
    res.status(500).json("Failed to get order details");
  }
});

router.post("/", async (req, res) => {
  try {
    const { customerId, status, totalAmount } = req.body;

    const [newOrder] = await db
      .insert(orders)
      .values({ id: nanoid(), customerId, status, totalAmount })
      .returning({ id: orders.id });

    if (!newOrder) res.status(400).json({ error: "Failed to create order" });

    res.status(201).json({ data: newOrder });
  } catch (e) {
    console.error(`POST /orders error: ${e}`);
    res.status(500).json("Failed to create an order");
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId) res.status(400).json({ error: "Invalid orderId" });

    const { status, userId } = req.body;

    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) res.status(404).json({ error: "Order not found" });

    await db.insert(activityLogs).values({
      id: nanoid(),
      userId,
      action: `order_status_updated`,
      entity: "order",
      entityId: orderId,
    });

    res.status(200).json({ data: updatedOrder });
  } catch (e) {
    console.error(`PATCH /orders/:id/status error: ${e}`);
    res.status(500).json("Failed to update order status");
  }
});

export default router;
