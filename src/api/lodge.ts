import express from "express";
import { PrismaClient, SeasonalPricing } from "@prisma/client";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { region, checkIn, checkOut, adults, children, accommodationType } =
      req.query;

    if (!checkIn || !checkOut || !adults) {
      return res
        .status(400)
        .json({ message: "Missing required search parameters" });
    }

    const checkInDate = new Date(String(checkIn));
    const checkOutDate = new Date(String(checkOut));
    const adultsNum = parseInt(String(adults)) || 1;
    const childrenNum = parseInt(String(children)) || 0;
    const accommodationTypeStr =
      accommodationType === undefined || accommodationType === null
        ? "All"
        : String(accommodationType);
    const roomCount = parseInt(String(req.query.room)) || 1;

    const sort = String(req.query.sort || "popularity");

    try {
      const lodges = await prisma.hotSpringLodge.findMany({
        where: {
          address:
            region !== "전체" && region !== "All"
              ? { contains: String(region), mode: "insensitive" }
              : undefined,
          accommodationType:
            accommodationTypeStr !== "전체" && accommodationTypeStr !== "All"
              ? accommodationTypeStr
              : undefined,
          roomTypes: {
            some: {
              maxAdults: {
                gte: adultsNum,
              },
              maxChildren: {
                gte: childrenNum,
              },
              inventories: {
                some: {
                  date: {
                    gte: checkInDate,
                    lt: checkOutDate,
                  },
                  availableRooms: {
                    gte: roomCount,
                  },
                },
              },
            },
          },
        },
        include: {
          images: true,
          roomTypes: {
            where: {
              maxAdults: {
                gte: adultsNum,
              },
              maxChildren: {
                gte: childrenNum,
              },
              inventories: {
                some: {
                  date: {
                    gte: checkInDate,
                    lt: checkOutDate,
                  },
                  availableRooms: {
                    gte: roomCount,
                  },
                },
              },
            },
            include: {
              images: true,
              inventories: {
                where: {
                  date: {
                    gte: checkInDate,
                    lt: checkOutDate,
                  },
                  availableRooms: {
                    gte: roomCount,
                  },
                },
              },
            },
          },
          _count: {
            select: {
              reservations: true,
              reviews: true,
            },
          },
        },
      });

      function getStayDates(checkIn: Date, checkOut: Date) {
        const dates: Date[] = [];
        let current = new Date(checkIn);
        const end = new Date(checkOut);
        while (current < end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        return dates;
      }

      function isWeekend(date: Date) {
        const day = date.getDay();
        return day === 0 || day === 6;
      }

      function getApplicableSeasonalPricing(
        seasonalPricing: SeasonalPricing[],
        date: Date
      ) {
        return seasonalPricing.find((season) => {
          return date >= season.from && date <= season.to;
        });
      }

      function getPriceForDate(
        date: Date,
        roomType: { basePrice: number; weekendPrice: number | null },
        seasonalPricing: SeasonalPricing[]
      ) {
        const season = getApplicableSeasonalPricing(seasonalPricing, date);
        if (season) {
          return isWeekend(date) ? season.weekendPrice : season.basePrice;
        } else {
          return isWeekend(date)
            ? roomType.weekendPrice ?? roomType.basePrice
            : roomType.basePrice;
        }
      }

      const stayDates = getStayDates(checkInDate, checkOutDate);

      const lodgesWithPrice = await Promise.all(
        lodges.map(async (lodge) => {
          const roomTypesWithPrice = await Promise.all(
            lodge.roomTypes.map(async (room) => {
              const seasonalPricing = await prisma.seasonalPricing.findMany({
                where: {
                  roomTypeId: room.id,
                },
              });

              let totalPrice = 0;
              for (const date of stayDates) {
                totalPrice += getPriceForDate(date, room, seasonalPricing);
              }
              totalPrice *= roomCount;
              const pricePerNight =
                stayDates.length > 0
                  ? Math.floor(totalPrice / stayDates.length)
                  : 0;

              return {
                ...room,
                totalPrice,
                pricePerNight,
              };
            })
          );

          return {
            ...lodge,
            roomTypes: roomTypesWithPrice,
            region,
            adults: adultsNum,
            children: childrenNum,
          };
        })
      );

      if (sort === "popularity") {
        lodgesWithPrice.sort(
          (a, b) => b._count.reservations - a._count.reservations
        );
      } else if (sort === "reviews") {
        lodgesWithPrice.sort((a, b) => b._count.reviews - a._count.reviews);
      } else if (sort === "price_asc") {
        lodgesWithPrice.sort((a, b) => {
          const priceA = Math.min(
            ...a.roomTypes.map((r) => r.pricePerNight || Infinity)
          );
          const priceB = Math.min(
            ...b.roomTypes.map((r) => r.pricePerNight || Infinity)
          );
          return priceA - priceB;
        });
      } else if (sort === "price_desc") {
        lodgesWithPrice.sort((a, b) => {
          const priceA = Math.max(
            ...a.roomTypes.map((r) => r.pricePerNight || 0)
          );
          const priceB = Math.max(
            ...b.roomTypes.map((r) => r.pricePerNight || 0)
          );
          return priceB - priceA;
        });
      }
      res.status(200).json(lodgesWithPrice);
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
      const lodge = await prisma.hotSpringLodge.findUnique({
        where: { id: Number(id) },
      });

      if (!lodge) {
        return res.status(404).json({ message: "Lodge not found" });
      }

      const existingReview = await prisma.hotSpringLodgeReview.findFirst({
        where: {
          lodgeId: lodge.id,
          userId: userId!,
        },
      });
      if (existingReview) {
        return res
          .status(400)
          .json({ message: "You have already reviewed this lodge" });
      }

      const newReview = await prisma.hotSpringLodgeReview.create({
        data: {
          lodgeId: lodge.id,
          userId: userId!,
          rating,
          comment,
        },
        include: {
          lodge: true,
          user: true,
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
      const reviews = await prisma.hotSpringLodgeReview.findMany({
        where: { lodgeId: Number(id) },
        include: {
          user: {
            select: {
              nickname: true,
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

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const lodge = await prisma.hotSpringLodge.findUnique({
        where: { id: Number(id) },
        include: {
          images: true,
          roomTypes: {
            include: {
              seasonalPricing: true,
              images: true,
            },
          },
        },
      });

      if (!lodge) {
        return res.status(404).json({ message: "Lodge not found" });
      }
      res.status(200).json({
        ...lodge,
        images: lodge.images,
        roomTypes: lodge.roomTypes.map((roomType) => ({
          ...roomType,
          seasonalPricing: roomType.seasonalPricing,
        })),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.get("/", async (req, res) => {
  const { name, address, description, accommodationType } = req.query;

  try {
    const lodges = await prisma.hotSpringLodge.findMany({
      where: {
        name: name
          ? { contains: String(name), mode: "insensitive" }
          : undefined,
        address: address
          ? { contains: String(address), mode: "insensitive" }
          : undefined,
        description: description
          ? { contains: String(description), mode: "insensitive" }
          : undefined,
        accommodationType: accommodationType
          ? { equals: String(accommodationType) }
          : undefined,
      },
      include: {
        images: true,
        details: true,
      },
    });

    res.status(200).json(lodges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
