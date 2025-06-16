import { PrismaClient } from "@prisma/client";
import express from "express";
import { jwtDecode } from "jwt-decode";
import { generateAccessToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";

interface JwtPayload {
  email: string;
  name?: string;
  sub: string;
}

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", asyncHandler(async (req, res) => {
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

    const token = generateAccessToken({ userId: user.id, role: user.role });

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: false, // if using HTTPS, set this to true
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching user info from Google" });
  }
}));

export default router;
