const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const Item = require('../../../models/Item');

describe('User Model Test', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barter-trading');
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    afterEach(async () => {
        await Item.deleteMany();
    });

    it('should create & save user successfully', async () => {
        const validUser = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'test1@example.com',
            password: 'password123'
        });
        const savedUser = await validUser.save();

        expect(savedUser._id).toBeDefined();
        expect(savedUser.firstName).toBe(validUser.firstName);
        expect(savedUser.lastName).toBe(validUser.lastName);
        expect(savedUser.email).toBe(validUser.email);

        // Verify password is hashed and can be compared
        const isMatch = await bcrypt.compare('password123', savedUser.password);
        expect(isMatch).toBe(true);
    });

    it('should fail to save user without required fields', async () => {
        const userWithoutRequiredField = new User({ firstName: 'John' });
        let err;

        try {
            await userWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('should fail to save user with invalid email', async () => {
        const userWithInvalidEmail = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'invalid-email',
            password: 'password123'
        });
        let err;

        try {
            await userWithInvalidEmail.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('should fail to save user with short password', async () => {
        const userWithShortPassword = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'test2@example.com',
            password: '123'
        });
        let err;

        try {
            await userWithShortPassword.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });

    it('should update user successfully', async () => {
        const user = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'test3@example.com',
            password: 'password123'
        });
        await user.save();

        user.firstName = 'Jane';
        const updatedUser = await user.save();

        expect(updatedUser.firstName).toBe('Jane');
    });

    it('should delete user successfully', async () => {
        const user = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'test4@example.com',
            password: 'password123'
        });
        await user.save();

        await User.findByIdAndDelete(user._id);
        const deletedUser = await User.findById(user._id);

        expect(deletedUser).toBeNull();
    });
}); 