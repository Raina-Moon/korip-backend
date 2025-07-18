import express from "express";
import userRouter from "./user";
import lodgeRouter from "./lodge";
import roomTypeRouter from "./roomType";
import roomInventoryRouter from "./roomInventory";
import reportsRouter from "./reports";
import reservationRouter from "./reservation";
import { authToken } from "../../middlewares/authMiddleware";
import { isAdmin } from "../../middlewares/adminMiddleware";
import ticketReportsRouter from "./ticket-reports";
import ticketReservationRouter from "./ticketReservation";

const router = express.Router();

router.use("/",authToken, isAdmin);

router.use("/user", userRouter);
router.use("/lodge", lodgeRouter);
router.use("/room-type", roomTypeRouter);
router.use("/room-inventory", roomInventoryRouter);
router.use("/reports",reportsRouter);
router.use("/reservation", reservationRouter);
router.use("/ticket-reports", ticketReportsRouter);
router.use("/ticket-reservation", ticketReservationRouter);

export default router;
