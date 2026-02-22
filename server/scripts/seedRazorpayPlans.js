/**
 * Razorpay Plan Seeder Script
 * 
 * Run this script ONCE to create subscription plans in Razorpay
 * and store them in local database
 * 
 * Usage: node scripts/seedRazorpayPlans.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Plan = require('../src/models/Plan');
const connectDB = require('../src/config/db');

// Plan configurations
const PLANS_TO_CREATE = [
    {
        name: 'Pro Monthly',
        amount: 49900, // ₹499
        interval: 'monthly',
        period: 1,
        description: 'Perfect for small salons',
        features: [
            'Unlimited bookings',
            'Up to 5 staff members',
            'Basic analytics',
            'Email support'
        ],
        displayOrder: 1,
        trialDays: 7
    },
    {
        name: 'Pro Quarterly',
        amount: 129900, // ₹1299 (Save ₹198)
        interval: 'monthly',
        period: 3,
        description: 'Best value for growing salons',
        features: [
            'Everything in Pro Monthly',
            'Priority support',
            'Save 13%'
        ],
        displayOrder: 2,
        trialDays: 7
    },
    {
        name: 'Business Monthly',
        amount: 99900, // ₹999
        interval: 'monthly',
        period: 1,
        description: 'For established salons',
        features: [
            'Unlimited bookings',
            'Unlimited staff',
            'Advanced analytics',
            'Priority support',
            'Custom branding'
        ],
        displayOrder: 3,
        trialDays: 7
    },
    {
        name: 'Business Annual',
        amount: 999900, // ₹9999 (Save ₹1989)
        interval: 'yearly',
        period: 1,
        description: 'Best value for serious businesses',
        features: [
            'Everything in Business Monthly',
            '2 months FREE',
            'Dedicated account manager'
        ],
        displayOrder: 4,
        trialDays: 14
    }
];

async function createPlans() {
    console.log('🚀 Starting Razorpay Plan Seeder...\n');

    // Check for Razorpay keys
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ Error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
        process.exit(1);
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    for (const planConfig of PLANS_TO_CREATE) {
        console.log(`📝 Creating plan: ${planConfig.name}...`);

        try {
            // Check if plan already exists in DB
            const existingPlan = await Plan.findOne({ name: planConfig.name });
            if (existingPlan) {
                console.log(`   ⏭️  Plan already exists in DB (razorpay_plan_id: ${existingPlan.razorpay_plan_id})`);
                continue;
            }

            // Create plan in Razorpay
            const razorpayPlan = await razorpay.plans.create({
                period: planConfig.interval,
                interval: planConfig.period,
                item: {
                    name: planConfig.name,
                    amount: planConfig.amount,
                    currency: 'INR',
                    description: planConfig.description
                }
            });

            console.log(`   ✅ Created in Razorpay: ${razorpayPlan.id}`);

            // Save to database
            const dbPlan = await Plan.create({
                name: planConfig.name,
                razorpay_plan_id: razorpayPlan.id,
                amount: planConfig.amount,
                currency: 'INR',
                interval: planConfig.interval,
                period: planConfig.period,
                description: planConfig.description,
                features: planConfig.features,
                displayOrder: planConfig.displayOrder,
                trialDays: planConfig.trialDays,
                isActive: true
            });

            console.log(`   ✅ Saved to DB: ${dbPlan._id}\n`);

        } catch (error) {
            console.error(`   ❌ Error creating ${planConfig.name}:`, error.message);

            // If error is due to existing plan in Razorpay, try to fetch and save
            if (error.statusCode === 400) {
                console.log(`   ℹ️  Plan may already exist in Razorpay. Check dashboard.`);
            }
        }
    }

    console.log('\n🎉 Plan seeding complete!');
    console.log('\n📋 Current plans in database:');

    const allPlans = await Plan.find().sort({ displayOrder: 1 });
    allPlans.forEach(p => {
        console.log(`   - ${p.name}: ₹${p.amount / 100} (${p.razorpay_plan_id})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
}

createPlans().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
