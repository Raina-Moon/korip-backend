import { CancelReason, PrismaClient, ReservationStatus } from "@prisma/client";
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findMany({
      include: {
        lodge: true,
        roomType: true,
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(reservation);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        lodge: true,
        roomType: true,
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
    });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.status(200).json(reservation);
  })
);

router.patch(
  "/:id/confirm",
  asyncHandler(async (req, res) => {
    const { status, cancelReason } = req.body;
    if (!Object.values(ReservationStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await prisma.reservation.update({
      where: { id: Number(req.params.id) },
      data: {
        status,
        cancelReason:
          status === "CANCELED"
            ? (cancelReason as CancelReason) || CancelReason.ADMIN_FORCED
            : null,
      },
    });
    res.status(200).json(updated);
  })
);

export default router;
