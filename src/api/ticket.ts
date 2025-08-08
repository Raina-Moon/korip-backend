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
    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const adultsNum = parseInt(String(adults)) || 1;
    const childrenNum = parseInt(String(children)) || 0;
    const sortOption = String(sort || "popularity");

    try {
      const lodges = await prisma.hotSpringLodge.findMany({
        where: {
          address:
            region && region !== "전체" && region !== "All"
              ? {
                  contains: String(region),
                  mode: "insensitive",
                }
              : undefined,
          ticketTypes: {
            some: {
              inventories: {
                some: {
                  date: {
                    gte: startOfDay,
                    lt: endOfDay,
                  },
                  availableAdultTickets: { gte: adultsNum },
                  availableChildTickets: { gte: childrenNum },
                },
              },
            },
          },
        },
        include: {
          images: {
            select: { imageUrl: true },
          },
          ticketTypes: {
            where: {
              inventories: {
                some: {
                  date: {
                    gte: startOfDay,
                    lt: endOfDay,
                  },
                  availableAdultTickets: { gte: adultsNum },
                  availableChildTickets: { gte: childrenNum },
                },
              },
            },
            include: {
              inventories: {
                where: {
                  date: {
                    gte: startOfDay,
                    lt: endOfDay,
                  },
                  availableAdultTickets: { gte: adultsNum },
                  availableChildTickets: { gte: childrenNum },
                },
                select: {
                  availableAdultTickets: true,
                  availableChildTickets: true,
                },
              },
              reviews: {
                where: { isHidden: false },
                select: { rating: true },
              },
            },
          },
          _count: {
            select: {
              reservations: true,
            },
          },
        },
      });

      const lodgesWithTickets = lodges
        .map((lodge) => {
          const ticketTypesWithDetails = lodge.ticketTypes
            .map((ticket) => {
              const reviewCount = ticket.reviews.length;
              const averageRating =
                reviewCount > 0
                  ? ticket.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
                  : 0;

              return {
                id: ticket.id,
                name: ticket.name,
                nameEn: ticket.nameEn || "",
                description: ticket.description || "",
                descriptionEn: ticket.descriptionEn || "",
                adultPrice: ticket.adultPrice,
                childPrice: ticket.childPrice,
                availableAdultTickets: ticket.inventories.reduce(
                  (sum: number, inv: { availableAdultTickets: number }) => sum + inv.availableAdultTickets,
                  0
                ),
                availableChildTickets: ticket.inventories.reduce(
                  (sum: number, inv: { availableChildTickets: number }) => sum + inv.availableChildTickets,
                  0
                ),
                date: searchDate.toISOString(),
                reviewCount,
                averageRating: parseFloat(averageRating.toFixed(1)),
              };
            })
            .filter(
              (ticket) =>
                ticket.availableAdultTickets >= adultsNum &&
                ticket.availableChildTickets >= childrenNum
            );

          if (ticketTypesWithDetails.length === 0) {
            return null;
          }

          const allReviews = lodge.ticketTypes.flatMap((ticket) => ticket.reviews);
          const reviewCount = allReviews.length;
          const averageRating =
            reviewCount > 0
              ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
              : 0;

          return {
            id: lodge.id,
            name: lodge.name,
            nameEn: lodge.nameEn || "",
            address: lodge.address,
            images: lodge.images,
            ticketTypes: ticketTypesWithDetails,
            reviewCount,
            averageRating: parseFloat(averageRating.toFixed(1)),
            reservationCount: lodge._count.reservations, // Corrected to match schema
          };
        })
        .filter((lodge): lodge is NonNullable<typeof lodge> => lodge !== null);

      switch (sortOption) {
        case "popularity":
          lodgesWithTickets.sort((a, b) => b.reservationCount - a.reservationCount);
          break;
        case "reviews":
          lodgesWithTickets.sort((a, b) => b.reviewCount - a.reviewCount);
          break;
        case "adult_price_asc":
          lodgesWithTickets.sort((a, b) => {
            const priceA = a.ticketTypes.length > 0 ? Math.min(...a.ticketTypes.map((t) => t.adultPrice)) : Infinity;
            const priceB = b.ticketTypes.length > 0 ? Math.min(...b.ticketTypes.map((t) => t.adultPrice)) : Infinity;
            return priceA - priceB;
          });
          break;
        case "adult_price_desc":
          lodgesWithTickets.sort((a, b) => {
            const priceA = a.ticketTypes.length > 0 ? Math.max(...a.ticketTypes.map((t) => t.adultPrice)) : 0;
            const priceB = b.ticketTypes.length > 0 ? Math.max(...b.ticketTypes.map((t) => t.adultPrice)) : 0;
            return priceB - priceA;
          });
          break;
        case "child_price_asc":
          lodgesWithTickets.sort((a, b) => {
            const priceA = a.ticketTypes.length > 0 ? Math.min(...a.ticketTypes.map((t) => t.childPrice)) : Infinity;
            const priceB = b.ticketTypes.length > 0 ? Math.min(...b.ticketTypes.map((t) => t.childPrice)) : Infinity;
            return priceA - priceB;
          });
          break;
        case "child_price_desc":
          lodgesWithTickets.sort((a, b) => {
            const priceA = a.ticketTypes.length > 0 ? Math.max(...a.ticketTypes.map((t) => t.childPrice)) : 0;
            const priceB = b.ticketTypes.length > 0 ? Math.max(...b.ticketTypes.map((t) => t.childPrice)) : 0;
            return priceB - priceA;
          });
          break;
        default:
          break;
      }

      res.status(200).json(lodgesWithTickets);
    } catch (err) {
      console.error("Error in ticket search:", err);
      res.status(500).json({ message: "Internal server error" });
    }
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
