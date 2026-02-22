const mongoose = require('mongoose');
const Salon = require('./src/models/Salon');

mongoose.connect('mongodb+srv://sanjivinik1000:z8H10zV8E1G1B0pU@cluster0.o8k6h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(async () => {
        const salonId = (await Salon.findOne())._id;
        const salon = await Salon.findById(salonId).select('+razorpay.key_id');
        console.log("Salon object:", Object.keys(salon.toObject()));
        if (salon.owner) console.log("Owner field is present!");
        else console.log("Owner field is MISSING!");
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
