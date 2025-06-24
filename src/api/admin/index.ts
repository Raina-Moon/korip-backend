import express from "express";
import userRouter from "./user";
import lodgeRouter from "./lodge";
import roomTypeRouter from "./roomType";
import roomInventoryRouter from "./roomInventory";
import reportsRouter from "./reports";
import reservationRouter from "./reservation";
import { authToken } from "../../middlewares/authMiddleware";
import { isAdmin } from "../../middlewares/adminMiddleware";

const router = express.Router();

router.use("/",authToken, isAdmin);

router.use("/user", userRouter);
router.use("/lodge", lodgeRouter);
router.use("/room-type", roomTypeRouter);
router.use("/room-inventory", roomInventoryRouter);
router.use("/reports",reportsRouter);
router.use("/reservation", reservationRouter);

export default router;
