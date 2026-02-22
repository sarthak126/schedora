const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Staff = require('../models/Staff');
const { startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, format } = require('date-fns');

// @desc    Get Provider Analytics (Revenue, Bookings, Staff Performance)
// @route   GET /api/analytics/provider
// @access  Private (Provider)
const getProviderAnalytics = async (req, res) => {
    try {
        // 1. Get Provider's Salon
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            // Return empty analytics (200 OK) instead of 404
            return res.json({
                stats: {
                    totalRevenue: 0,
                    totalBookings: 0,
                    completedBookings: 0,
                    cancelledBookings: 0,
                    occupancyRate: 0
                },
                charts: {
                    dailyStats: [],
                    staffStats: []
                }
            });
        }

        const salonId = salon._id;
        const { startDate, endDate } = req.query;

        // Date Range (Default: Last 30 days)
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : subDays(end, 30);

        // Ensure start/end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // 2. Fetch Bookings in Range
        const bookings = await Booking.find({
            salon: salonId,
            date: { $gte: start, $lte: end },
            status: { $nin: ['failed', 'rejected'] } // Exclude failed payments/rejections
        }).populate('staff', 'name');

        // 3. Calculate Key Metrics
        let totalRevenue = 0;
        let totalBookings = bookings.length;
        let completedBookings = 0;
        let cancelledBookings = 0;

        // Daily Breakdown (Map: "YYYY-MM-DD" -> { date, revenue, bookings })
        const dailyMap = new Map();

        // Initialize daily map with 0s for missing days
        const { eachDayOfInterval } = require('date-fns');
        const days = eachDayOfInterval({ start, end });
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            dailyMap.set(dateStr, { date: dateStr, revenue: 0, bookings: 0 });
        });

        // Staff Breakdown (Map: StaffID -> { name, revenue, bookings, validBookings })
        const staffMap = new Map();

        bookings.forEach(booking => {
            const dateStr = format(new Date(booking.date), 'yyyy-MM-dd');
            const price = booking.price || 0;

            // Increment Status Counts
            if (booking.status === 'completed' || booking.status === 'confirmed') {
                completedBookings++;
                // Only count confirmed/completed revenue usually, but 'confirmed' often means paid/will pay.
                // Depending on business logic, we might include 'pending' if it's cash payment expected.
                // For now, let's include confirmed + completed + in-progress + pending (non-cancelled).
                totalRevenue += price;

                // Update Daily Stats
                if (dailyMap.has(dateStr)) {
                    const stat = dailyMap.get(dateStr);
                    stat.revenue += price;
                    stat.bookings += 1;
                }
            }

            if (booking.status === 'cancelled' || booking.status === 'no-show') {
                cancelledBookings++;
            }

            // Update Staff Stats
            if (booking.staff) {
                const staffId = booking.staff._id.toString();
                if (!staffMap.has(staffId)) {
                    staffMap.set(staffId, {
                        name: booking.staff.name,
                        revenue: 0,
                        bookings: 0,
                        rating: 0 // Placeholder
                    });
                }
                const staffStat = staffMap.get(staffId);
                staffStat.bookings += 1; // Total bookings assigned

                if (['confirmed', 'completed', 'in-progress'].includes(booking.status)) {
                    staffStat.revenue += price;
                }
            }
        });

        // Convert Maps to Arrays
        const dailyStats = Array.from(dailyMap.values());
        const staffStats = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);

        res.json({
            stats: {
                totalRevenue,
                totalBookings,
                completedBookings,
                cancelledBookings,
                occupancyRate: 0 // Placeholder
            },
            charts: {
                dailyStats,
                staffStats
            }
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Server error retrieving analytics' });
    }
};

module.exports = {
    getProviderAnalytics
};
