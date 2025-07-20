import express from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { region, date, adults, children, sort } = req.query;

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

    if (sort) {
      switch (sort) {
        case "adult_price_asc":
          tickets.sort((a, b) => a.adultPrice - b.adultPrice);
          break;
        case "adult_price_desc":
          tickets.sort((a, b) => b.adultPrice - a.adultPrice);
          break;
        case "child_price_asc":
          tickets.sort((a, b) => a.childPrice - b.childPrice);
          break;
        case "child_price_desc":
          tickets.sort((a, b) => b.childPrice - a.childPrice);
          break;
        default:
          break;
      }
    }

    res.status(200).json(tickets);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const ticket = await prisma.ticketType.findUnique({
        where: { id: Number(id) },
        include: {
          lodge: {
            include: {
              images: true,
            },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.status(200).json(ticket);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.post(
  "/:id/review",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;

    try {
      const ticket = await prisma.ticketType.findUnique({
        where: { id: Number(id) },
      });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const existingReview = await prisma.ticketReview.findFirst({
        where: {
          ticketTypeId: ticket.id,
          userId: userId!,
        },
      });

      if (existingReview) {
        return res
          .status(400)
          .json({ message: "You have already reviewed this ticket" });
      }

      const reservation = await prisma.ticketReservation.findFirst({
        where: {
          userId: userId!,
          ticketTypeId: ticket.id,
          status: "CONFIRMED",
          date: {
            lt: new Date(),
          },
        },
      });

      if (!reservation) {
        return res.status(403).json({
          message: "You can only review used & confirmed reservations",
        });
      }

      const newReview = await prisma.ticketReview.create({
        data: {
          ticketTypeId: ticket.id,
          userId: userId!,
          rating,
          comment,
          ticketReservationId: reservation.id,
        },
        include: {
          ticketType: true,
          user: {
            select: { nickname: true },
          },
        },
      });

      res.status(201).json(newReview);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.get(
  "/:id/reviews",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const reviews = await prisma.ticketReview.findMany({
        where: { ticketTypeId: Number(id) },
        include: {
          user: {
            select: { nickname: true },
          },
          reservation: {
            select: {
              date: true,
              adults: true,
              children: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.status(200).json(reviews);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.put(
  "/review/:reviewId",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;

    try {
      const review = await prisma.ticketReview.findUnique({
        where: { id: Number(reviewId) },
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (review.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedReview = await prisma.ticketReview.update({
        where: { id: Number(reviewId) },
        data: { rating, comment },
        include: {
          user: { select: { nickname: true } },
        },
      });

      res.status(200).json(updatedReview);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/review/:reviewId",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { reviewId } = req.params;
    const userId = req.user?.userId;

    try {
      const review = await prisma.ticketReview.findUnique({
        where: { id: Number(reviewId) },
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (review.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await prisma.ticketReview.delete({
        where: { id: Number(reviewId) },
      });

      res.status(200).json({ message: "Review deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
