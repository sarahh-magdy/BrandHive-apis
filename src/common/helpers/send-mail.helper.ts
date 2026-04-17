import * as nodemailer from 'nodemailer';

export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, 
    },
  });

  return await transporter.sendMail(mailOptions);
}