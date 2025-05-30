import express from "express";
import authRouter from "./auth";
import adminRouter from "./admin";
import socialLoginRouter from "./socialLogin";
import resetPasswordRouter from "./reset-password";
import hotspringRouter from "./hotspring";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/social-login", socialLoginRouter);
router.use("/reset-password", resetPasswordRouter);
router.use("/hotspring", hotspringRouter);

export default router;
