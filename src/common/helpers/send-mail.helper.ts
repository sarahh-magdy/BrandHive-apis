import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  console.log('📨 Sending email via SendGrid...');

  try {
    await sgMail.send({
      to: options.to,
      from: process.env.EMAIL_USER!, // لازم يتعمله verify
      subject: options.subject,
      html: options.html,
    });

    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ SendGrid error:', error.response?.body || error);
    throw error;
  }
}

// template زي ما هو
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
    <div style="font-family: Arial; max-width: 500px; margin: auto;">
      <h2>${title}</h2>
      <p>${message}</p>
      <h1 style="letter-spacing: 8px;">${otp}</h1>
    </div>
  `;
}