import * as nodemailer from 'nodemailer';

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true لـ port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // تأكدي أنه App Password
    },
  });

  const mailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email Sent Successfully: %s', info.messageId);
    return info;
  } catch (error: any) {
    console.error('❌ Nodemailer Error:', error.message);
    throw error;
  }
};