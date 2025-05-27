import { PrismaClient } from "@prisma/client";
import express from "express";
import { generateResetCode } from "../utils/generateResetCode";
import { sendEmail } from "../utils/mailer";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { email } = req.body();

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
        code: code,
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({ email, type: "reset-password", content: code });
    return res.status(200).json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
