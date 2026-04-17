import * as nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // مهم مع 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// 📧 Send Mail Function
export async function sendMail(options: MailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"BrandHive" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('📧 Email sent successfully to:', options.to);
  } catch (error) {
    console.error('❌ Email sending failed:', error?.message || error);
    throw error;
  }
}

// ✉️ OTP Email Template
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
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color:#333;">${title}</h2>
      <p style="color:#555;">${message}</p>

      <div style="
        margin: 20px 0;
        padding: 15px;
        background: #f4f4f4;
        text-align: center;
        font-size: 30px;
        letter-spacing: 8px;
        font-weight: bold;
      ">
        ${otp}
      </div>

      <p style="color:#999; font-size:12px;">
        If you did not request this, ignore this email.
      </p>
    </div>
  `;
}