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

  const outerStyle = [
    "max-width:480px",
    "margin:32px auto",
    "padding:40px 28px 32px 28px",
    "background:#f7fafc",
    "border-radius:20px",
    "border:1.5px solid #e2e8f0",
    "box-shadow:0 8px 32px 0 rgba(24,41,66,0.11)",
    "font-family:'Segoe UI',Arial,sans-serif",
  ].join(";");
  const logoStyle = [
    "display:block",
    "margin:0 auto 20px auto",
    "width:70px",
    "height:70px",
    "border-radius:18px",
    "box-shadow:0 2px 12px 0 rgba(0,0,0,0.05)",
    "object-fit:contain",
  ].join(";");
  const titleStyle = [
    "color:#172554",
    "font-size:25px",
    "margin-bottom:10px",
    "text-align:center",
    "font-weight:700",
  ].join(";");
  const hrStyle = [
    "border:none",
    "border-top:1.5px solid #e2e8f0",
    "margin:30px 0 14px 0",
  ].join(";");
  const footerStyle = [
    "font-size:12px",
    "color:#a0aec0",
    "text-align:center",
    "margin-top:14px",
  ].join(";");
  const codeBoxStyle = [
    "background:#fff",
    "border-radius:13px",
    "padding:28px 0",
    "margin:30px 0 28px 0",
    "border:2px dashed #2563eb",
    "text-align:center",
    "box-shadow:0 2px 12px 0 rgba(37,99,235,0.07)",
  ].join(";");
  const codeStyle = [
    "font-size:38px",
    "font-family:monospace",
    "font-weight:700",
    "letter-spacing:10px",
    "color:#2563eb",
  ].join(";");
  const btnStyle = [
    "display:inline-block",
    "padding:13px 32px",
    "background:#2563eb",
    "color:#fff",
    "border-radius:7px",
    "text-align:center",
    "text-decoration:none",
    "font-weight:700",
    "font-size:17px",
    "box-shadow:0 2px 10px rgba(37,99,235,0.13)",
    "white-space:nowrap",
  ].join(";");

  const logoImg = `<img src="https://res.cloudinary.com/dqghdryuh/image/upload/v1753522157/koripLogo_go0ssz.png" style="${logoStyle}" alt="Korips Logo" />`;

  if (type === "reset-password") {
    subject = "Password Reset Request";
    html = `
      <div style="${outerStyle}">
        ${logoImg}
        <div style="${titleStyle}">🔒 Password Reset Code</div>
        <p style="font-size:17px;color:#222;margin-bottom:23px;text-align:center;">
          You requested a password reset.<br />
          Please enter the code below within <b>10 minutes</b>.
        </p>
        <div style="${codeBoxStyle}">
          <span style="${codeStyle}">${content}</span>
        </div>
        <p style="font-size:13px;color:#888;text-align:center;margin-bottom:0;">
          If you didn’t request this, you can safely ignore this email.
        </p>
        <hr style="${hrStyle}">
        <div style="${footerStyle}">&copy; ${new Date().getFullYear()} Korips. All rights reserved.</div>
      </div>
    `;
  } else if (type === "verify-email") {
    subject = "Email Verification";
    html = `
  <div style="${outerStyle}">
    ${logoImg}
    <div style="${titleStyle}">📧 Verify Your Email</div>
    <p style="font-size:17px;color:#222;margin-bottom:28px;text-align:center;">
      Thanks for signing up! Please confirm your email address by clicking below.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${content}" style="${btnStyle}" target="_blank" rel="noopener">
        Verify Email
      </a>
    </div>
    <p style="font-size:13px;color:#888;text-align:center;margin:20px 0 0 0;">
      If you didn’t sign up, you can safely ignore this email.
    </p>
    <hr style="${hrStyle}">
    <div style="${footerStyle}">&copy; ${new Date().getFullYear()} Korips. All rights reserved.</div>
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
