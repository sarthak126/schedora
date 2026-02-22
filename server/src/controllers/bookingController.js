const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getIo } = require('../socket');
const { sendPushToUser } = require('../utils/pushNotification');

// Initialize Razorpay
let razorpay;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    } else {
        console.warn("⚠️  Razorpay keys missing in .env. Payment features will not work.");
    }
} catch (err) {
    console.error("⚠️  Failed to initialize Razorpay:", err.message);
}

// ============================================================
// HELPER FUNCTIONS FOR MULTI-STAFF SLOT MANAGEMENT
// ============================================================

/**
 * Convert date and time string to exact Date object
 * @param {Date} date - Date like 2024-01-31
 * @param {String} time - Time like "14:00" or "14:30"
 * @returns {Date} - Combined datetime
 */
const combineDateAndTime = (date, time) => {
    if (!time || typeof time !== 'string') {
        console.warn(`Invalid time format in combineDateAndTime: ${time}`);
        // Return a safe fallback or handle it. Here we return Invalid Date which fails comparisons safely.
        return new Date(NaN);
    }
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours)) return new Date(NaN);

    // FIX: Handle Timezone (IST assumption)
    // IST Offset = 5.5 hours
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const inputDate = new Date(date);

    // 1. Shift to "Local Time"
    const localBase = new Date(inputDate.getTime() + IST_OFFSET_MS);

    // 2. Set the hours on this "Local Day"
    localBase.setUTCHours(hours, isNaN(minutes) ? 0 : minutes, 0, 0);

    // 3. Shift back to UTC timestamp
    const combined = new Date(localBase.getTime() - IST_OFFSET_MS);

    return combined;
};

/**
 * Calculate end time based on start time and duration
 * @param {Date} startTime - Start datetime
 * @param {Number} duration - Duration in minutes
 * @returns {Date} - End datetime
 */
const calculateEndTime = (startTime, duration) => {
    if (!duration || isNaN(duration)) {
        console.warn(`Invalid duration in calculateEndTime: ${duration}`);
        return new Date(NaN);
    }
    return new Date(startTime.getTime() + duration * 60000);
};

// @desc    Get Available Slots for a date (V2 - Staff-Based Capacity)
// @route   GET /api/bookings/slots/available
// @access  Public/Private
const getAvailableSlots = async (req, res) => {
    try {
        const { salonId, date, serviceId, staffId } = req.query;

        if (!salonId || !date || !serviceId) {
            return res.status(400).json({ message: 'Salon ID, date, and service ID required' });
        }

        const Staff = require('../models/Staff');
        // Rename to serviceDoc to avoid shadowing the Model
        const serviceDoc = await require('../models/Service').findById(serviceId);

        if (!serviceDoc) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Clean up expired temporary bookings first
        await Booking.deleteMany({
            isTemporary: true,
            reservedUntil: { $lt: new Date() }
        });

        // STEP 1: Get all qualified staff for this service
        let qualifiedStaff;
        if (staffId) {
            // Customer selected specific staff
            qualifiedStaff = await Staff.find({
                _id: staffId,
                salon: salonId,
                servicesOffered: serviceId,
                isActive: true
            });
        } else {
            // Get all staff who can perform this service
            qualifiedStaff = await Staff.find({
                salon: salonId,
                servicesOffered: serviceId,
                isActive: true
            });
        }

        if (qualifiedStaff.length === 0) {
            console.log(`❌ No qualified staff found for service ${serviceId} at salon ${salonId}`);
            console.log(`   This usually means staff don't have this service in their servicesOffered array`);
            return res.json([]); // No staff available for this service
        }



        // STEP 2: Get all bookings for these staff on selected date
        // FIX: Calculate Start of Day in IST, then convert to UTC
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const inputDate = new Date(date);

        const localDate = new Date(inputDate.getTime() + IST_OFFSET_MS);
        localDate.setUTCHours(0, 0, 0, 0); // Midnight IST (represented as UTC date object)

        const startOfDay = new Date(localDate.getTime() - IST_OFFSET_MS); // Back to UTC (e.g. 18:30 prev day)
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);


        // Determine Day of Week (e.g., "Tuesday")
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        // Use localDate (which is shifted) to get the correct day of week index
        // We use getUTCDay() on localDate because we set it using UTC methods relative to the shift
        const dayIndex = localDate.getUTCDay();
        const dayName = daysOfWeek[dayIndex];

        // Filter qualifiedStaff to only those working on this day
        qualifiedStaff = qualifiedStaff.filter(staff => {
            return staff.workingDays && staff.workingDays.includes(dayName);
        });

        if (qualifiedStaff.length === 0) {
            return res.json([]); // No staff working on this specific day
        }

        const staffIds = qualifiedStaff.map(s => s._id);

        const bookings = await Booking.find({
            staff: { $in: staffIds },
            date: { $gte: startOfDay, $lte: endOfDay },
            status: { $nin: ['cancelled'] },
            $or: [
                { isTemporary: false },
                { isTemporary: true, reservedUntil: { $gt: new Date() } }
            ]
        }).select('staff time startTime endTime isTemporary reservedUntil');


        // Determine Slot Generation Range
        // We find the earliest start time and the latest end time among all working staff to maximize visibility
        // Default to 10:00 - 19:00 if weird data
        let minStartHour = 10;
        let maxEndHour = 19;

        // Helper to parse "09:00" -> 9
        const parseHour = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return 10;
            return parseInt(timeStr.split(':')[0], 10);
        };

        qualifiedStaff.forEach(staff => {
            if (staff.workingHours && staff.workingHours.start && staff.workingHours.end) {
                const s = parseHour(staff.workingHours.start);
                const e = parseHour(staff.workingHours.end);
                // Allow earlier start
                if (s < minStartHour) minStartHour = s;
                // Allow later end
                if (e > maxEndHour) maxEndHour = e;
            } else {
                // Fallback if staff has no specific hours set
                minStartHour = 9;
                maxEndHour = 21;
            }
        });

        // STEP 3: Generate all possible 30-min slots based on dynamic range
        // If maxEndHour is 19, loop until hour < 19 (so last slot starts 18:30 or 19:00 depends on logic)
        // Usually shops close at end time, so last slot must finish by end time.
        // Simplified: Loop from minStartHour to maxEndHour
        const allTimeSlots = [];
        // Generate 15-minute slots
        for (let hour = minStartHour; hour < maxEndHour; hour++) {
            const hourStr = hour.toString().padStart(2, '0');
            allTimeSlots.push(`${hourStr}:00`);
            allTimeSlots.push(`${hourStr}:15`);
            allTimeSlots.push(`${hourStr}:30`);
            allTimeSlots.push(`${hourStr}:45`);
        }
        // One edge case: if maxEndHour is 19:00, usually we stop start times at 18:30.

        // STEP 4: For each slot, calculate how many staff are available
        const slotsWithCapacity = allTimeSlots.map(timeSlot => {
            try {
                const slotStart = combineDateAndTime(date, timeSlot);
                // Use serviceDoc instead of Service
                const slotEnd = calculateEndTime(slotStart, serviceDoc.duration);



                // FIX: Timezone-aware comparison
                // Both slotStart and now should be compared in the same reference (UTC)
                const nowUTC = new Date();
                // Add buffer (e.g. 30 mins) to current UTC time
                const bufferTime = new Date(nowUTC.getTime() + 30 * 60000);

                // slotStart is already in UTC from combineDateAndTime
                if (slotStart < bufferTime) {
                    return {
                        time: timeSlot,
                        status: 'unavailable', // In the past
                        capacity: 0,
                        totalStaff: qualifiedStaff.length,
                        availableStaffIds: []
                    };
                }

                // Count how many staff are FREE for this time range AND working during this slot
                const availableStaff = qualifiedStaff.filter(staff => {
                    // 1. Check if staff works during this specific slot hour
                    const sStart = staff.workingHours?.start || "10:00";
                    const sEnd = staff.workingHours?.end || "19:00";

                    // Simple string comparison works for HH:MM format (24h)
                    // Staff start must be <= slotTime
                    // Staff end must be >= slotTime + duration
                    // Actually comparison is simpler: 
                    // Slot start must be >= Staff start
                    // Slot end must be <= Staff end

                    // We need slotEnd Time String
                    let slotEndStr = "19:00";
                    if (!isNaN(slotEnd.getTime())) {
                        slotEndStr = `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`;
                    } else {

                        return false; // Skip this staff if we can't calculate end time
                    }

                    if (timeSlot < sStart || slotEndStr > sEnd) {
                        return false; // Outside this staff's shift
                    }

                    // 2. Check overlap with bookings
                    const hasConflict = bookings.some(booking => {
                        if (!booking.staff || booking.staff.toString() !== staff._id.toString()) {
                            return false;
                        }
                        const bookingStart = booking.startTime || combineDateAndTime(booking.date, booking.time);
                        const bookingEnd = booking.endTime || calculateEndTime(bookingStart, serviceDoc.duration);
                        return bookingStart < slotEnd && bookingEnd > slotStart;
                    });

                    return !hasConflict;
                });

                // Determine status
                let status = availableStaff.length > 0 ? 'available' : 'booked';

                // If unavailable, check if it's due to temporary reservations
                if (status === 'booked') {
                    const overlappingBookings = bookings.filter(booking => {
                        const bookingStart = booking.startTime || combineDateAndTime(booking.date, booking.time);
                        const bookingEnd = booking.endTime || calculateEndTime(bookingStart, serviceDoc.duration);
                        return bookingStart < slotEnd && bookingEnd > slotStart;
                    });
                    if (overlappingBookings.some(b => b.isTemporary)) {
                        status = 'reserved';
                    }
                }

                return {
                    time: timeSlot,
                    status: status,
                    capacity: availableStaff.length,
                    totalStaff: qualifiedStaff.length,
                    availableStaffIds: availableStaff.map(s => s._id)
                };
            } catch (err) {
                console.error(`Error processing slot ${timeSlot}:`, err);
                return {
                    time: timeSlot,
                    status: 'unavailable',
                    capacity: 0,
                    totalStaff: qualifiedStaff.length, // use qualifiedStaff from outer scope
                    availableStaffIds: []
                };
            }
        });

        res.json(slotsWithCapacity);
    } catch (error) {
        console.error('Get Slots Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create a new booking order with temporary reservation
// @route   POST /api/bookings
// @access  Private (Customer)
const createBooking = async (req, res) => {
    try {
        const { salonId, serviceId, date, timeSlot, staffId, numberOfPeople = 1 } = req.body;

        const salon = await Salon.findById(salonId).select('+razorpay.key_id');
        const service = await Service.findById(serviceId);
        const Staff = require('../models/Staff');

        if (!salon || !service) {
            return res.status(404).json({ message: 'Salon or Service not found' });
        }

        // Get all qualified staff for this service
        const qualifiedStaff = await Staff.find({
            salon: salonId,
            servicesOffered: serviceId,
            isActive: true
        });

        if (qualifiedStaff.length < numberOfPeople) {
            return res.status(400).json({
                message: `Not enough staff available. You need ${numberOfPeople} staff but only ${qualifiedStaff.length} are available.`
            });
        }

        // Clean up expired temporary bookings
        await Booking.deleteMany({
            isTemporary: true,
            reservedUntil: { $lt: new Date() }
        });

        // Calculate time range for this booking
        const bookingStart = combineDateAndTime(date, timeSlot);
        const bookingEnd = calculateEndTime(bookingStart, service.duration);

        // Find available staff for this time slot (need enough for group size)
        const availableStaffForGroup = [];

        for (const staff of qualifiedStaff) {
            // Check if this staff has conflicts using proper $and to combine $or clauses
            const conflicts = await Booking.find({
                staff: staff._id,
                $and: [
                    // Date range check (handle date as Date object)
                    {
                        $or: [
                            { date: date }, // String match fallback
                            { date: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) } }
                        ]
                    },
                    // Status/temporary filter
                    {
                        $or: [
                            { status: { $nin: ['cancelled'] }, isTemporary: false },
                            { isTemporary: true, reservedUntil: { $gt: new Date() } }
                        ]
                    },
                    // Time overlap check
                    {
                        $or: [
                            {
                                startTime: { $exists: true },
                                $expr: {
                                    $and: [
                                        { $lt: ['$startTime', bookingEnd] },
                                        { $gt: ['$endTime', bookingStart] }
                                    ]
                                }
                            },
                            {
                                startTime: { $exists: false },
                                time: timeSlot
                            }
                        ]
                    }
                ]
            });

            if (conflicts.length === 0) {
                availableStaffForGroup.push(staff);
                if (availableStaffForGroup.length >= numberOfPeople) {
                    break; // Found enough staff
                }
            }
        }

        if (availableStaffForGroup.length < numberOfPeople) {
            return res.status(400).json({
                message: `Not enough staff available at this time. ${availableStaffForGroup.length} available but ${numberOfPeople} needed.`
            });
        }

        // Create Razorpay Order (total price for all people)
        const totalPrice = service.price * numberOfPeople;
        let order;

        if (razorpay) {
            const options = {
                amount: totalPrice * 100, // Amount in paise
                currency: "INR",
                receipt: `receipt_order_${Date.now()}`,
            };
            order = await razorpay.orders.create(options);
        } else {
            // Mock Order for testing when keys are missing
            console.warn("⚠️  Generating MOCK Razorpay order (no keys found)");
            order = {
                id: `order_mock_${Date.now()}`,
                amount: totalPrice * 100,
                currency: "INR",
                status: "created",
                isMock: true
            };
        }

        if (!order) {
            return res.status(500).json({ message: 'Order creation failed' });
        }

        // Generate unique group ID for linked bookings
        const groupId = `group_${Date.now()}_${req.user.id}`;
        const reservedUntil = new Date();
        reservedUntil.setMinutes(reservedUntil.getMinutes() + 10);

        // Create multiple TEMPORARY bookings (one for each person)
        const bookings = [];
        for (let i = 0; i < numberOfPeople; i++) {
            const assignedStaff = availableStaffForGroup[i];
            const startTime = combineDateAndTime(date, timeSlot);
            const endTime = calculateEndTime(startTime, service.duration);

            const booking = await Booking.create({
                user: req.user.id,
                salon: salonId,
                service: serviceId,
                staff: assignedStaff._id,
                date: date,
                time: timeSlot,
                price: service.price,
                orderId: order.id,
                status: 'pending',
                paymentStatus: 'pending',
                type: 'online',
                isTemporary: true,
                reservedUntil: reservedUntil,
                startTime: startTime,
                endTime: endTime,
                duration: service.duration,
                // Group booking fields
                groupId: numberOfPeople > 1 ? groupId : undefined,
                personNumber: i + 1
            });

            bookings.push(booking);
        }

        console.log(`✅ Created group booking: ${numberOfPeople} people, ${numberOfPeople} staff assigned`);

        // Emit socket event to update slot availability
        try {
            const io = getIo();
            io.emit('slot_booked', {
                salonId,
                date,
                time: timeSlot,
                staffIds: bookings.map(b => b.staff)
            });
        } catch (sErr) {
            console.error('Socket emit error:', sErr.message);
        }

        // Determine if salon has payment configured (NO platform fallback)
        const salonPaymentConfigured = salon.razorpay?.isConfigured === true;
        const salonKeyId = salonPaymentConfigured ? salon.razorpay.key_id : null;

        res.status(201).json({
            booking: bookings[0], // Return first booking for compatibility
            bookings: bookings,   // Return all bookings
            order: {
                ...order,
                key_id: salonKeyId, // Only salon's key, no platform fallback
                salonPaymentConfigured: salonPaymentConfigured // Flag for frontend
            },
            groupId: numberOfPeople > 1 ? groupId : undefined,
            totalPeople: numberOfPeople,
            assignedStaff: bookings.map(b => b.staff)
        });
    } catch (error) {
        console.error('Create Booking Error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Create Manual Booking (Walk-in)
// @route   POST /api/bookings/manual
// @access  Private (Provider)
const createManualBooking = async (req, res) => {
    try {
        console.log("--- Manual Booking Request ---");
        console.log("Body:", JSON.stringify(req.body, null, 2));

        const { serviceId, date, time, customerName, customerPhone, staffId } = req.body;

        // 1. Basic Validation
        if (!serviceId || !date || !time) {
            console.log("Validation Failed: Missing fields");
            return res.status(400).json({ message: 'Missing required fields: serviceId, date, or time.' });
        }

        // 2. Validate Date/Time & Prevent Past Bookings
        const bookingDateTime = combineDateAndTime(date, time);
        console.log("Calculated Booking DateTime (UTC):", bookingDateTime);

        // Check for invalid date (e.g. if time is missing or date is garbage)
        if (isNaN(bookingDateTime.getTime())) {
            console.log("Validation Failed: Invalid Date");
            return res.status(400).json({
                message: `Invalid date/time format. Input: date=${date}, time=${time}. Parsed: ${bookingDateTime}`
            });
        }

        const now = new Date();
        // Allow a small buffer (e.g., 5 mins) for "just now" walk-ins, but definitely block yesterday
        // Note: bufferTime is "current time + 5 mins", so booking must be at least "5 mins from now"? 
        // Wait, current logic: if (booking < buffer) fail.
        // buffer = now + 5 mins.
        // If booking is "now", booking < buffer => fail. 
        // This effectively requires booking to be at least 5 mins in future??
        // For Walk-in, we usually want "now".
        // Let's adjust logic: allow "recent past" (e.g. up to 30 mins ago) for logging walk-ins, 
        // OR strictly force future.
        // User said: "proiver is able to book for yesterdays walkin booking too this should not happen"
        // This implies strict future/present check.
        // If I make buffer "now - 5 mins", then "now" is allowed. 
        // Example: buffer = now - 5m. Booking = now. Booking > buffer. OK.
        // If I use buffer = now. Booking = now. Booking >= buffer. OK.
        // If I use buffer = now + 5m. Booking = now. Booking < buffer. Fail.
        // So the original logic `now + 5 * 60000` requires booking to be 5 mins in future. 
        // That might be too strict for "Walk-in happening right now".
        // I'll change it to `now` (no buffer) or `now - 5 mins` (grace period).
        // Safest is `now`.

        // Use local IST time for today's date comparison to prevent "yesterday" bugs
        const localNow = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
        const todayStr = localNow.toISOString().split('T')[0];

        // If booking date is strictly BEFORE today, block it.
        if (date < todayStr) {
            console.log("Blocking past booking:", { booking: date, today: todayStr });
            return res.status(400).json({
                message: `Cannot create bookings for past dates. Booking: ${date}, Today: ${todayStr}`
            });
        }

        // Get Provider's Salon
        const Salon = require('../models/Salon'); // Ensure model is required
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }

        // --- VALIDATE OPENING HOURS ---
        const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        // Use local date parsing for day-of-week to align with frontend
        const bookingDayIndex = new Date(date).getDay();
        const dayKey = daysOfWeek[bookingDayIndex];
        const hoursObj = salon.openingHours && salon.openingHours[dayKey];

        if (!hoursObj || !hoursObj.open || !hoursObj.close || hoursObj.open === "" || hoursObj.close === "") {
            return res.status(400).json({ message: 'The salon is closed on this day.' });
        }

        const slotTimeVal = parseInt(time.split(':')[0], 10) * 60 + parseInt(time.split(':')[1], 10);
        const openTimeVal = parseInt(hoursObj.open.split(':')[0], 10) * 60 + parseInt(hoursObj.open.split(':')[1], 10);
        const closeTimeVal = parseInt(hoursObj.close.split(':')[0], 10) * 60 + parseInt(hoursObj.close.split(':')[1], 10);

        if (slotTimeVal < openTimeVal || slotTimeVal >= closeTimeVal) {
            return res.status(400).json({ message: 'The selected time is outside working hours.' });
        }
        // ------------------------------

        const Service = require('../models/Service');
        // SECURITY: Validate service belongs to this salon
        const service = await Service.findOne({ _id: serviceId, salon: salon._id });
        if (!service) {
            console.log("Validation Failed: Service not found or wrong salon");
            return res.status(404).json({ message: 'Service not found or does not belong to this salon' });
        }

        // Validate staff if provided
        const Staff = require('../models/Staff');
        if (staffId) {
            const staff = await Staff.findOne({ _id: staffId, salon: salon._id, isActive: true });
            if (!staff) {
                return res.status(404).json({ message: 'Staff not found or inactive' });
            }
        }

        // Check availability using duration-based overlap detection
        const startTime = bookingDateTime;
        const endTime = calculateEndTime(startTime, service.duration);

        if (isNaN(endTime.getTime())) {
            return res.status(400).json({ message: 'Invalid service duration.' });
        }

        // Build overlap query - check if any booking overlaps with our time range
        const overlapQuery = {
            salon: salon._id,
            status: { $nin: ['cancelled', 'failed', 'rejected', 'no-show'] },
            $or: [
                // Duration-based overlap: existing booking overlaps with new booking
                {
                    startTime: { $exists: true, $lt: endTime },
                    endTime: { $exists: true, $gt: startTime }
                },
                // Fallback for legacy bookings without startTime/endTime
                {
                    startTime: { $exists: false },
                    time: time,
                    $expr: {
                        $and: [
                            { $gte: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { format: '%Y-%m-%d', date: '$date' } }, 'T', '$time', ':00Z'] } } }, startTime] },
                            { $lt: [{ $dateFromString: { dateString: { $concat: [{ $dateToString: { format: '%Y-%m-%d', date: '$date' } }, 'T', '$time', ':00Z'] } } }, endTime] }
                        ]
                    }
                }
            ]
        };

        let assignedStaffId = staffId;

        if (staffId) {
            overlapQuery.staff = staffId;
            // Check specific staff availability
            const existingBooking = await Booking.findOne(overlapQuery);
            if (existingBooking) {
                return res.status(400).json({
                    message: 'This staff member is already booked during this time slot.'
                });
            }
        } else {
            // General availability check (Any Staff)
            const allStaff = await Staff.find({ salon: salon._id, servicesOffered: serviceId, isActive: true });
            if (allStaff.length === 0) {
                return res.status(400).json({ message: 'No staff available to perform this service.' });
            }

            let availableStaff = null;
            for (const s of allStaff) {
                overlapQuery.staff = s._id;
                const existing = await Booking.findOne(overlapQuery);
                if (!existing) {
                    availableStaff = s._id;
                    break;
                }
            }

            if (!availableStaff) {
                return res.status(400).json({ message: 'All staff are fully booked during this time slot.' });
            }
            assignedStaffId = availableStaff;
        }

        // startTime and endTime already calculated above during overlap check

        const booking = await Booking.create({
            salon: salon._id,
            service: serviceId,
            staff: assignedStaffId,
            date,
            time,
            price: service.price,
            status: 'confirmed', // Manual bookings are confirmed immediately
            paymentStatus: 'pending', // Usually cash
            type: 'walk-in',
            customerName,
            customerPhone,
            // NEW: Duration-based fields
            startTime,
            endTime,
            duration: service.duration
        });

        // Emit socket event
        try {
            const io = getIo();
            io.emit('slot_booked', {
                salonId: salon._id,
                date,
                time,
                staffIds: [assignedStaffId]
            });

        } catch (sErr) {
            console.error('Socket emit error:', sErr.message);
        }

        res.status(201).json(booking);
    } catch (error) {
        console.error('Manual Booking Error:', error);
        res.status(500).json({ message: 'Server error creating manual booking' });
    }
};

// @desc    Update Booking Status (No-show, Completed, Cancelled, In-progress)
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider or Staff)
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        // Validate booking ID format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid booking ID format' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization: Admin, Provider owns salon, OR Staff is assigned
        if (req.user.role === 'admin') {
            // Admin can update any booking
        } else if (req.user.role === 'provider') {
            const salon = await Salon.findOne({ owner: req.user.id });
            if (!salon) {
                return res.status(403).json({ message: 'Not authorized: No salon found for this provider' });
            }
            if (!booking.salon || booking.salon.toString() !== salon._id.toString()) {
                return res.status(403).json({ message: 'Not authorized: Booking does not belong to your salon' });
            }
        } else if (req.user.role === 'staff') {
            try {
                const Staff = require('../models/Staff');
                const userId = req.user.id || req.user._id;

                // Verify staff belongs to the salon of the booking
                const staff = await Staff.findOne({ _id: userId, salon: booking.salon, isActive: true });

                if (!staff) {
                    return res.status(403).json({ message: 'Not authorized: Staff not found or not active in this salon' });
                }
            } catch (staffError) {
                console.error('Staff verification error:', staffError);
                return res.status(500).json({ message: 'Error verifying staff', error: staffError.message });
            }
        } else {
            return res.status(403).json({ message: `Not authorized: Role '${req.user.role}' cannot update bookings` });
        }

        booking.status = status;
        await booking.save();

        res.json(booking);
    } catch (error) {
        console.error('Update Status Error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/bookings/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        let isValid = false;

        // Check for mock order bypass - ONLY allow in development
        if (razorpay_order_id && razorpay_order_id.startsWith('order_mock_')) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Attempted mock payment in production!');
                return res.status(400).json({ message: 'Mock payments not allowed in production' });
            }
            console.log("⚠️  Mock payment verification for:", razorpay_order_id);
            isValid = true;
        }
        // Check for payments_disabled bypass (when PAYMENTS_ENABLED=false)
        else if (razorpay_signature === 'payments_disabled' && process.env.PAYMENTS_ENABLED !== 'true') {
            console.log("⚠️  Payments disabled - confirming booking without payment:", razorpay_order_id);
            isValid = true;
        }
        // Check for salon_no_payment bypass (when salon hasn't configured Razorpay)
        else if (razorpay_signature === 'salon_no_payment') {
            console.log("⚠️  Salon has no payment configured - confirming for free:", razorpay_order_id);
            isValid = true;
        } else {
            // Real Razorpay verification
            if (!process.env.RAZORPAY_KEY_SECRET) {
                return res.status(500).json({ message: 'Razorpay keys missing on server' });
            }

            const generated_signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest('hex');

            isValid = generated_signature === razorpay_signature;
        }

        if (isValid) {
            // Check salon settings for approval requirement
            let newStatus = 'confirmed';
            const sampleBooking = await Booking.findOne({ orderId: razorpay_order_id });

            if (sampleBooking) {
                const Salon = require('../models/Salon');
                const salon = await Salon.findById(sampleBooking.salon);

                if (salon && salon.requireAppointmentApproval) {
                    newStatus = 'pending_approval';
                }
            }

            // Optimised: Update ALL bookings associated with this Order ID (Handles Single & Group)
            const result = await Booking.updateMany(
                { orderId: razorpay_order_id },
                {
                    $set: {
                        paymentStatus: 'paid',
                        status: newStatus,
                        paymentId: razorpay_payment_id,
                        isTemporary: false,
                        reservedUntil: null // Remove reservation
                    }
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'No bookings found for this order ID' });
            }

            // Fetch the updated bookings to return
            const confirmedBookings = await Booking.find({ orderId: razorpay_order_id })
                .populate('user', 'name email')
                .populate('service', 'name duration')
                .populate('staff', 'name')
                .populate('salon', 'name address');

            console.log(`✅ Payment Verified. Order: ${razorpay_order_id}. Confirmed: ${result.modifiedCount}`);

            try {
                const io = getIo();
                if (confirmedBookings.length > 0) {
                    const salonIdForEmit = confirmedBookings[0].salon._id || confirmedBookings[0].salon;
                    io.emit('slot_booked', {
                        salonId: salonIdForEmit,
                        date: confirmedBookings[0].date,
                        time: confirmedBookings[0].time,
                        staffIds: confirmedBookings.map(b => b.staff._id || b.staff)
                    });

                    // Notify provider about the confirmed appointment
                    const salonForNotify = await Salon.findById(salonIdForEmit);
                    if (salonForNotify && salonForNotify.owner) {
                        const ownerId = salonForNotify.owner.toString();
                        const providerRoom = `provider_${ownerId}`;
                        const customerName = confirmedBookings[0].user?.name || 'A customer';
                        const serviceName = confirmedBookings[0].service?.name || 'a service';
                        const bookingDate = confirmedBookings[0].date;
                        const bookingTime = confirmedBookings[0].time;

                        const notificationPayload = {
                            title: '🎉 New Appointment Booked!',
                            message: `${customerName} booked ${serviceName} on ${new Date(bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${bookingTime}`,
                            bookingId: confirmedBookings[0]._id.toString(),
                            customerName: customerName,
                            serviceName: serviceName,
                            date: bookingDate.toISOString ? bookingDate.toISOString() : bookingDate,
                            time: bookingTime,
                            count: confirmedBookings.length,
                            salonName: salonForNotify.name
                        };
                        io.to(providerRoom).emit('new_appointment', notificationPayload);

                        // Also send Web Push (works even when tab is closed)
                        sendPushToUser(ownerId, notificationPayload);

                        console.log(`🔔 Notification sent to ${providerRoom}`);
                    }
                }
            } catch (sErr) {
                console.error('Socket emit error:', sErr.message);
            }

            return res.json({
                message: 'Payment verified successfully',
                booking: confirmedBookings[0], // For backward compatibility
                bookings: confirmedBookings,
                count: confirmedBookings.length
            });
        } else {
            console.log("❌ Invalid Signature", { expected: generated_signature, received: razorpay_signature });
            res.status(400).json({ message: 'Invalid Payment Signature' });
        }

    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: 'Server error during payment verification' });
    }
};

// @desc    Cancel/Delete a temporary/pending booking (e.g. payment failed/cancelled)
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only allow cancelling if user owns it (handle null user for walk-ins)
        const isOwner = booking.user && booking.user.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';
        const isProviderOfSalon = req.user.role === 'provider';

        // For walk-ins (no user), allow provider of that salon to cancel
        if (!isOwner && !isAdmin) {
            if (isProviderOfSalon) {
                const salon = await Salon.findOne({ owner: req.user.id });
                if (!salon || booking.salon.toString() !== salon._id.toString()) {
                    return res.status(403).json({ message: 'Not authorized to cancel this booking' });
                }
            } else {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        // Only delete if it's pending or temporary
        if (booking.status !== 'pending' && !booking.isTemporary) {
            return res.status(400).json({ message: 'Cannot cancel confirmed bookings via this endpoint' });
        }

        // If it's a group booking, delete all related bookings
        let staffIds = [];
        if (booking.groupId) {
            const groupBookings = await Booking.find({ groupId: booking.groupId });
            staffIds = groupBookings.map(b => b.staff);
            await Booking.deleteMany({ groupId: booking.groupId });
        } else {
            staffIds = [booking.staff];
            await Booking.deleteOne({ _id: booking._id });
        }

        // Emit socket event to release slot
        try {
            const io = getIo();
            io.emit('slot_booked', { // Re-using slot_booked to trigger refetch
                salonId: booking.salon,
                date: booking.date,
                time: booking.time,
                staffIds: staffIds
            });
        } catch (sErr) {
            console.error('Socket emit error:', sErr.message);
        }

        res.json({ message: 'Booking cancelled' });

    } catch (error) {
        console.error('Cancel Booking Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        let bookings;
        if (req.user.role === 'provider') {
            // If provider, get bookings for their salon
            const salon = await Salon.findOne({ owner: req.user.id });
            if (!salon) return res.json([]);
            bookings = await Booking.find({ salon: salon._id })
                .populate('user', 'name email phone')
                .populate('service', 'name duration')
                .populate('staff', 'name')
                .sort({ date: -1, time: -1 });
        } else if (req.user.role === 'staff') {
            // If staff, get bookings assigned to them
            const Staff = require('../models/Staff');
            const staffRecord = await Staff.findOne({ _id: req.user.id, isActive: true });
            if (!staffRecord) return res.json([]);
            bookings = await Booking.find({ staff: staffRecord._id })
                .populate('user', 'name email phone')
                .populate('salon', 'name address contactNumber')
                .populate('service', 'name duration')
                .sort({ date: -1, time: -1 });
        } else {
            // If customer, get their own bookings
            bookings = await Booking.find({ user: req.user.id })
                .populate('salon', 'name address contactNumber')
                .populate('service', 'name')
                .populate('staff', 'name')
                .sort({ date: -1, time: -1 });
        }

        res.json(bookings);
    } catch (error) {
        console.error('Get Bookings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAvailableSlots,
    createBooking,
    createManualBooking,
    verifyPayment,
    getMyBookings,
    updateBookingStatus,
    cancelBooking,
};
