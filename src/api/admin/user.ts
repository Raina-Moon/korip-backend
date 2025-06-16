import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest, authToken } from "../../middlewares/authMiddleware";
import { isAdmin } from "../../middlewares/adminMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/users", asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.delete("/users/:id", asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, nickname: true, email: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    return res.status(200).json({ message: "User deleted successfully", user });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}));

export default router;
