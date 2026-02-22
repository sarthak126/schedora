const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../src/models/User'); // Adjust path as needed
const connectDB = require('../src/config/db'); // Adjust path as needed

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const makeAdmin = async () => {
    try {
        const email = process.argv[2];

        if (!email) {
            console.error('Usage: node scripts/makeAdmin.js <email>');
            process.exit(1);
        }

        await connectDB();

        const user = await User.findOne({ email });

        if (!user) {
            console.error(`User with email ${email} not found`);
            process.exit(1);
        }

        if (user.role === 'admin') {
            console.log(`User ${user.name} (${email}) is already an admin.`);
            process.exit(0);
        }

        user.role = 'admin';
        await user.save();

        console.log(`✅ Success! User ${user.name} (${email}) is now an Admin.`);
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeAdmin();
