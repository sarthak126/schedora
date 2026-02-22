const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const email = process.argv[2];

if (!email) {
    console.error("Please provide an email address as an argument.");
    process.exit(1);
}

const promoteToAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const user = await User.findOneAndUpdate(
            { email: email },
            { role: 'admin' },
            { new: true }
        );

        if (!user) {
            console.log("User not found.");
        } else {
            console.log(`Success! User ${user.email} is now an Admin.`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

promoteToAdmin();
