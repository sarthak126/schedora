const mongoose = require('mongoose');
require('dotenv').config();
const Salon = require('./src/models/Salon');
const Service = require('./src/models/Service');
const Staff = require('./src/models/Staff');

const SALON_ID = '69807a9c55190df6eda99aa1';

async function debugSlots() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const salon = await Salon.findById(SALON_ID);
        if (!salon) {
            console.log('Salon found (by ID check)? No.');
            return;
        }
        console.log(`Salon: ${salon.name}`);

        // Find ALL staff for this salon
        const allStaff = await Staff.find({ salon: SALON_ID });
        console.log(`Total Staff in DB for this Salon: ${allStaff.length}`);

        allStaff.forEach(s => {
            console.log(`--- Staff: ${s.name} ---`);
            console.log(`ID: ${s._id}`);
            console.log(`isActive: ${s.isActive}`);
            console.log(`Services Offered: ${s.servicesOffered}`);
            console.log(`Working Days: ${s.workingDays}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

debugSlots();
