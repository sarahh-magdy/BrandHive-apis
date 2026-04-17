import * as nodemailer from 'nodemailer';

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASSWORD // تأكدي إن الاسم ده هو نفسه اللي في Railway
    }
  });

  const mailOptions = {
    from: options.from || '"Brand Hive" <info@brandhive.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Mailtrap success:', info.messageId);
    return info;
  } catch (error: any) {
    console.error('❌ Mailtrap Error:', error.message);
    throw error;
  }
};