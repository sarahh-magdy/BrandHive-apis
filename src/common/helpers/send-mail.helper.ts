import * as nodemailer from 'nodemailer';

export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.verify(); // مهم جدًا للتأكد من الاتصال

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log('EMAIL ERROR:', error);
  }
}