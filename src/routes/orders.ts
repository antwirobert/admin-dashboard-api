import { Router } from "express";
import { db } from "../db";
import { orders } from "../db/schema";
import { desc, sql } from "drizzle-orm";
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

export default router;
