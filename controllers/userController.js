const userService = require('../services/userService');
const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { generateVerificationCode, generateResetToken, sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// Web routes handlers
exports.getLoginPage = (req, res) => {
    res.render('users/login', {
        title: 'Login',
        currentPage: 'login'
    });
};

exports.getRegisterPage = (req, res) => {
    res.render('users/register', {
        title: 'Register',
        currentPage: 'register',
        formData: {}
    });
};

exports.getEmailVerificationPage = (req, res) => {
    res.render('users/verify-email', {
        title: 'Verify Email',
        currentPage: 'verify-email',
        user: req.user
    });
};

exports.getForgotPasswordPage = (req, res) => {
    res.render('users/forgot-password', {
        title: 'Forgot Password',
        currentPage: 'forgot-password'
    });
};

exports.getResetPasswordPage = async (req, res) => {
    try {
        const token = req.params.token;
        const now = new Date();
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: now }
        });

        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired');
            return res.redirect('/users/forgot-password');
        }

        res.render('users/reset-password', {
            title: 'Reset Password',
            currentPage: 'reset-password',
            token: token
        });
    } catch (err) {
        console.error('Error in getResetPasswordPage:', err);
        req.flash('error_msg', 'Error processing password reset request');
        res.redirect('/users/forgot-password');
    }
};

// Authentication handlers
exports.login = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
};

exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, terms } = req.body;
        let errors = [];

        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            errors.push('Please fill in all required fields');
        }

        if (!terms) {
            errors.push('You must accept the Terms of Service and Privacy Policy');
        }

        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push('Please enter a valid email address');
        }

        if (errors.length > 0) {
            errors.forEach(error => req.flash('error_msg', error));
            return res.redirect('/users/register');
        }

        // Check if email exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            req.flash('error_msg', 'Email is already registered');
            return res.redirect('/users/register');
        }

        // Create user
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password
        });

        await newUser.save();
        
        req.flash('success_msg', 'You are now registered! Please verify your email to access all features.');
        res.redirect('/users/login');
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error_msg', 'An error occurred during registration');
        res.redirect('/users/register');
    }
};

exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success_msg', 'You have been logged out');
        res.redirect('/');
    });
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.render('users/profile', {
            title: 'Edit Profile',
            user
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/dashboard');
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { 
            firstName, lastName, email, phone, bio, location, website,
            currentPassword, newPassword, confirmNewPassword 
        } = req.body;

        // Get current user
        const user = await User.findById(req.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/users/profile');
        }
        
        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                req.flash('error_msg', 'Email is already registered');
                return res.redirect('/users/profile');
            }
            user.email = email.toLowerCase();
        }

        // Handle password change if requested
        if (currentPassword && newPassword) {
            // Validate current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                req.flash('error_msg', 'Current password is incorrect');
                return res.redirect('/users/profile');
            }

            // Validate new password
            if (newPassword !== confirmNewPassword) {
                req.flash('error_msg', 'New passwords do not match');
                return res.redirect('/users/profile');
            }

            // Validate password complexity
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                req.flash('error_msg', 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character');
                return res.redirect('/users/profile');
            }

            // Set new password - let the pre-save hook handle hashing
            user.password = newPassword;
        }

        // Handle profile picture upload
        if (req.file) {
            // Validate file size (1MB limit)
            if (req.file.size > 1000000) {
                req.flash('error_msg', 'Profile picture must be less than 1MB');
                return res.redirect('/users/profile');
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                req.flash('error_msg', 'Only JPG, PNG, and GIF files are allowed');
                return res.redirect('/users/profile');
            }

            // Delete old profile picture if it exists and isn't the default
            if (user.profilePicture && user.profilePicture !== 'default-profile.png') {
                try {
                    await fs.unlink(path.join(__dirname, '../public/uploads/profiles/', user.profilePicture));
                } catch (err) {
                    console.error('Error deleting old profile picture:', err);
                }
            }
            user.profilePicture = req.file.filename;
        }

        // Update user data
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (website) user.website = website;

        // Save all changes at once
        try {
            await user.save();
            req.flash('success_msg', 'Profile updated successfully');
            res.redirect('/users/profile');
        } catch (err) {
            console.error('Error updating profile:', err);
            req.flash('error_msg', 'Error updating profile');
            res.redirect('/users/profile');
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        req.flash('error_msg', 'Failed to update profile');
        res.redirect('/users/profile');
    }
};

// Get user's items
exports.getUserItems = async (req, res) => {
    try {
        const items = await userService.getUserItemsService(req.user.id);
        res.render('items/my-items', { items });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Get user's trades
exports.getUserTrades = async (req, res) => {
    try {
        const trades = await userService.getUserTradesService(req.user.id);
        res.render('trades/my-trades', { trades });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
    try {
        // Get user to delete their profile picture
        const user = await User.findById(req.user.id);
        
        // Delete profile picture if it exists and isn't the default
        if (user.profilePicture && user.profilePicture !== 'default-profile.png') {
            try {
                await fs.unlink(path.join(__dirname, '../public/uploads/profiles/', user.profilePicture));
            } catch (err) {
                console.error('Error deleting profile picture:', err);
            }
        }

        await userService.deleteAccountService(req.user.id);
        req.logout((err) => {
            if (err) {
                console.error('Error logging out:', err);
            }
            req.flash('success_msg', 'Your account has been deleted');
            res.redirect('/');
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting account');
        res.redirect('/users/profile');
    }
};

// Send verification email
exports.sendVerificationEmail = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.json({ 
                status: 'error',
                message: 'User not found'
            });
        }
        
        if (user.isEmailVerified) {
            return res.json({ 
                status: 'error',
                message: 'Your email is already verified'
            });
        }

        // Generate new verification code
        const code = generateVerificationCode();
        const codeExpiry = new Date();
        codeExpiry.setMinutes(codeExpiry.getMinutes() + 10); // Code expires in 10 minutes

        // Save code to user
        user.verificationCode = code;
        user.verificationCodeExpires = codeExpiry;
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(user, code);

        res.json({
            status: 'success',
            message: 'Verification code sent. Please check your email.'
        });
    } catch (err) {
        console.error('Error in sendVerificationEmail:', err);
        res.json({
            status: 'error',
            message: 'Error sending verification code'
        });
    }
};

// Verify email with code
exports.verifyEmailWithCode = async (req, res) => {
    try {
        const { code } = req.body;
        
        // Find user with matching code that hasn't expired
        const user = await User.findOne({
            _id: req.user.id,
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.json({
                status: 'error',
                message: 'Invalid or expired verification code'
            });
        }

        // Update user verification status
        user.isEmailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: 'Email verified successfully!'
        });
    } catch (err) {
        console.error('Error verifying email:', err);
        res.json({
            status: 'error',
            message: 'Error verifying email'
        });
    }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            req.flash('error_msg', 'No account found with that email address');
            return res.redirect('/users/forgot-password');
        }

        // Generate reset token
        const resetToken = generateResetToken();
        
        // Set expiration to 5 minutes from current time
        const now = new Date();
        const expiryTime = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes in milliseconds
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = expiryTime;
        await user.save();

        // Send reset email
        await sendPasswordResetEmail(user, resetToken);

        req.flash('success_msg', 'Password reset instructions have been sent to your email');
        res.redirect('/users/login');
    } catch (err) {
        console.error('Error requesting password reset:', err);
        req.flash('error_msg', 'Error processing password reset request');
        res.redirect('/users/forgot-password');
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const token = req.params.token;
        const { password, confirmPassword } = req.body;
        const now = new Date();

        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: now }
        });

        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired');
            return res.redirect('/users/forgot-password');
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('back');
        }

        // Validate password complexity
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            req.flash('error_msg', 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character');
            return res.redirect('back');
        }

        // Update password and clear reset token
        user.password = password; // Let the pre-save hook handle hashing
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.flash('success_msg', 'Your password has been reset successfully');
        res.redirect('/users/login');
    } catch (err) {
        console.error('Error resetting password:', err);
        req.flash('error_msg', 'Failed to reset password');
        res.redirect('/users/forgot-password');
    }
};

// API handlers
exports.loginAPI = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = user.generateAuthToken();

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified
                }
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
};

exports.registerAPI = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields'
            });
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide a valid email address'
            });
        }

        // Check password complexity
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                status: 'error',
                message: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
            });
        }

        // Check if email exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Email is already registered'
            });
        }

        // Create user
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password
        });

        await newUser.save();

        // Generate JWT token
        const token = newUser.generateAuthToken();

        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            data: {
                token,
                user: {
                    id: newUser._id,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    email: newUser.email,
                    isEmailVerified: newUser.isEmailVerified
                }
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
};

exports.logoutAPI = (req, res) => {
    res.json({
        status: 'success',
        message: 'Logged out successfully'
    });
};

exports.getProfileAPI = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({
            status: 'success',
            data: user
        });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch profile'
        });
    }
};

exports.updateProfileAPI = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, bio, location, website, currentPassword, newPassword, confirmNewPassword } = req.body;
        const updateData = {};
        
        // Get current user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Handle password change if requested
        if (currentPassword && newPassword) {
            // Validate current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Current password is incorrect'
                });
            }

            // Validate new password
            if (newPassword !== confirmNewPassword) {
                return res.status(400).json({
                    status: 'error',
                    message: 'New passwords do not match'
                });
            }

            // Validate password complexity
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
                });
            }

            // Set new password - let the pre-save hook handle hashing
            user.password = newPassword;
        }

        // Update other profile fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already registered'
                });
            }
            user.email = email.toLowerCase();
        }
        if (phone) user.phone = phone;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (website) user.website = website;

        // Save all changes
        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(user._id).select('-password');

        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update profile'
        });
    }
};

exports.getUserItemsAPI = async (req, res) => {
    try {
        const items = await userService.getUserItemsService(req.user.id);
        res.json({
            status: 'success',
            data: items
        });
    } catch (err) {
        console.error('Error fetching user items:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user items'
        });
    }
};

exports.getUserTradesAPI = async (req, res) => {
    try {
        const trades = await userService.getUserTradesService(req.user.id);
        res.json({
            status: 'success',
            data: trades
        });
    } catch (err) {
        console.error('Error fetching user trades:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user trades'
        });
    }
};

exports.sendVerificationEmailAPI = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (user.isEmailVerified) {
            return res.status(400).json({
                status: 'error',
                message: 'Your email is already verified'
            });
        }

        const code = generateVerificationCode();
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        
        await sendVerificationEmail(user, code);

        res.json({
            status: 'success',
            message: 'Verification code sent. Please check your email.'
        });
    } catch (err) {
        console.error('Error sending verification email:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send verification code'
        });
    }
};

exports.verifyEmailWithCodeAPI = async (req, res) => {
    try {
        const { code } = req.body;
        
        const user = await User.findOne({
            _id: req.user.id,
            verificationCode: code,
            verificationCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid or expired verification code'
            });
        }

        user.isEmailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: 'Email verified successfully!'
        });
    } catch (err) {
        console.error('Error verifying email:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify email'
        });
    }
};

exports.requestPasswordResetAPI = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'No account found with that email address'
            });
        }

        const resetToken = generateResetToken();
        const now = new Date();
        const expiryTime = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes in milliseconds
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = expiryTime;
        await user.save();

        await sendPasswordResetEmail(user, resetToken);

        res.json({
            status: 'success',
            message: 'Password reset instructions have been sent to your email'
        });
    } catch (err) {
        console.error('Error requesting password reset:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process password reset request'
        });
    }
};

exports.resetPasswordAPI = async (req, res) => {
    try {
        const token = req.params.token;
        const { password } = req.body;
        const now = new Date();

        const user = await User.findOne({
            resetPasswordToken: token
        });

        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Password reset token is invalid or has expired'
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({
            status: 'success',
            message: 'Password has been reset successfully'
        });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to reset password'
        });
    }
};

exports.deleteAccountAPI = async (req, res) => {
    try {
        await userService.deleteAccountService(req.user.id);
        res.json({
            status: 'success',
            message: 'Account deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete account'
        });
    }
}; 