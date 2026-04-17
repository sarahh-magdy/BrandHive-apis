// common/helpers/send-mail.helper.ts
import * as nodemailer from 'nodemailer';

export const sendMail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // أو الـ host لو بتستخدمي شركة تانية
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // الـ App Password هنا
    },
  });

  const mailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  return await transporter.sendMail(mailOptions);
};