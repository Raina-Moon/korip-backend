import express from "express";
import authRouter from "./auth";
import adminRouter from "./admin";
import socialLoginRouter from "./socialLogin";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/social-login", socialLoginRouter);

export default router;
