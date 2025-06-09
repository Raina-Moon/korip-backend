import { SeasonalType, PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const {
    name,
    address,
    latitude,
    longitude,
    description,
    accommodationType,
    roomTypes,
  } = req.body;

  if (
    !name ||
    !address ||
    latitude === 0 ||
    longitude === 0 ||
    !accommodationType ||
    !Array.isArray(roomTypes)
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lodge = await tx.hotSpringLodge.create({
        data: {
          name,
          address,
          latitude,
          longitude,
          description,
          accommodationType,
        },
      });

      const createRoomTypes = await Promise.all(
        roomTypes.map(async (roomType) => {
          const createRoomType = await tx.roomType.create({
            data: {
              lodgeId: lodge.id,
              name: roomType.name,
              description: roomType.description,
              basePrice: roomType.basePrice,
              weekendPrice: roomType.weekendPrice,
              maxAdults: roomType.maxAdults,
              maxChildren: roomType.maxChildren,
              totalRooms: roomType.totalRooms,
            },
          });

          if (Array.isArray(roomType.seasonalPricing)) {
            await tx.seasonalPricing.createMany({
              data: roomType.seasonalPricing.map(
                (pricing: {
                  from: string;
                  to: string;
                  price: number;
                  type: SeasonalType;
                }) => ({
                  roomTypeId: roomType.id,
                  from: new Date(pricing.from),
                  to: new Date(pricing.to),
                  price: pricing.price,
                  priceType: pricing.type,
                })
              ),
            });
          }
          return createRoomType;
        })
      );

      await tx.roomInventory.createMany({
        data: createRoomTypes.map((roomType) => ({
          lodgeId: lodge.id,
          roomTypeId: roomType.id,
          totalRooms: roomType.totalRooms,
          availableRooms: roomType.totalRooms,
        })),
      });

      return { lodge, roomTypes: createRoomTypes };
    });
    res.status(201).json({ message: "Lodge created successfully", ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const lodges = await prisma.hotSpringLodge.findMany();
    res.json(lodges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!lodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }
    res.status(200).json(lodge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
    } = req.body;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    const updated = await prisma.hotSpringLodge.update({
      where: { id: Number(id) },
      data: {
        name,
        address,
        latitude,
        longitude,
        description,
        accommodationType,
      },
    });
    res.status(200).json({ message: "Lodge updated successfully", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });
    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    await prisma.hotSpringLodge.delete({
      where: { id: Number(id) },
    });
    res.status(200).json({ message: "Lodge deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
