import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log('EMAIL SENT ✅');
  } catch (err) {
    console.error('EMAIL ERROR ❌', err);
  }
}