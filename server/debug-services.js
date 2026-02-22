const mongoose = require('mongoose');
require('dotenv').config();

const Staff = require('./src/models/Staff');
const Service = require('./src/models/Service');
const Salon = require('./src/models/Salon');

const STAFF_ID = '6980a97772b2a25a47763703';

async function debugServices() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const staff = await Staff.findById(STAFF_ID);
        if (!staff) {
            console.log('Staff not found');
            return;
        }

        console.log('Staff Name:', staff.name);
        console.log('Services Offered IDs:', staff.servicesOffered);

        // Find the "cutting" service again to be sure
        const service = await Service.findOne({ name: /cutting/i, salon: staff.salon });
        if (!service) {
            console.log('Service not found');
            return;
        }
        console.log('Cutting Service ID:', service._id);

        // Check if the service ID is in the staff's servicesOffered
        const hasService = staff.servicesOffered.some(id => id.toString() === service._id.toString());
        console.log('Does staff offer this service?', hasService);

        if (!hasService) {
            console.log('Adding service to staff...');
            staff.servicesOffered.push(service._id);
            await staff.save();
            console.log('Service added!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

debugServices();
