const express = require('express');
const router = express.Router();
const passport = require('passport');
const { forwardAuthenticated, ensureAuthenticated } = require('../middleware/auth');
const userController = require('../controllers/userController');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profiles');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Login page
router.get('/login', forwardAuthenticated, userController.getLoginPage);

// Register page
router.get('/register', forwardAuthenticated, userController.getRegisterPage);

// Register handle
router.post('/register', userController.register);

// Login handle
router.post('/login', userController.login);

// Logout handle
router.get('/logout', userController.logout);

// Profile routes
router.get('/profile', ensureAuthenticated, userController.getProfile);
router.post('/profile', ensureAuthenticated, upload.single('profilePicture'), userController.updateProfile);
router.get('/profile/items', ensureAuthenticated, userController.getUserItems);
router.get('/profile/trades', ensureAuthenticated, userController.getUserTrades);

// Email verification routes
router.get('/verify-email', ensureAuthenticated, userController.getEmailVerificationPage);
router.post('/send-verification', ensureAuthenticated, userController.sendVerificationEmail);
router.post('/verify-code', ensureAuthenticated, userController.verifyEmailWithCode);

// Password reset routes
router.get('/forgot-password', forwardAuthenticated, userController.getForgotPasswordPage);
router.post('/forgot-password', forwardAuthenticated, userController.requestPasswordReset);
router.get('/reset-password/:token', forwardAuthenticated, userController.getResetPasswordPage);
router.post('/reset-password/:token', forwardAuthenticated, userController.resetPassword);

module.exports = router; 