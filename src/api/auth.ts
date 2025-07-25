import { PrismaClient } from "@prisma/client";
import express, { Request, RequestHandler, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRequest, authToken } from "../middlewares/authMiddleware";
import { sendEmail } from "../utils/mailer";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { differenceInSeconds } from "date-fns";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/signup",
  asyncHandler(async (req: Request, res: Response) => {
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

      const emailVerification = await prisma.emailVerification.findUnique({
        where: { email },
      });

      if (!emailVerification) {
        return res
          .status(404)
          .json({
            message:
              "Email verification not found. Please request verification again.",
          });
      }

      if (!emailVerification.verified) {
        return res.status(403).json({ message: "Email not verified" });
      }

      if (existingUser) {
        if (existingUser.nickname === "" && !existingUser.password) {
          const hashedPwd = await bcrypt.hash(password, 10);
          const updatedUser = await prisma.user.update({
            where: { email },
            data: {
              nickname,
              password: hashedPwd,
              isVerified: true,
            },
          });

          return res.status(200).json({
            id: updatedUser.id,
            nickname: updatedUser.nickname,
            email: updatedUser.email,
            createdAt: updatedUser.createdAt,
            role: updatedUser.role,
          });
        }

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
          role: "USER", // Default role for new users
          isVerified: true,
        },
      });

      return res.status(201).json({
        id: newUser.id,
        nickname: newUser.nickname,
        email: newUser.email,
        createdAt: newUser.createdAt,
        role: newUser.role,
      });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.get(
  "/verify-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as {
        email: string;
        locale: string;
      };

      const { email, locale } = decoded;

      await prisma.emailVerification.update({
        where: { email },
        data: { verified: true },
      });
      res.redirect(
        `${process.env.FRONTEND_URL}/${locale}/signup/email-verified?email=${email}`
      );
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
  })
);

router.post(
  "/request-verify",
  asyncHandler(async (req, res) => {
    const { email, locale } = req.body;

    if (!email || !locale) {
      return res.status(400).json({ message: "Email and locale are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (
      existingUser &&
      (existingUser.nickname !== "" || existingUser.password !== null)
    ) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const existingVerification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    const now = new Date();
    if (
      existingVerification &&
      !existingVerification.verified &&
      differenceInSeconds(now, existingVerification.createdAt) < 15 * 60
    ) {
      return res.status(429).json({
        message: "You already requested verification. Please check your email.",
      });
    }

    try {
      const token = jwt.sign({ email, locale }, process.env.JWT_SECRET!, {
        expiresIn: "15m",
      });
      const verifyUrl = `${process.env.FRONTEND_URL}/${locale}/signup/email-verified?token=${token}`;

      await sendEmail({ email, type: "verify-email", content: verifyUrl });

      await prisma.emailVerification.upsert({
        where: { email },
        update: { verified: false },
        create: {
          email,
          verified: false,
          user: {
            create: {
              email,
              nickname: "",
              password: null,
              provider: null,
              socialId: null,
            },
          },
        },
      });

      res.json({ message: "Verification email sent successfully" });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.delete(
  "/:id",
  authToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userFromToken = req.user!.userId;

    if (userFromToken !== Number(id)) {
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
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.password) {
        return res.status(401).json({ message: "Invalid password" });
      }
      const isPwdValid = await bcrypt.compare(password, user.password);

      if (!isPwdValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const accessToken = generateAccessToken({
        userId: user.id,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({ userId: user.id });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      return res.status(200).json({
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken) as { userId: number };
      const newAccessToken = generateAccessToken({
        userId: decoded.userId,
        role: "USER",
      });
      return res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.get(
  "/me",
  authToken,
  asyncHandler(async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          createdAt: true,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json(user);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
