import { CancelReason, PrismaClient, ReservationStatus } from "@prisma/client";
import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { startOfDay, addDays } from "date-fns";

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reservations, total] = await prisma.$transaction([
      prisma.ticketReservation.findMany({
        include: {
          ticketType: true,
          user: {
            select: {
              id: true,
              nickname: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ticketReservation.count(),
    ]);

    res.status(200).json({ data: reservations, total, page, limit });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const reservation = await prisma.ticketReservation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        ticketType: true,
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
  "/:id",
  asyncHandler(async (req, res) => {
    const { status, cancelReason } = req.body;
    const reservationId = Number(req.params.id);

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!Object.values(ReservationStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.ticketReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new Error("Reservation not found");
      }

      const previousStatus = reservation.status;

      const newReservation = await tx.ticketReservation.update({
        where: { id: reservationId },
        data: {
          status,
          cancelReason:
            status === ReservationStatus.CANCELLED
              ? (cancelReason as CancelReason) || CancelReason.ADMIN_FORCED
              : null,
        },
      });

      if (
        previousStatus === ReservationStatus.CONFIRMED &&
        newReservation.status === ReservationStatus.CANCELLED &&
        (newReservation.cancelReason === CancelReason.USER_REQUESTED ||
          newReservation.cancelReason === CancelReason.ADMIN_FORCED)
      ) {
        await tx.ticketInventory.updateMany({
          where: {
            lodgeId: reservation.ticketTypeId
              ? (await tx.ticketType.findUnique({
                  where: { id: reservation.ticketTypeId },
                }))?.lodgeId
              : undefined,
            ticketTypeId: reservation.ticketTypeId,
            date: {
              gte: startOfDay(reservation.date),
              lt: startOfDay(addDays(reservation.date, 1)),
            },
          },
          data: {
            availableAdultTickets: {
              increment: reservation.adults,
            },
            availableChildTickets: {
              increment: reservation.children,
            },
          },
        });
      }

      return newReservation;
    });

    res.status(200).json(updated);
  })
);

export default router;
