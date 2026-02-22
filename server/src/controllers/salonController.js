const Salon = require('../models/Salon');
const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Create or Update Salon Profile
// @route   POST /api/salons
// @access  Private (Provider)
const createOrUpdateSalon = async (req, res) => {
    try {
        const { name, description, address, contactNumber, openingHours, existingImages, requireAppointmentApproval } = req.body;
        let newImages = [];

        if (req.files) {
            newImages = req.files.map(file => file.path);
        }

        // Combine existing images (if any) with new images
        // existingImages might be a string (single) or array, or undefined
        let currentImages = [];
        if (existingImages) {
            // Check if it's a JSON string representation of an array
            if (typeof existingImages === 'string') {
                try {
                    const parsed = JSON.parse(existingImages);
                    if (Array.isArray(parsed)) {
                        currentImages = parsed;
                    } else {
                        // It's a single image URL string
                        currentImages = [existingImages];
                    }
                } catch (e) {
                    // Not valid JSON, treat as single string URL
                    currentImages = [existingImages];
                }
            } else if (Array.isArray(existingImages)) {
                currentImages = existingImages;
            }
        }

        // START FIX: Merge logic
        const finalImages = [...currentImages, ...newImages];

        const salonFields = {
            owner: req.user.id,
            name,
            description,
            address,
            contactNumber,
            openingHours: openingHours ? JSON.parse(openingHours) : undefined,
            images: finalImages, // Always update images list with the merged set
            requireAppointmentApproval // Add this
        };

        let salon = await Salon.findOne({ owner: req.user.id });

        if (salon) {
            // Update
            salon = await Salon.findOneAndUpdate(
                { owner: req.user.id },
                { $set: salonFields },
                { new: true }
            );
        } else {
            // Create
            salon = await Salon.create(salonFields);

            // Update User to link salon
            await User.findByIdAndUpdate(req.user.id, { salonProfile: salon._id });
        }

        res.status(200).json(salon);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get current provider's salon
// @route   GET /api/salons/me
// @access  Private (Provider)
const getMySalon = async (req, res) => {
    try {
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            // Return null (200 OK) instead of 404 to avoid console errors on frontend check
            return res.json(null);
        }
        res.json(salon);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all salons (Public Marketplace)
// @route   GET /api/salons
// @access  Public
const getAllSalons = async (req, res) => {
    try {
        const { keyword } = req.query;
        let query = { status: 'approved' };

        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { address: { $regex: keyword, $options: 'i' } }
            ];
        }

        const salons = await Salon.find(query);
        res.json(salons);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get salon by ID (Public Detail)
// @route   GET /api/salons/:id
// @access  Public
const getSalonById = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon || salon.status !== 'approved') {
            return res.status(404).json({ message: 'Salon not found or not visible.' });
        }

        // Increment views
        salon.views += 1;
        await salon.save({ validateBeforeSave: false });

        res.json(salon);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Salon not found' });
        }
        res.status(500).send('Server Error');
    }
};


// @desc    Get Salon Stats (Bookings, Revenue, Views)
// @route   GET /api/salons/stats
// @access  Private (Provider)
const getSalonStats = async (req, res) => {
    try {
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            // Return empty stats (200 OK) instead of 404
            return res.json({
                views: 0,
                bookings: 0,
                revenue: 0
            });
        }

        const totalBookings = await Booking.countDocuments({ salon: salon._id });

        // Calculate revenue from 'paid' OR 'completed' bookings (to include legacy/cash completed)
        const revenueResult = await Booking.aggregate([
            {
                $match: {
                    salon: salon._id,
                    $or: [
                        { paymentStatus: 'paid' },
                        { status: 'completed' }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: "$price" } } }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        res.json({
            views: salon.views || 0,
            bookings: totalBookings,
            revenue: totalRevenue
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createOrUpdateSalon,
    getMySalon,
    getAllSalons,
    getSalonById,
    getSalonStats
};
