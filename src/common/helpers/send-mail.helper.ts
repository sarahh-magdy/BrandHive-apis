import * as nodemailer from 'nodemailer';

export async function sendMail(mailOptions: nodemailer.SendMailOptions) {
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',  
    port: 587,               
    secure: false,          
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});
        await transporter.sendMail(mailOptions);
    }