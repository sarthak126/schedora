const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('./src/models/Staff');

// ID from debug output
const STAFF_ID = '6980a97772b2a25a47763703';

async function fixStaffDays() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const staff = await Staff.findById(STAFF_ID);
        if (!staff) {
            console.log('Staff not found');
            return;
        }

        console.log('Current Working Days:', staff.workingDays);

        // Update to work all days
        staff.workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        await staff.save();

        console.log('Updated Working Days to:', staff.workingDays);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

fixStaffDays();
