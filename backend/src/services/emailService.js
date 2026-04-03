const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.lookupaitech.com', // fallback if standard
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendWelcomeEmail = async (toEmail, fullName, password) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Voice AI Trainer" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Welcome to Voice AI Training Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">Welcome, ${fullName}!</h2>
          <p>Your company administrator has created an account for you on the Voice AI Sales Training Portal.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Your Login Credentials:</strong></p>
            <p><strong>URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">${process.env.FRONTEND_URL || 'http://localhost:3000'}</a></p>
            <p><strong>Email:</strong> ${toEmail}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          
          <p>We recommend changing your password after your first login.</p>
          <p>Best regards,<br>The Voice AI Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail} [MessageId: ${info.messageId}]`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // We do not throw the error to prevent stopping the user creation flow
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
};
