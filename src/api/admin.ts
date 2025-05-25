import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { isAdmin } from "../middlewares/adminMiddleware";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/users", authToken, isAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
