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
    const { email, locale } = req.body;

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

      await sendEmail({ email, type: "reset-password", content: code, locale });
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

    let latestCodeEntry;
    try {
      latestCodeEntry = await prisma.passwordResetCode.findFirst({
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
    } catch (err) {
      console.error("❌ Failed to fetch reset code entry:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!latestCodeEntry) {
      return res.status(400).json({
        message: "Invalid or expired reset code",
        remainingAttempts: 5,
      });
    }

    if (latestCodeEntry.attempts >= 5) {
      return res.status(429).json({
        message: "Too many attempts. Please request a new code.",
        remainingAttempts: 0,
      });
    }

    if (String(latestCodeEntry.code) !== String(code)) {
      let updated;
      try {
        updated = await prisma.passwordResetCode.update({
          where: { id: latestCodeEntry.id },
          data: {
            attempts: { increment: 1 },
          },
        });
      } catch (err) {
        console.error("❌ Failed to update attempts:", err);
        return res
          .status(500)
          .json({ message: "Failed to update code attempt count" });
      }

      if (!updated) {
        return res
          .status(500)
          .json({ message: "Failed to update code attempt count" });
      }

      return res.status(400).json({
        message: "Invalid code. Please try again.",
        remainingAttempts: 5 - updated.attempts,
      });
    }

    try {
      await prisma.passwordResetCode.deleteMany({
        where: { id: latestCodeEntry.id },
      });
    } catch (err) {
      console.error("❌ Failed to delete used reset code:", err);
      return res.status(500).json({ message: "Failed to clear reset code" });
    }

    return res.status(200).json({ message: "Reset code is valid" });
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
