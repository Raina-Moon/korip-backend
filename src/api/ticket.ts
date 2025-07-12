import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { region, date, adults, children } = req.query;

    if (!date || !adults) {
      return res
        .status(400)
        .json({ message: "Missing required search parameters" });
    }

    const searchDate = new Date(String(date));
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const adultsNum = parseInt(String(adults)) || 1;
    const childrenNum = parseInt(String(children)) || 0;

    const inventories = await prisma.ticketInventory.findMany({
      where: {
        date: {
            gte: startOfDay,
            lt: endOfDay,
        },
        availableAdultTickets: {
          gte: adultsNum,
        },
        availableChildTickets: {
          gte: childrenNum,
        },
        ticketType: {
          lodge: {
            address:
              region && region !== "전체" && region !== "All"
                ? {
                    contains: String(region),
                    mode: "insensitive",
                  }
                : undefined,
          },
        },
      },
      include: {
        ticketType: {
          include: {
            lodge: true,
          },
        },
      },
    });

    const ticketMap = new Map<number, any>();

    inventories.forEach((inv) => {
      const tt = inv.ticketType;
      if (!ticketMap.has(tt.id)) {
        ticketMap.set(tt.id, {
          id: tt.id,
          name: tt.name,
          description: tt.description,
          region: tt.lodge.address,
          lodgeId: tt.lodgeId,
          adultPrice: tt.adultPrice,
          childPrice: tt.childPrice,
          availableAdultTickets: 0,
          availableChildTickets: 0,
          date: searchDate,
        });
      }
      const agg = ticketMap.get(tt.id);
      agg.availableAdultTickets += inv.availableAdultTickets;
      agg.availableChildTickets += inv.availableChildTickets;
    });

    const tickets = Array.from(ticketMap.values());

    res.status(200).json(tickets);
  })
);

export default router;
