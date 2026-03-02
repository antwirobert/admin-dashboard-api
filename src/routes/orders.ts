import { Router } from "express";
import { db } from "../db";
import { orders } from "../db/schema";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders);

    res.status(200).json({ data: allOrders });
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
      .values({ customerId, status, totalAmount })
      .returning({ id: orders.id });

    if (!newOrder) res.status(400).json({ error: "Failed to create order" });

    res.status(201).json({ data: newOrder });
  } catch (e) {
    console.error(`POST /orders error: ${e}`);
    res.status(500).json("Failed to create an order");
  }
});

export default router;
