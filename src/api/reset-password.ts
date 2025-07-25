import { PrismaClient } from "@prisma/client";
import express from "express";
import { generateResetCode } from "../utils/generateResetCode";
import { sendEmail } from "../utils/mailer";
import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();
const prisma = new PrismaClient();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const code = generateResetCode();

      await prisma.passwordResetCode.create({
        data: {
          email,
          code,
          expiredAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await sendEmail({ email, type: "reset-password", content: code });
      return res.status(200).json({ message: "Reset code sent to your email" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    try {
      const latestCodeEntry = await prisma.passwordResetCode.findFirst({
        where: {
          email,
          expiredAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!latestCodeEntry) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset code" });
      }

      if (latestCodeEntry.attempts >= 5) {
        return res
          .status(429)
          .json({ message: "Too many attempts. Please request a new code." });
      }

      if (String(latestCodeEntry.code) !== String(code)) {
        const updated = await prisma.passwordResetCode.update({
          where: { id: latestCodeEntry.id },
          data: {
            attempts: { increment: 1 },
          },
        });

        return res.status(400).json({
          message: "Invalid code. Please try again.",
          remainingAttempts: 5 - updated.attempts,
        });
      }

      await prisma.passwordResetCode.deleteMany({
        where: { id: latestCodeEntry.id },
      });

      return res.status(200).json({ message: "Reset code is valid" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

router.post(
  "/update",
  asyncHandler(async (req, res) => {
    const { email, newPassword } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      return res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  })
);

export default router;
