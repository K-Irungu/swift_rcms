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

const FROM = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`;

export const emailService = {
  async send(to: string, subject: string, html: string) {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log("Email sent:", info.messageId);
    return info;
  },

  async sendOtp(to: string, otp: string) {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Your verification code</h2>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${otp}</p>
        <p>This code expires in <strong>1 minute</strong>. Do not share it with anyone.</p>
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
};
