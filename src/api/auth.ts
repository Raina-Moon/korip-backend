import { PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/signup", async (req, res) => {
  const { nickname, email, password } = req.body;
  if (!nickname || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await prisma.user.create({
    data: {
      nickname,
      email,
      password,
    },
  });

  res.status(201).json(user);
});
