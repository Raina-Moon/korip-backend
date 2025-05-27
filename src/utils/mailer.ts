import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface SendEmailOptions {
  email: string;
  type: "reset-password" | "verify-email";
  content: string;
}

export const sendEmail = async ({ email, type, content }: SendEmailOptions) => {
  let subject = "";
  let html = "";
  if (type === "reset-password") {
    subject = "Password Reset Request";
    html = `<p>You requested a password reset. Here's your password reset code:</p>
    <h2>${content}</h2>
    <p>This code will expire in 10 minutes.</p>`;
  } else if (type === "verify-email") {
    subject = "Email Verification";
    html = `<p>Thank you for registering. Please verify your email address by clicking the link below:</p>
    <a href="${content}">Verify Email</a>
    <p>If you did not register, please ignore this email.</p>`;
  }

  return mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });
};
