import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.error("[EmailService] SMTP connection failed:", error);
  else console.log("[EmailService] SMTP ready");
});

const FROM = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`;

export const emailService = {
  async send(to: string, subject: string, html: string) {
    const info = await transporter.sendMail({ from: FROM, to, subject, html }); //
    return info;
  },

  async sendOtp(to: string, otp: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Your one time password</h2>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${otp}</p>
        <p>This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `;

    return this.send(to, "Your OTP Code", html);
  },

  async sendWelcome(to: string, fullName: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Welcome, ${fullName}!</h2>
        <p>Your account has been created successfully.</p>
      </div>
    `;
    return this.send(to, "Welcome!", html);
  },

  async sendNotification(to: string, subject: string, body: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <p>${body}</p>
      </div>
    `;
    return this.send(to, subject, html);
  },

  async sendAccountExists(to: string, fullName: string) {
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>Account Already Exists</h2>
    <p>Hi ${fullName},</p>
      <p>
         Someone tried to register a Swift RCMS account using this email address,
         but an account already exists for it.
       </p>
       <p>
         If that was you, <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login">sign in here</a>.
         If you forgot your password, you can reset it from the login page.
       </p>
       <p>If this wasn't you, you can safely ignore this email.</p>
       <p>— The Swift RCMS Team</p>
       </div>`;

    return this.send(to, "Account Already Exists", html);
  },
};
