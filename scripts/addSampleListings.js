const mongoose = require('mongoose');
const User = require('../models/User');
const Item = require('../models/Item');
require('dotenv').config();

async function addSampleListings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // useNewUrlParser: true, // deprecated
            // useUnifiedTopology: true // deprecated
        });
        console.log('Connected to MongoDB');

        // User data
        const user1Data = {
            firstName: 'Melb',
            lastName: 'Sivaguru',
            email: 'sthenusan.17@cse.mrt.ac.lk',
            password: 'Password@123',
            isEmailVerified: true
        };
        const user2Data = {
            firstName: 'Syd',
            lastName: 'Santhirakumar',
            email: 'thenusan1997@gmail.com',
            password: 'Password@123',
            isEmailVerified: true
        };
        const user3Data = {
            firstName: 'Bris',
            lastName: 'Dev',
            email: 'thenusan.dev@gmail.com',
            password: 'Password@123',
            isEmailVerified: true
        };

        // Create users if they don't exist
        let user1 = await User.findOne({ email: user1Data.email });
        if (!user1) {
            user1 = new User(user1Data);
            await user1.save();
            console.log('Created user:', user1.email);
        }
        let user2 = await User.findOne({ email: user2Data.email });
        if (!user2) {
            user2 = new User(user2Data);
            await user2.save();
            console.log('Created user:', user2.email);
        }
        let user3 = await User.findOne({ email: user3Data.email });
        if (!user3) {
            user3 = new User(user3Data);
            await user3.save();
            console.log('Created user:', user3.email);
        }

        const user1Items = [
            { title: 'MacBook Pro 2019', description: 'Excellent condition MacBook Pro, 16GB RAM, 512GB SSD', category: 'Electronics', condition: 'Like New', location: 'Colombo', images: ['macbook.jpg'], owner: user1._id, status: 'Available' },
            { title: 'Nike Air Max 270', description: 'Barely worn Nike Air Max 270, size 10', category: 'Clothing', condition: 'Like New', location: 'Colombo', images: ['nike.jpg'], owner: user1._id, status: 'Available' },
            { title: 'IKEA Bookshelf', description: 'White IKEA Billy bookshelf, perfect condition', category: 'Furniture', condition: 'Good', location: 'Colombo', images: ['bookshelf.jpg'], owner: user1._id, status: 'Available' },
            { title: 'Harry Potter Book Set', description: 'Complete Harry Potter book set, hardcover', category: 'Books', condition: 'Good', location: 'Colombo', images: ['harrypotter.jpg'], owner: user1._id, status: 'Available' },
            { title: 'Yoga Mat', description: 'Premium yoga mat, used only a few times', category: 'Sports', condition: 'Like New', location: 'Colombo', images: ['yoga.jpg'], owner: user1._id, status: 'Available' }
        ];

        const user2Items = [
            { title: 'Samsung Galaxy S21 Ultra', description: 'Samsung Galaxy S21 Ultra, 256GB, Phantom Black', category: 'Electronics', condition: 'Like New', location: 'Jaffna', images: ['samsung.jpg'], owner: user2._id, status: 'Available' },
            { title: 'Canon EOS 80D Camera', description: 'Professional DSLR camera with 18-55mm lens', category: 'Electronics', condition: 'Good', location: 'Jaffna', images: ['camera.jpg'], owner: user2._id, status: 'Available' },
            { title: 'Adidas Running Shoes', description: 'Adidas Ultraboost running shoes, size 8', category: 'Clothing', condition: 'Good', location: 'Jaffna', images: ['adidas.jpg'], owner: user2._id, status: 'Available' },
            { title: 'Wooden Study Desk', description: 'Solid wood study desk with drawers', category: 'Furniture', condition: 'Good', location: 'Jaffna', images: ['desk.jpg'], owner: user2._id, status: 'Available' },
            { title: 'Complete A Song of Ice and Fire Set', description: 'All 5 books in the series, hardcover', category: 'Books', condition: 'Like New', location: 'Jaffna', images: ['got.jpg'], owner: user2._id, status: 'Available' }
        ];

        const user3Items = [
            { title: 'iPad Pro 2022', description: 'iPad Pro 12.9-inch, 256GB, Space Gray', category: 'Electronics', condition: 'Like New', location: 'Kandy', images: ['ipad.jpg'], owner: user3._id, status: 'Available' },
            { title: 'Bose QuietComfort 45', description: 'Wireless noise-cancelling headphones', category: 'Electronics', condition: 'Like New', location: 'Kandy', images: ['bose.jpg'], owner: user3._id, status: 'Available' },
            { title: 'Leather Jacket', description: 'Genuine leather jacket, size M', category: 'Clothing', condition: 'Good', location: 'Kandy', images: ['jacket.jpg'], owner: user3._id, status: 'Available' },
            { title: 'Gaming Chair', description: 'Ergonomic gaming chair with lumbar support', category: 'Furniture', condition: 'Like New', location: 'Kandy', images: ['chair.jpg'], owner: user3._id, status: 'Available' },
            { title: 'Dune Book Series', description: 'Complete Dune series by Frank Herbert', category: 'Books', condition: 'Good', location: 'Kandy', images: ['dune.jpg'], owner: user3._id, status: 'Available' }
        ];

        await Item.insertMany([...user1Items, ...user2Items, ...user3Items]);
        console.log('Sample listings added for all three users.');
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
    }
}

addSampleListings(); 