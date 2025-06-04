import express from "express";
import authRouter from "./auth";
import adminRouter from "./admin/index";
import socialLoginRouter from "./socialLogin";
import resetPasswordRouter from "./reset-password";
import hotspringRouter from "./hotspring";
import reviewRouter from "./review";
import lodgeRouter from "./lodge";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/social-login", socialLoginRouter);
router.use("/reset-password", resetPasswordRouter);
router.use("/hotspring", hotspringRouter);
router.use("/review",reviewRouter);
router.use("/lodge", lodgeRouter);

export default router;
