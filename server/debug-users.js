const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function checkUserRole() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // We don't know the exact user ID from here easily without a token decode, 
        // but we can list all users and their roles to help the user identify theirs.
        const users = await User.find({}, 'name email role');
        console.table(users.map(u => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role
        })));

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

checkUserRole();
