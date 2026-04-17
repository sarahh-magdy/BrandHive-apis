import * as nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"BrandHive" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export function otpEmailTemplate(otp: string, type: 'verify' | 'reset' = 'verify'): string {
  const title = type === 'verify' ? 'Verify Your Email' : 'Reset Your Password';
  const message =
    type === 'verify'
      ? 'Use the OTP below to verify your email address. It expires in 10 minutes.'
      : 'Use the OTP below to reset your password. It expires in 10 minutes.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #333;">${title}</h2>
      <p style="color: #555;">${message}</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 6px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #222;">
        ${otp}
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 20px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
}