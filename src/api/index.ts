import express from "express";
import authRouter from "./auth";
import adminRouter from "./admin/index";
import socialLoginRouter from "./socialLogin";
import resetPasswordRouter from "./reset-password";
import hotspringRouter from "./hotspring";
import reviewRouter from "./review";
import lodgeRouter from "./lodge";
import reservationRouter from "./reservation";
import priceRouter from "./price";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/social-login", socialLoginRouter);
router.use("/reset-password", resetPasswordRouter);
router.use("/hotspring", hotspringRouter);
router.use("/review", reviewRouter);
router.use("/lodge", lodgeRouter);
router.use("/reservation", reservationRouter);
router.use("/price", priceRouter);

export default router;
