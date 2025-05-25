import { PrismaClient } from "@prisma/client";
import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/signup", async (req, res) => {
  const { nickname, email, password } = req.body;
  if (!nickname || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ nickname }, { email }],
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this nickname or email already exists" });
    }

    const hashedPwd = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nickname,
        email,
        password: hashedPwd,
      },
    });

    return res.status(201).json({
      id: newUser.id,
      nickname: newUser.nickname,
      email: newUser.email,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(403).json({ message: "User ID is required" });
  }

  try {
    await prisma.user.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
