import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (email: string, verifyUrl: string) => {
  const html = `
    <p>Click the button below to verify your email:</p>
    <a href="${verifyUrl}" style="padding:10px;background:#4CAF50;color:white;text-decoration:none;">
      Verify Email
    </a>
    `;

  return mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification",
    html: html,
  });
};
