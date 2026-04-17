import * as nodemailer from 'nodemailer';

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    // مهم جداً الـ await هنا
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email Sent Successfully:', info.messageId);
    return info;
  } catch (error: any) {
    console.error('❌ Nodemailer Error:', error.message);
    throw error; 
  }
};