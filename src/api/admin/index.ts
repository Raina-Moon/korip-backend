import express from "express";
import userRouter from "./user";
import lodgeRouter from "./lodge";
import { authToken } from "../../middlewares/authMiddleware";
import { isAdmin } from "../../middlewares/adminMiddleware";

const router = express.Router();

router.use(authToken, isAdmin);

router.use("/user", userRouter);
router.use("/lodge", lodgeRouter);

export default router;
