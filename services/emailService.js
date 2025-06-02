const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify transporter connection
const verifyTransporter = async () => {
    try {
        await transporter.verify();
        return true;
    } catch (error) {
        return false;
    }
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate password reset token
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Send verification email with code
const sendVerificationEmail = async (user, verificationCode) => {
    try {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Verify Your Email - Barter Trading System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333; text-align: center;">Email Verification</h1>
                <p>Hello ${user.firstName},</p>
                <p>Your email verification code is:</p>
                <div style="
                    background-color: #f4f4f4;
                    padding: 20px;
                    text-align: center;
                    font-size: 32px;
                    letter-spacing: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                    color: #333;">
                    ${verificationCode}
                </div>
                <p>Enter this code in the verification window to verify your email address.</p>
                <p>This code will expire in 10 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
            </div>
        `
    };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new Error('Failed to send verification email');
    }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
    try {
        const baseUrl = 'http://localhost:3000';
        const resetUrl = `${baseUrl}/users/reset-password/${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request - Barter Trading System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
                    <p>Hello ${user.firstName},</p>
                    <p>You have requested to reset your password. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="
                            background-color: #4CAF50;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <p>For security reasons, this link can only be used once.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new Error('Failed to send password reset email');
    }
};

// Send trade notification email
const sendTradeNotificationEmail = async (user, trade, type) => {
    try {
        const baseUrl = 'http://localhost:3000';
        let subject, content;
        switch (type) {
            case 'proposal':
                subject = 'New Trade Proposal';
                content = `
                    <p>Hello ${user.firstName},</p>
                    <p>You have received a new trade proposal. Click the button below to view the details:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/trades/${trade._id}" style="
                            background-color: #4CAF50;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;">
                            View Trade Proposal
                        </a>
                    </div>
                `;
                break;
            case 'status':
                subject = 'Trade Status Update';
                content = `
                    <p>Hello ${user.firstName},</p>
                    <p>The status of your trade has been updated to: <strong>${trade.status}</strong></p>
                    <p>Click the button below to view the trade details:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/trades/${trade._id}" style="
                            background-color: #4CAF50;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;">
                            View Trade Details
                        </a>
                    </div>
                `;
                break;
            case 'message':
                subject = 'New Trade Message';
                content = `
                    <p>Hello ${user.firstName},</p>
                    <p>You have received a new message in your trade. Click the button below to view the message:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/trades/${trade._id}" style="
                            background-color: #4CAF50;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;">
                            View Message
                        </a>
                    </div>
                `;
                break;
            default:
                throw new Error('Invalid notification type');
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `${subject} - Barter Trading System`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">${subject}</h1>
                    ${content}
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new Error('Failed to send trade notification email');
    }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
    try {
        const baseUrl = 'http://localhost:3000';
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Welcome to Barter Trading System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Welcome to Barter Trading System!</h1>
                    <p>Hello ${user.firstName},</p>
                    <p>Thank you for registering with us. We're excited to have you on board!</p>
                    <p>To get started:</p>
                    <ol>
                        <li>Complete your profile</li>
                        <li>Add items you want to trade</li>
                        <li>Browse items from other users</li>
                        <li>Start trading!</li>
                    </ol>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/dashboard" style="
                            background-color: #4CAF50;
                            color: white;
                            padding: 12px 24px;
                            text-decoration: none;
                            border-radius: 4px;
                            display: inline-block;">
                            Go to Dashboard
                        </a>
                    </div>
                    <p>If you have any questions, feel free to contact our support team.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new Error('Failed to send welcome email');
    }
};

module.exports = {
    verifyTransporter,
    generateVerificationCode,
    generateResetToken,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendTradeNotificationEmail,
    sendWelcomeEmail
}; 