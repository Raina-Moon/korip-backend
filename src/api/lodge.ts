import express from "express";
import { PrismaClient } from "@prisma/client";
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
    const accommodationTypeStr = accommodationType === undefined || accommodationType === null ? "All" : String(accommodationType);
    const roomCount = parseInt(String(req.query.room)) || 1;

    console.log("Search parameters:", {
      region,
      checkIn,
      checkOut,
      adults,
      children,
      accommodationType,
      room : req.query.room,
    })

    console.log("Parsed parameters:", {
      checkInDate,
      checkOutDate,
      adultsNum,
      childrenNum,
      accommodationTypeStr,
      roomCount,
    });

    try {
      const lodges = await prisma.hotSpringLodge.findMany({
        where: {
          address: region !== "전체" && region !== "All" ? { contains: String(region), mode:"insensitive" } : undefined,
          accommodationType: accommodationTypeStr !== "전체" && accommodationTypeStr !== "All" ? accommodationTypeStr : undefined,
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
        },
      });

      console.log("Found lodges:", lodges.length);
      res.status(200).json(lodges);
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
    const { id } = req.params;

    try {
      const lodge = await prisma.hotSpringLodge.findUnique({
        where: { id: Number(id) },
        include: {
          images: true,
          details: true,
        },
      });

      if (!lodge) {
        return res.status(404).json({ message: "Lodge not found" });
      }

      res.status(200).json(lodge);
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
