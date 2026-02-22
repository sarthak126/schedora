const User = require('../models/User');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'customer' });
        const totalProviders = await User.countDocuments({ role: 'provider' });
        const totalSalons = await Salon.countDocuments();
        const pendingSalons = await Salon.countDocuments({ status: 'pending' });
        const totalBookings = await Booking.countDocuments();

        // Calculate Revenue from Paid Bookings
        const revenueAgg = await Booking.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: "$price" } } }
        ]);
        const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        res.json({
            totalUsers,
            totalProviders,
            totalSalons,
            pendingSalons,
            totalBookings,
            revenue
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Salons (Admin)
// @route   GET /api/admin/salons
// @access  Private (Admin)
const getAdminSalons = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status && status !== 'all' ? { status } : {};

        const salons = await Salon.find(query).populate('owner', 'name email').sort({ createdAt: -1 });

        // Fetch subscriptions for each salon owner
        const salonsWithSubs = await Promise.all(salons.map(async (salon) => {
            const Subscription = require('../models/Subscription');
            const sub = await Subscription.findOne({ provider: salon.owner._id });
            return {
                ...salon.toObject(),
                subscription: sub || { plan: 'free', status: 'active' } // Default to free if no sub found
            };
        }));

        res.json(salonsWithSubs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve/Reject Salon
// @route   PUT /api/admin/salons/:id/status
// @access  Private (Admin)
const updateSalonStatus = async (req, res) => {
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const salon = await Salon.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );

        if (!salon) return res.status(404).json({ message: 'Salon not found' });

        res.json(salon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get All Users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getDashboardStats,
    getDashboardStats,
    getAdminSalons,
    updateSalonStatus,
    getAllUsers
};
