import { PrismaClient } from "@prisma/client";
import axios from "axios";
import express from "express";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
    email: string;
    name?: string;
    sub: string;
}

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { provider, accessToken } = req.body;

  if (provider !== "google") {
    return res
      .status(400)
      .json({ message: "Only Google login is supported for now" });
  }

  try {
    const decode = jwtDecode<JwtPayload>(accessToken);

    const { email, name, sub } = decode;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          nickname: name || `google_user_${Math.floor(Math.random() * 1000)}`,
          password: null,
          provider: "google",
          socialId: sub,
        },
      });
    }

    const jwt = require("jsonwebtoken");

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching user info from Google" });
  }
});

export default router;
