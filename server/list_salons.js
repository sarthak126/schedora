require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const Salon = require('./src/models/Salon');
        // The user ID from the log
        const userId = '67a78126d3d471f7719017a7';
        // Wait, the log said user: '698778216d3d471f7719017a' - let me copy exactly from log
        // The log said: user: '698778216d3d471f7719017a' CANNOT BE RIGHT, 69 is not hex? 
        // Ah, '6' is 6. '9' is 9. '8' is 8. 'g' is not hex. 
        // 698778216d3d471f7719017a -> 24 chars.

        // Let's just list ALL salons
        const salons = await Salon.find({});
        console.log('\n=== ALL SALONS ===');
        salons.forEach(s => {
            console.log(`ID: ${s._id}`);
            console.log(`Name: ${s.name}`);
            console.log(`Owner: ${s.owner}`);
            console.log(`Contact: ${s.contactNumber}`);
            console.log('-------------------');
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
