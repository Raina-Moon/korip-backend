import { Prisma, PrismaClient } from "@prisma/client";
import express, { Request, RequestHandler, Response } from "express";
import multer from "multer";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { v4 as uuidv4 } from "uuid";
import { deleteFromCloudinary } from "../../utils/deleteFromCloudinary";
import { asyncHandler } from "../../utils/asyncHandler";

interface TicketInput {
  id?: number;
  name: string;
  description?: string;
  adultPrice: number;
  childPrice: number;
  totalAdultTickets: number;
  totalChildTickets: number;
}

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
  const ticketTypes: TicketInput[] = JSON.parse(req.body.ticketTypes || "[]");

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
          today.setHours(0, 0, 0, 0);
          for (let i = 0; i < days; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d);
          }
          return dates;
        };

        const dates = generateDates(365);

        for (const roomType of createRoomTypes) {
          await tx.roomInventory.createMany({
            data: dates.map((date) => ({
              lodgeId: lodge.id,
              roomTypeId: roomType.id,
              date,
              totalRooms: roomType.totalRooms,
              availableRooms: roomType.totalRooms,
            })),
          });
        }

        const createdTicketTypes = await Promise.all(
          ticketTypes.map(async (ticket: TicketInput) => {
            const newTicketType = await tx.ticketType.create({
              data: {
                lodgeId: lodge.id,
                name: ticket.name,
                description: ticket.description,
                adultPrice: ticket.adultPrice,
                childPrice: ticket.childPrice,
                totalAdultTickets: ticket.totalAdultTickets,
                totalChildTickets: ticket.totalChildTickets,
              },
            });

            const inventoryResult = await tx.ticketInventory.createMany({
              data: dates.map((date) => ({
                lodgeId: lodge.id,
                ticketTypeId: newTicketType.id,
                date,
                totalAdultTickets: ticket.totalAdultTickets,
                totalChildTickets: ticket.totalChildTickets,
                availableAdultTickets: ticket.totalAdultTickets,
                availableChildTickets: ticket.totalChildTickets,
              })),
              skipDuplicates: false,
            });

            return newTicketType;
          })
        );

        return {
          lodge,
          roomTypes: createRoomTypes,
          ticketTypes: createdTicketTypes,
        };
      }
    );

    res.status(201).json({ message: "Lodge created successfully", ...result });
  } catch (err) {
    console.error(err);
    console.error("Transaction error:", JSON.stringify(err, null, 2));
    throw err;
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
        ticketTypes: true,
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
      ticketTypes: lodge.ticketTypes,
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

    const ticketTypes: TicketInput[] = JSON.parse(req.body.ticketTypes || "[]");

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

        const existingIds = existingRoomTypes.map((r) => r.id);
        const requestIds = roomTypes.filter((r) => r.id).map((r) => r.id);

        const toDeleteIds = existingIds.filter(
          (id) => !requestIds.includes(id)
        );

        if (toDeleteIds.length > 0) {
          await tx.roomInventory.deleteMany({
            where: { roomTypeId: { in: toDeleteIds } },
          });
          await tx.roomType.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        const roomTypeIds = existingRoomTypes.map((rt) => rt.id);
        await tx.seasonalPricing.deleteMany({
          where: { roomTypeId: { in: roomTypeIds } },
        });

        const keepRoomTypeImageIdList = (keepRoomTypeImgIds || []).map(
          (item: { roomTypeId: number; imageId: number }) => item.imageId
        );

        await tx.roomTypeImage.deleteMany({
          where: {
            roomTypeId: { in: roomTypeIds },
            id: { notIn: keepRoomTypeImageIdList },
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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dates: Date[] = [];
            for (let d = 0; d < 365; d++) {
              const date = new Date(today);
              date.setDate(today.getDate() + d);
              dates.push(date);
            }

            await tx.roomInventory.createMany({
              data: dates.map((date) => ({
                lodgeId: updated.id,
                roomTypeId: createdRoom.id,
                date,
                totalRooms: roomType.totalRooms,
                availableRooms: roomType.totalRooms,
              })),
            });
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < roomTypes.length; i++) {
          const roomType = roomTypes[i];

          if (!roomType.id) {
            const dates = [];
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            for (let d = 0; d < 365; d++) {
              const date = new Date(startDate);
              date.setDate(startDate.getDate() + d);
              dates.push(date);
            }

            continue;
          }

          const existing = existingRoomTypes.find((r) => r.id === roomType.id);
          if (!existing) continue;

          const totalChanged = roomType.totalRooms !== existing.totalRooms;

          if (!totalChanged) {
            continue;
          }

          const inventories = await tx.roomInventory.findMany({
            where: {
              lodgeId: updated.id,
              roomTypeId: roomType.id,
              date: { gte: today },
            },
          });

          for (const inv of inventories) {
            const reserved = existing.totalRooms - inv.availableRooms;

            const newAvailable = Math.max(roomType.totalRooms - reserved, 0);

            await tx.roomInventory.update({
              where: { id: inv.id },
              data: {
                totalRooms: roomType.totalRooms,
                availableRooms: newAvailable,
              },
            });
          }
        }

        const existingTicketTypes = await tx.ticketType.findMany({
          where: { lodgeId: Number(id) },
        });

        const existingTicketTypeIds = existingTicketTypes.map((t) => t.id);

        const requestTicketTypeIds = ticketTypes
          .filter((t) => t.id)
          .map((t) => t.id);

        const toDeleteTicketTypeIds = existingTicketTypeIds.filter(
          (id) => !requestTicketTypeIds.includes(id)
        );

        if (toDeleteTicketTypeIds.length) {
          await tx.ticketInventory.deleteMany({
            where: { ticketTypeId: { in: toDeleteTicketTypeIds } },
          });
          await tx.ticketType.deleteMany({
            where: { id: { in: toDeleteTicketTypeIds } },
          });
        }

        for (const ticket of ticketTypes) {
          if (ticket.id) {
            await tx.ticketType.update({
              where: { id: ticket.id },
              data: {
                name: ticket.name,
                description: ticket.description,
                adultPrice: ticket.adultPrice,
                childPrice: ticket.childPrice,
                totalAdultTickets: ticket.totalAdultTickets,
                totalChildTickets: ticket.totalChildTickets,
              },
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const inventories = await tx.ticketInventory.findMany({
              where: {
                lodgeId: updated.id,
                ticketTypeId: ticket.id,
                date: { gte: today },
              },
            });

            const existing = existingTicketTypes.find(
              (t) => t.id === ticket.id
            );
            if (!existing) continue;

            const adultChanged =
              ticket.totalAdultTickets !== existing.totalAdultTickets;
            const childChanged =
              ticket.totalChildTickets !== existing.totalChildTickets;

            if (!adultChanged && !childChanged) {
              continue;
            }

            for (const inv of inventories) {
              const reservedAdult =
                existing.totalAdultTickets - inv.availableAdultTickets;
              const reservedChild =
                existing.totalChildTickets - inv.availableChildTickets;

              const newAvailableAdult = Math.max(
                ticket.totalAdultTickets - reservedAdult,
                0
              );
              const newAvailableChild = Math.max(
                ticket.totalChildTickets - reservedChild,
                0
              );

              await tx.ticketInventory.update({
                where: { id: inv.id },
                data: {
                  totalAdultTickets: ticket.totalAdultTickets,
                  totalChildTickets: ticket.totalChildTickets,
                  availableAdultTickets: newAvailableAdult,
                  availableChildTickets: newAvailableChild,
                },
              });
            }
          } else {
            const newTicket = await tx.ticketType.create({
              data: {
                lodgeId: Number(id),
                name: ticket.name,
                description: ticket.description,
                adultPrice: ticket.adultPrice,
                childPrice: ticket.childPrice,
                totalAdultTickets: ticket.totalAdultTickets,
                totalChildTickets: ticket.totalChildTickets,
              },
            });

            const today = new Date();
            const dates: Date[] = [];
            for (let i = 0; i < 365; i++) {
              const d = new Date(today);
              d.setDate(today.getDate() + i);
              dates.push(d);
            }

            await tx.ticketInventory.createMany({
              data: dates.map((date) => ({
                ticketTypeId: newTicket.id,
                date,
                totalAdultTickets: ticket.totalAdultTickets,
                totalChildTickets: ticket.totalChildTickets,
                availableAdultTickets: ticket.totalAdultTickets,
                availableChildTickets: ticket.totalChildTickets,
                lodgeId: updated.id,
              })),
            });
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
        roomTypes: updatedRoomTypes,
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
    const lodgeId = Number(id);

    const existingLodge = await prisma.hotSpringLodge.findUnique({
      where: { id: lodgeId },
    });
    if (!existingLodge) {
      return res.status(404).json({ message: "Lodge not found" });
    }

    const roomTypes = await prisma.roomType.findMany({
      where: { lodgeId: lodgeId },
    });

    const roomTypeIds = roomTypes.map((rt) => rt.id);

    const lodgeImages = await prisma.hotSpringLodgeImage.findMany({
      where: { lodgeId: lodgeId },
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
      where: { lodgeId: lodgeId },
    });

    await prisma.roomType.deleteMany({
      where: { lodgeId: lodgeId },
    });

    const ticketTypes = await prisma.ticketType.findMany({
      where: { lodgeId },
    });
    const ticketTypeIds = ticketTypes.map((tt) => tt.id);

    await prisma.ticketInventory.deleteMany({
      where: {
        OR: [{ lodgeId }, { ticketTypeId: { in: ticketTypeIds } }],
      },
    });

    await prisma.ticketType.deleteMany({
      where: { lodgeId },
    });

    await prisma.hotSpringLodgeImage.deleteMany({
      where: { lodgeId: lodgeId },
    });

    await prisma.reservation.deleteMany({
      where: { lodgeId: lodgeId },
    });

    await prisma.hotSpringLodgeBookmark.deleteMany({
      where: { lodgeId: lodgeId },
    });

    await prisma.hotSpringLodgeDetail.deleteMany({
      where: { lodgeId: lodgeId },
    });

    await prisma.hotSpringLodgeReview.deleteMany({
      where: { lodgeId: lodgeId },
    });

    const deleted = await prisma.hotSpringLodge.delete({
      where: { id: lodgeId },
    });

    res
      .status(200)
      .json({ message: "Lodge deleted successfully", lodge: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}) as RequestHandler);

router.get(
  "/:id/inventories",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lodgeId = Number(id);

    if (isNaN(lodgeId)) {
      return res.status(400).json({ message: "Invalid lodge ID" });
    }

    try {
      const roomInventories = await prisma.roomInventory.findMany({
        where: { lodgeId },
        include: {
          roomType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: "asc" },
      });

      const ticketInventories = await prisma.ticketInventory.findMany({
        where: { lodgeId },
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: "asc" },
      });

      res.json({ roomInventories, ticketInventories });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch inventories" });
    }
  })
);

export default router;
