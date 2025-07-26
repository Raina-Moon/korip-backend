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
    html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;border:1px solid #eee;box-shadow:0 2px 12px 0 rgba(0,0,0,0.04);">
        <h2 style="color:#0d172a;font-size:20px;margin-bottom:10px;">🔒 Password Reset Code</h2>
        <p style="font-size:15px;color:#333;margin-bottom:24px;">
          You requested a password reset.<br />
          Please use the code below within <b>10 minutes</b>.
        </p>
        <div style="background:#fff;border-radius:8px;padding:24px 0;margin:18px 0;border:1px dashed #94a3b8;text-align:center;">
          <span style="font-size:30px;font-family:monospace;font-weight:700;letter-spacing:5px;color:#2563eb;">${content}</span>
        </div>
        <p style="font-size:13px;color:#555;">If you didn’t request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <div style="font-size:11px;color:#888;text-align:center;">&copy; ${new Date().getFullYear()} Korips. All rights reserved.</div>
      </div>
    `;
  } else if (type === "verify-email") {
    subject = "Email Verification";
    html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;border:1px solid #eee;box-shadow:0 2px 12px 0 rgba(0,0,0,0.04);">
        <h2 style="color:#0d172a;font-size:20px;margin-bottom:10px;">📧 Verify Your Email</h2>
        <p style="font-size:15px;color:#333;margin-bottom:24px;">
          Thanks for signing up! Please confirm your email address below.
        </p>
        <a href="${content}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;margin:24px 0;">Verify Email</a>
        <p style="font-size:13px;color:#555;">If you didn’t sign up, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <div style="font-size:11px;color:#888;text-align:center;">&copy; ${new Date().getFullYear()} Korips. All rights reserved.</div>
      </div>
    `;
  }

  return mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });
};
