const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('./src/models/Staff');
const Salon = require('./src/models/Salon');
const Service = require('./src/models/Service');
const Booking = require('./src/models/Booking');

// Mock specific ID from screenshot if possible, or find by name
const SALON_ID = '69807a9c55190df6eda99aa1'; // FROM SCREENSHOT URL

async function debugSlots() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Check Salon
        const salon = await Salon.findById(SALON_ID);
        if (!salon) {
            console.log('Salon not found with ID:', SALON_ID);
            // Try finding one
            const someSalon = await Salon.findOne();
            console.log('Found this salon instead:', someSalon?._id, someSalon?.name);
            process.exit(0);
        }
        console.log('Salon found:', salon.name);

        // 2. Find Service "cutting"
        const service = await Service.findOne({ salon: salon._id, name: /cutting/i });
        if (!service) {
            console.log('Service "cutting" not found for this salon');
            const services = await Service.find({ salon: salon._id });
            console.log('Available services:', services.map(s => s.name));
            process.exit(0);
        }
        console.log('Service found:', service.name, 'Duration:', service.duration, 'ID:', service._id);

        // 3. Find Staff for this salon
        const staffList = await Staff.find({ salon: salon._id });
        console.log('Staff count:', staffList.length);

        if (staffList.length === 0) {
            console.log('NO STAFF FOUND. This is likely why no slots are showing.');
        }

        for (const staff of staffList) {
            console.log(`\nChecking Staff: ${staff.name} (${staff._id})`);
            console.log('Role:', staff.role);
            console.log('Working Hours:', JSON.stringify(staff.workingHours, null, 2));

            // Check if staff performs the service? 
            // The model might link service IDs. NOTE: The Staff model previously viewed has `services` array of strings or IDs.
            console.log('Services offered by staff:', staff.services);

            // Check if Tuesday (Tue 3 Feb 2026) is open
            // Feb 3 2026 is a Tuesday.
            const dayKey = 'tue';
            const hours = staff.workingHours?.[dayKey];
            console.log(`Hours on ${dayKey}:`, hours);

            if (!hours || !hours.isOpen) {
                console.log('Staff is NOT working on Tuesday.');
            } else {
                console.log(`Staff works ${hours.start} - ${hours.end}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

debugSlots();
