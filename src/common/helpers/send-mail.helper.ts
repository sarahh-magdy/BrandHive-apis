import * as nodemailer from 'nodemailer';

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // تم التغيير لـ 587 ليتوافق مع سياسات الـ Hosting
    secure: false, // يجب أن تكون false عند استخدام Port 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // تأكدي أنه App Password المكون من 16 حرف
    },
    tls: {
      // لتجنب مشاكل شهادات الأمان (Certificates) على السيرفرات الخارجية
      rejectUnauthorized: false,
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
    // طباعة الخطأ بشكل مفصل في الـ Logs لمعرفة السبب الحقيقي لو فشل الإرسال
    console.error('❌ Nodemailer Error Detail:', {
      message: error.message,
      code: error.code,
      command: error.command,
    });
    throw error;
  }
};