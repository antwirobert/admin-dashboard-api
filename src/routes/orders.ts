import { Router } from "express";
import { db } from "../db";
import { activityLogs, orders } from "../db/schema";
import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { format } from "date-fns";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDate,
      endDate,
    } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(ilike(orders.id, `%${search}%`));
    }

    if (status) {
      filterConditions.push(eq(orders.status, String(status) as OrderStatus));
    }

    if (startDate) {
      filterConditions.push(gte(orders.createdAt, new Date(String(startDate))));
    }

    if (endDate) {
      filterConditions.push(lte(orders.createdAt, new Date(String(endDate))));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(whereClause);
    const totalCount = countResult[0]?.count ?? 0;

    const allOrders = await db
      .select()
      .from(orders)
      .where(whereClause)
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

router.get("/export/csv", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="orders-${new Date().toISOString().split("T")[0]}.csv"`,
    );

    res.write("Order ID,Status,Total Amount,Created At\n");

    const stream = await db
      .select({
        id: orders.id,
        status: orders.status,
        total_amount: orders.totalAmount,
        created_at: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .$dynamic();

    const chunkSize = 1000;
    let offset = 0;

    while (true) {
      const chunk = await db
        .select()
        .from(orders)
        .limit(chunkSize)
        .offset(offset)
        .orderBy(desc(orders.createdAt));

      if (chunk.length === 0) break;

      const csvRows = chunk.map((o) =>
        [
          `"${o.id}"`,
          `"${String(o.status).replace(/"/g, '""')}"`,
          o.totalAmount,
          `"${format(new Date(o.createdAt), "yyyy-MM-dd HH:mm:ss")}"`,
        ].join(","),
      );

      res.write(csvRows.join("\n") + "\n");
      offset += chunkSize;
    }

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Export failed" });
    } else {
      res.end();
    }
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

router.patch("/:id", async (req, res) => {
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
