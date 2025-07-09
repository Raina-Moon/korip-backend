import { PrismaClient } from "@prisma/client";
import express from "express";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/users", asyncHandler(async (_, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}));

router.delete("/users/:id", asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = Number(id)

  if(isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.status(200).json({ message: "User deleted successfully", user });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}));

export default router;
