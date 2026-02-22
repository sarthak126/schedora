const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error("Usage: node scripts/checkUser.js <email> <password>");
    process.exit(1);
}

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`Connected to DB. Checking user: ${email}`);

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log("User NOT FOUND.");
        } else {
            console.log("User FOUND.");
            console.log(`Stored Hashed Password: ${user.password}`);

            const isMatch = await bcrypt.compare(password, user.password);
            console.log(`Password Match: ${isMatch}`);

            if (isMatch) {
                console.log("LOGIN SHOULD SUCCEED.");
            } else {
                console.log("LOGIN SHOULD FAIL.");
            }
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

checkUser();
