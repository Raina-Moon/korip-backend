import express from "express";
import userRouter from "./user";
import lodgeRouter from "./lodge";
import roomPricingRouter from "./roomPricing";
import roomTypeRouter from "./roomType";
import roomInventoryRouter from "./roomInventory";
import { authToken } from "../../middlewares/authMiddleware";
import { isAdmin } from "../../middlewares/adminMiddleware";

const router = express.Router();

router.use(authToken, isAdmin);

router.use("/user", userRouter);
router.use("/lodge", lodgeRouter);
router.use("/room-pricing",roomPricingRouter);
router.use("/room-type", roomTypeRouter);
router.use("/room-inventory", roomInventoryRouter);

export default router;
