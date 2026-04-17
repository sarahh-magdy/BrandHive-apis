import * as nodemailer from 'nodemailer';

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io", // هوست مايل تراب ثابت للـ Sandbox
    port: 2525, // بورت مايل تراب المفتوح دايماً
    auth: {
      user: process.env.EMAIL_USER, // هيقرأ الـ Username الجديد من Railway
      pass: process.env.EMAIL_PASSWORD  // هيقرأ الـ Password الجديد من Railway
    }
  });

  const mailOptions = {
    // في مايل تراب Sandbox تقدري تكتبي أي إيميل هنا كمرسل
    from: options.from || '"Brand Hive" <info@brandhive.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Mailtrap: Email sent successfully!', info.messageId);
    return info;
  } catch (error: any) {
    console.error('❌ Mailtrap Error:', error.message);
    throw error;
  }
};