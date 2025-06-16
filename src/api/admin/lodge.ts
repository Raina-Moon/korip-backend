import { Prisma, PrismaClient } from "@prisma/client";
import express, { Request, RequestHandler, Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const uploadMiddleware = upload.array("hotSpringLodgeImages", 30);

router.post("/", uploadMiddleware, (async (req: Request, res: Response) => {
  const { name, address, description, accommodationType } = req.body;

  const roomTypes = JSON.parse(req.body.roomTypes);
  const hotSpringLodgeImages = (req.files as Express.Multer.File[]) || [];
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);

  if (
    !name ||
    !address ||
    latitude === 0 ||
    longitude === 0 ||
    !accommodationType ||
    !Array.isArray(roomTypes) ||
    hotSpringLodgeImages.length === 0
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
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

        const uploadLodgeImages = await Promise.all(
          hotSpringLodgeImages.map(async (image) => {
            const imageUrl = await uploadToCloudinary(
              image.buffer,
              `lodge_${uuidv4()}`
            );
            return {
              lodgeId: lodge.id,
              imageUrl,
            };
          })
        );

        await tx.hotSpringLodgeImage.createMany({
          data: uploadLodgeImages,
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

            if (roomType.seasonalPricing?.length) {
              await tx.seasonalPricing.createMany({
                data: roomType.seasonalPricing.map(
                  (pricing: {
                    from: string;
                    to: string;
                    basePrice: number;
                    weekendPrice: number;
                  }) => ({
                    roomTypeId: createRoomType.id,
                    from: new Date(pricing.from),
                    to: new Date(pricing.to),
                    basePrice: pricing.basePrice,
                    weekendPrice: pricing.weekendPrice,
                  })
                ),
              });
            }

            if (Array.isArray(roomType.roomTypeImages)) {
              await tx.roomTypeImage.createMany({
                data: roomType.roomTypeImages.map(
                  (images: { imageUrl: string }) => ({
                    roomTypeId: createRoomType.id,
                    imageUrl: images.imageUrl,
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
      }
    );
    res.status(201).json({ message: "Lodge created successfully", ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}) as RequestHandler);

router.get("/", async (_req, res) => {
  try {
    const lodges = await prisma.hotSpringLodge.findMany();
    res.json(lodges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", (async (req, res) => {
  try {
    const { id } = req.params;
    const lodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
      include: {
        RoomType: {
          include: {
            SeasonalPricing: true,
          },
        },
      },
    });

    if (!lodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }
    res.status(200).json({
      ...lodge,
      roomTypes: lodge.RoomType.map((roomType) => ({
        ...roomType,
        seasonalPricing: roomType.SeasonalPricing,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}) as RequestHandler);

router.patch("/:id", (async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      latitude,
      longitude,
      description,
      accommodationType,
      roomTypes,
    } = req.body;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.hotSpringLodge.update({
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

      const existingRoomTypes = await tx.roomType.findMany({
        where: { lodgeId: Number(id) },
      });

      const roomTypeIds = existingRoomTypes.map((rt) => rt.id);
      await tx.seasonalPricing.deleteMany({
        where: { roomTypeId: { in: roomTypeIds } },
      });

      await tx.roomInventory.deleteMany({
        where: { lodgeId: Number(id) },
      });

      await tx.roomType.deleteMany({
        where: { lodgeId: Number(id) },
      });

      const createRoomTypes = await Promise.all(
        roomTypes.map(async (roomType: any) => {
          const createdRoom = await tx.roomType.create({
            data: {
              lodgeId: updated.id,
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
                  basePrice: number;
                  weekendPrice: number;
                }) => ({
                  roomTypeId: createdRoom.id,
                  from: new Date(pricing.from),
                  to: new Date(pricing.to),
                  basePrice: pricing.basePrice,
                  weekendPrice: pricing.weekendPrice,
                })
              ),
            });
          }
          return createdRoom;
        })
      );
      return { updated, roomTypes: createRoomTypes };
    });
    res.status(200).json({
      message: "Lodge updated successfully",
      lodge: result.updated,
      roomTypes: result.roomTypes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}) as RequestHandler);

router.delete("/:id", (async (req, res) => {
  try {
    const { id } = req.params;

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });
    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    const roomTypes = await prisma.roomType.findMany({
      where: { lodgeId: Number(id) },
    });

    const roomTypeIds = roomTypes.map((rt) => rt.id);

    await prisma.seasonalPricing.deleteMany({
      where: { roomTypeId: { in: roomTypeIds } },
    });

    await prisma.roomInventory.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.roomType.deleteMany({
      where: { lodgeId: Number(id) },
    });

    const deleted = await prisma.hotSpringLodge.delete({
      where: { id: Number(id) },
    });

    res
      .status(200)
      .json({ message: "Lodge deleted successfully", lodge: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}) as RequestHandler);

export default router;
