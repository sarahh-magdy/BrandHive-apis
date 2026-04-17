import * as nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASSWORD!,
  },
  family: 4,
  tls: {
    rejectUnauthorized: false,
  },
} as nodemailer.TransportOptions); // 👈 الحل هنا

export async function sendMail(options: MailOptions): Promise<void> {
  console.log('📨 Trying to send email...');

  try {
    const info = await transporter.sendMail({
      from: `"BrandHive" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('✅ Email sent:', info.response);
  } catch (error) {
    console.error('❌ Email FULL ERROR:', error);
    throw error;
  }
}
export function otpEmailTemplate(
  otp: string,
  type: 'verify' | 'reset' = 'verify',
): string {
  const title =
    type === 'verify' ? 'Verify Your Email' : 'Reset Your Password';

  const message =
    type === 'verify'
      ? 'Use the OTP below to verify your email address. It expires in 10 minutes.'
      : 'Use the OTP below to reset your password. It expires in 10 minutes.';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px;">
      <h2>${title}</h2>
      <p>${message}</p>
      <h1 style="letter-spacing: 8px;">${otp}</h1>
    </div>
  `;
}