import { Prisma, PrismaClient } from "@prisma/client";
import express, { Request, RequestHandler, Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { v4 as uuidv4 } from "uuid";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });
const uploadMiddleware = upload.fields([
  { name: "hotSpringLodgeImages", maxCount: 30 },
  { name: "roomTypeImages", maxCount: 100 },
]);

router.post("/", uploadMiddleware, (async (req: Request, res: Response) => {
  const { name, address, description, accommodationType } = req.body;

  const roomTypes = JSON.parse(req.body.roomTypes);
  const latitude = parseFloat(req.body.latitude);
  const longitude = parseFloat(req.body.longitude);
  const { hotSpringLodgeImages = [], roomTypeImages = [] } = req.files as {
    [key: string]: Express.Multer.File[];
  };

  if (
    !name ||
    !address ||
    latitude === 0 ||
    longitude === 0 ||
    !accommodationType ||
    !Array.isArray(roomTypes) ||
    roomTypes.length === 0 ||
    hotSpringLodgeImages.length === 0
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const uploadLodgeImages = await Promise.all(
    hotSpringLodgeImages.map(async (image) => {
      const { imageUrl, publicId } = await uploadToCloudinary(
        image.buffer,
        `lodge_${uuidv4()}`
      );
      return {
        imageUrl,
        publicId,
      };
    })
  );

  const uploadRoomTypeImages = await Promise.all(
    roomTypes.map(async (_, idx) => {
      const roomFiles = roomTypeImages.filter((file: any) =>
        file.originalname.startsWith(`roomType_${idx}_`)
      );

      if (roomFiles.length === 0) return [];

      const uploaded = await Promise.all(
        roomFiles.map(async (file) => {
          const { imageUrl, publicId } = await uploadToCloudinary(
            file.buffer,
            `roomType_${idx}_${uuidv4()}`
          );
          return { idx, imageUrl, publicId };
        })
      );
      return uploaded;
    })
  );

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

        if (uploadLodgeImages.length > 0) {
          await tx.hotSpringLodgeImage.createMany({
            data: uploadLodgeImages.map((img) => ({
              lodgeId: lodge.id,
              imageUrl: img.imageUrl,
              publicId: img.publicId,
            })),
          });
        }

        const createRoomTypes = await Promise.all(
          roomTypes.map(async (roomType: any, index: number) => {
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

            const images = uploadRoomTypeImages[index];
            if (images && images.length > 0) {
              await tx.roomTypeImage.createMany({
                data: images.map((img) => ({
                  roomTypeId: createRoomType.id,
                  imageUrl: img.imageUrl,
                  publicId: img.publicId,
                })),
              });
            }

            return createRoomType;
          })
        );

        const generateDates = (days: number) => {
          const dates: Date[] = [];
          const today = new Date();
          for (let i = 0; i < days; i++) {
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + i);
            dates.push(nextDate);
          }
          return dates;
        };
        const dates = generateDates(365);

        const inventoryData = createRoomTypes.flatMap((roomType) =>
          dates.map((date) => ({
            lodgeId: lodge.id,
            roomTypeId: roomType.id,
            date,
            totalRooms: roomType.totalRooms,
            availableRooms: roomType.totalRooms,
          }))
        );

        await tx.roomInventory.createMany({
          data: inventoryData,
        });

        return { lodge, roomTypes: createRoomTypes };
      }
    );
    console.log("Request:", req.body);
    console.log("Files:", req.files);

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
}) as RequestHandler);

router.patch("/:id", uploadMiddleware, (async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, description, accommodationType } = req.body;

    const keepImgIds = JSON.parse(req.body.keepImgIds || "[]");
    const roomTypes = JSON.parse(req.body.roomTypes);
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    const keepRoomTypeImgIds = JSON.parse(req.body.keepRoomTypeImgIds || "[]");
    const filesByField = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };
    const roomTypeImageFiles = filesByField["roomTypeImages"] || [];
    const lodgeImageFiles = filesByField["hotSpringLodgeImages"] || [];

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: Number(id) },
    });

    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    if (
      !name ||
      !address ||
      !accommodationType ||
      !Array.isArray(roomTypes) ||
      roomTypes.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let uploadedLodgeImages: { imageUrl: string; publicId: string }[] = [];
    if (lodgeImageFiles?.length > 0) {
      uploadedLodgeImages = await Promise.all(
        lodgeImageFiles.map(async (img) => {
          const { imageUrl, publicId } = await uploadToCloudinary(
            img.buffer,
            `lodge_${uuidv4()}`
          );
          return { imageUrl, publicId };
        })
      );
    }

    const roomTypeImageUpload: {
      idx: number;
      imageUrl: string;
      publicId: string;
    }[] = [];
    if (Array.isArray(roomTypes) && roomTypeImageFiles.length > 0) {
      for (let i = 0; i < roomTypes.length; i++) {
        const files = roomTypeImageFiles.filter(
          (_, idx) => Math.floor(idx / 100) === i
        );
        const uploads = await Promise.all(
          files.map((file) =>
            uploadToCloudinary(file.buffer, `roomType_${i}_${uuidv4()}`)
          )
        );
        uploads.forEach((upload) => {
          roomTypeImageUpload.push({
            idx: i,
            imageUrl: upload.imageUrl,
            publicId: upload.publicId,
          });
        });
      }
    }

    try {
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

        const withLodgeId = uploadedLodgeImages.map((img) => ({
          lodgeId: updated.id,
          imageUrl: img.imageUrl,
          publicId: img.publicId,
        }));

        if (withLodgeId.length > 0) {
          await tx.hotSpringLodgeImage.createMany({
            data: withLodgeId,
          });
        }

        const imagesToDelete = await prisma.hotSpringLodgeImage.findMany({
          where: { lodgeId: Number(id), id: { notIn: keepImgIds } },
        });

        if (imagesToDelete.length > 0) {
          await Promise.all(
            imagesToDelete.map((img) => {
              if (img.publicId) {
                return deleteFromCloudinary(img.publicId).catch((err) => {
                  console.error(`Failed to delete image ${img.publicId}:`, err);
                });
              }
              return Promise.resolve();
            })
          );

          await tx.hotSpringLodgeImage.deleteMany({
            where: {
              lodgeId: updated.id,
              id: { notIn: keepImgIds },
            },
          });
        }

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

        await tx.roomTypeImage.deleteMany({
          where: {
            roomTypeId: { in: roomTypeIds },
            id: { notIn: keepRoomTypeImgIds },
          },
        });

        for (let i = 0; i < roomTypes.length; i++) {
          const roomType = roomTypes[i];

          if (roomType.id) {
            await tx.roomType.update({
              where: { id: roomType.id },
              data: {
                name: roomType.name,
                description: roomType.description,
                basePrice: roomType.basePrice,
                weekendPrice: roomType.weekendPrice,
                maxAdults: roomType.maxAdults,
                maxChildren: roomType.maxChildren,
                totalRooms: roomType.totalRooms,
              },
            });

            await tx.seasonalPricing.deleteMany({
              where: { roomTypeId: roomType.id },
            });

            if (roomType.seasonalPricing?.length) {
              await tx.seasonalPricing.createMany({
                data: roomType.seasonalPricing.map((s: any) => ({
                  roomTypeId: roomType.id,
                  from: new Date(s.from),
                  to: new Date(s.to),
                  basePrice: s.basePrice,
                  weekendPrice: s.weekendPrice,
                })),
              });
            }

            const keepImages = keepRoomTypeImgIds
              .filter((item: any) => item.roomTypeId === roomType.id)
              .map((item: any) => item.imageId);

            await tx.roomTypeImage.deleteMany({
              where: {
                roomTypeId: roomType.id,
                id: { notIn: keepImages },
              },
            });

            const newImages = roomTypeImageUpload.filter(
              (img) => img.idx === i
            );
            if (newImages.length > 0) {
              await tx.roomTypeImage.createMany({
                data: newImages.map((img) => ({
                  roomTypeId: roomType.id,
                  imageUrl: img.imageUrl,
                  publicId: img.publicId,
                })),
              });
            }
          } else {
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

            if (roomType.seasonalPricing?.length) {
              await tx.seasonalPricing.createMany({
                data: roomType.seasonalPricing.map((s: any) => ({
                  roomTypeId: createdRoom.id,
                  from: new Date(s.from),
                  to: new Date(s.to),
                  basePrice: s.basePrice,
                  weekendPrice: s.weekendPrice,
                })),
              });
            }

            const newImages = roomTypeImageUpload.filter(
              (img) => img.idx === i
            );
            if (newImages.length > 0) {
              await tx.roomTypeImage.createMany({
                data: newImages.map((img) => ({
                  roomTypeId: createdRoom.id,
                  imageUrl: img.imageUrl,
                  publicId: img.publicId,
                })),
              });
            }
          }
        }

        return { updated, uploadedLodgeImages };
      }); // <-- moved closing brace and parenthesis here

      const updatedRoomTypes = await prisma.roomType.findMany({
        where: {
          lodgeId: Number(id),
        },
        include: {
          seasonalPricing: true,
          images: true,
        },
      });

      res.status(200).json({
        message: "Lodge updated successfully",
        lodge: result.updated,
        uploadedLodgeImages: result.uploadedLodgeImages,
        roomTypes: updatedRoomTypes
      });
    } catch (err) {
      console.error("Transaction error:", err);
      throw err;
    }
  } catch (err) {
    console.error("Error in lodge update:", err);
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

    const lodgeImages = await prisma.hotSpringLodgeImage.findMany({
      where: { lodgeId: Number(id) },
    });

    await Promise.all(
      lodgeImages.map((img) =>
        img.publicId ? deleteFromCloudinary(img.publicId) : Promise.resolve()
      )
    );

    await prisma.roomTypeImage.deleteMany({
      where: { roomTypeId: { in: roomTypeIds } },
    });

    await prisma.seasonalPricing.deleteMany({
      where: { roomTypeId: { in: roomTypeIds } },
    });

    await prisma.roomInventory.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.roomType.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.hotSpringLodgeImage.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.reservation.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.hotSpringLodgeBookmark.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.hotSpringLodgeDetail.deleteMany({
      where: { lodgeId: Number(id) },
    });

    await prisma.hotSpringLodgeReview.deleteMany({
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
