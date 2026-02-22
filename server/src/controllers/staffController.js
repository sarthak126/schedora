const Staff = require('../models/Staff');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');

// @desc    Create a new staff member
// @route   POST /api/staff
// @access  Private (Provider only)
const createStaff = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            phone,
            experience,
            workingDays,
            workingHours,
            salonId
        } = req.body;

        // Verify user is provider and owns the salon
        if (req.user.role !== 'provider') {
            return res.status(403).json({ message: 'Only salon providers can add staff' });
        }

        const salon = await Salon.findOne({ _id: salonId, owner: req.user.id });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found or unauthorized' });
        }

        // Check if email already exists
        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ message: 'Staff email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password || 'staff123', 10);

        // Create staff
        const staff = await Staff.create({
            salon: salonId,
            name,
            email,
            password: hashedPassword,
            role,
            phone,
            experience: experience || 0,
            workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            workingHours: workingHours || { start: '09:00', end: '18:00' },
            createdBy: req.user.id,
        });

        res.status(201).json(staff);
    } catch (error) {
        console.error('Create Staff Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all staff for a salon
// @route   GET /api/staff/salon/:salonId
// @access  Public
const getStaffBySalon = async (req, res) => {
    try {
        const { salonId } = req.params;
        const { includeInactive } = req.query;

        const query = { salon: salonId };
        if (!includeInactive) {
            query.isActive = true;
        }

        const staff = await Staff.find(query)
            .populate('servicesOffered', 'name price duration')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(staff);
    } catch (error) {
        console.error('Get Staff Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single staff member
// @route   GET /api/staff/:id
// @access  Public
const getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id)
            .populate('servicesOffered', 'name price duration')
            .populate('salon', 'name address')
            .select('-password');

        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        res.json(staff);
    } catch (error) {
        console.error('Get Staff Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Provider only)
const updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        // Verify ownership
        const salon = await Salon.findOne({ _id: staff.salon, owner: req.user.id });
        if (!salon) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const {
            name,
            role,
            phone,
            experience,
            profilePhoto,
            workingDays,
            workingHours,
            breakTimes,
            servicesOffered // NEW: Allow updating services
        } = req.body;

        // Update fields
        if (name) staff.name = name;
        if (role) staff.role = role;
        if (phone) staff.phone = phone;
        if (experience !== undefined) staff.experience = experience;
        if (profilePhoto) staff.profilePhoto = profilePhoto;
        if (workingDays) staff.workingDays = workingDays;
        if (workingHours) staff.workingHours = workingHours;
        if (breakTimes) staff.breakTimes = breakTimes;
        if (servicesOffered) staff.servicesOffered = servicesOffered; // NEW

        await staff.save();

        const updatedStaff = await Staff.findById(staff._id)
            .populate('servicesOffered', 'name price duration')
            .select('-password');

        res.json(updatedStaff);
    } catch (error) {
        console.error('Update Staff Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete (soft delete) staff member
// @route   DELETE /api/staff/:id
// @access  Private (Provider only)
const deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        // Verify ownership
        const salon = await Salon.findOne({ _id: staff.salon, owner: req.user.id });
        if (!salon) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Soft delete
        staff.isActive = false;
        await staff.save();

        res.json({ message: 'Staff member deactivated successfully' });
    } catch (error) {
        console.error('Delete Staff Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Assign services to staff
// @route   POST /api/staff/:id/services
// @access  Private (Provider only)
const assignServices = async (req, res) => {
    try {
        const { serviceIds } = req.body;

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        // Verify ownership
        const salon = await Salon.findOne({ _id: staff.salon, owner: req.user.id });
        if (!salon) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        staff.servicesOffered = serviceIds;
        await staff.save();

        const updatedStaff = await Staff.findById(staff._id)
            .populate('servicesOffered', 'name price duration')
            .select('-password');

        res.json(updatedStaff);
    } catch (error) {
        console.error('Assign Services Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update staff availability status
// @route   PUT /api/staff/:id/availability
// @access  Private (Provider or Staff themselves)
const updateAvailability = async (req, res) => {
    try {
        const { availabilityStatus } = req.body;

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        staff.availabilityStatus = availabilityStatus;
        await staff.save();

        res.json({ message: 'Availability updated', availabilityStatus: staff.availabilityStatus });
    } catch (error) {
        console.error('Update Availability Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark staff leave
// @route   POST /api/staff/:id/leave
// @access  Private (Provider only)
const markLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        // Verify ownership
        const salon = await Salon.findOne({ _id: staff.salon, owner: req.user.id });
        if (!salon) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        staff.leaveSchedule.push({ startDate, endDate, reason });
        await staff.save();

        res.json({ message: 'Leave marked successfully', leaveSchedule: staff.leaveSchedule });
    } catch (error) {
        console.error('Mark Leave Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get available staff for a service at a given time
// @route   GET /api/staff/available
// @access  Public
const getAvailableStaff = async (req, res) => {
    try {
        const { salonId, serviceId, date, time } = req.query;

        if (!salonId) {
            return res.status(400).json({ message: 'Salon ID is required' });
        }

        // Find staff who offer this service
        let query = { salon: salonId, isActive: true };
        if (serviceId) {
            query.servicesOffered = serviceId;
        }

        let staff = await Staff.find(query)
            .populate('servicesOffered', 'name price duration')
            .select('-password');

        // If date provided, filter by working day
        if (date) {
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
            staff = staff.filter(s => s.workingDays.includes(dayOfWeek));

            // Check if on leave
            staff = staff.filter(s => {
                const isOnLeave = s.leaveSchedule.some(leave => {
                    const leaveStart = new Date(leave.startDate);
                    const leaveEnd = new Date(leave.endDate);
                    const checkDate = new Date(date);
                    return checkDate >= leaveStart && checkDate <= leaveEnd;
                });
                return !isOnLeave && s.availabilityStatus === 'active';
            });
        }

        // If time provided, check for existing bookings
        if (date && time) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const bookings = await Booking.find({
                salon: salonId,
                date: { $gte: startOfDay, $lte: endOfDay },
                time: time,
                status: { $nin: ['cancelled'] },
            }).select('staff');

            const bookedStaffIds = bookings.map(b => b.staff?.toString()).filter(Boolean);
            staff = staff.filter(s => !bookedStaffIds.includes(s._id.toString()));
        }

        res.json(staff);
    } catch (error) {
        console.error('Get Available Staff Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get logged-in staff's appointments
// @route   GET /api/staff/me/appointments
// @access  Private (Staff only)
const getMyAppointments = async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const Staff = require('../models/Staff');

        // Get staff profile to find their salon
        const staffProfile = await Staff.findById(req.user.id);
        if (!staffProfile) {
            return res.status(404).json({ message: 'Staff profile not found' });
        }

        // Find appointments:
        // 1. Assigned to this staff member
        // 2. Unassigned (staff: null) in the same salon
        const appointments = await Booking.find({
            salon: staffProfile.salon,
            status: { $nin: ['cancelled'] },
            $or: [
                { staff: req.user.id },           // Assigned to this staff
                { staff: null },                  // Unassigned (available to claim)
                { staff: { $exists: false } }     // Staff field doesn't exist
            ]
        })
            .populate('service', 'name duration price')
            .populate('salon', 'name address')
            .populate('user', 'name email phone')
            .populate('staff', 'name role')
            .sort({ date: 1, time: 1 });

        res.json(appointments);
    } catch (error) {
        console.error('Get My Appointments Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update own availability status
// @route   PUT /api/staff/me/status
// @access  Private (Staff only)
const updateMyStatus = async (req, res) => {
    try {
        const { availabilityStatus } = req.body;

        if (!['active', 'on-break', 'on-leave'].includes(availabilityStatus)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const staff = await Staff.findById(req.user.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        staff.availabilityStatus = availabilityStatus;
        await staff.save();

        res.json({
            message: 'Status updated successfully',
            availabilityStatus: staff.availabilityStatus
        });
    } catch (error) {
        console.error('Update My Status Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update own password
// @route   PUT /api/staff/me/password
// @access  Private (Staff only)
const updateMyPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const staff = await Staff.findById(req.user.id).select('+password');
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, staff.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        staff.password = hashedPassword;
        await staff.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get live status of all staff in salon (for provider dashboard)
// @route   GET /api/staff/salon/:salonId/live-status
// @access  Public (or could be protected for provider)
const getLiveStatus = async (req, res) => {
    try {
        const { salonId } = req.params;

        // Get all staff for this salon
        const staffList = await Staff.find({ salon: salonId, isActive: true })
            .select('name email role phone availabilityStatus')
            .populate('servicesOffered', 'name duration price');

        // Get today's active appointments for all staff
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const activeAppointments = await Booking.find({
            salon: salonId,
            date: { $gte: today, $lt: tomorrow },
            status: { $in: ['confirmed', 'in-progress'] },
            staff: { $exists: true, $ne: null }
        })
            .populate('service', 'name duration')
            .populate('user', 'name phone')
            .select('staff time status customerName customerPhone service user')
            .lean();

        // Create a map of staff ID to current appointment
        const staffAppointmentMap = {};
        activeAppointments.forEach(apt => {
            if (apt.staff) {
                const staffId = apt.staff.toString();
                // Only show in-progress appointments as "current"
                if (apt.status === 'in-progress') {
                    staffAppointmentMap[staffId] = {
                        _id: apt._id,
                        customerName: apt.customerName || apt.user?.name || 'Guest',
                        customerPhone: apt.customerPhone || apt.user?.phone,
                        service: apt.service?.name,
                        time: apt.time,
                        status: apt.status
                    };
                }
            }
        });

        // Combine staff data with current appointments
        const staffWithStatus = staffList.map(staff => {
            const staffObj = staff.toObject();
            const currentAppointment = staffAppointmentMap[staff._id.toString()] || null;

            return {
                ...staffObj,
                currentAppointment,
                // Determine display status: busy if has in-progress appointment
                displayStatus: currentAppointment ? 'busy' : staff.availabilityStatus
            };
        });

        res.json(staffWithStatus);
    } catch (error) {
        console.error('Get Live Status Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createStaff,
    getStaffBySalon,
    getStaffById,
    updateStaff,
    deleteStaff,
    assignServices,
    updateAvailability,
    markLeave,
    getAvailableStaff,
    getMyAppointments,
    updateMyStatus,
    updateMyPassword,
    getLiveStatus,
};
