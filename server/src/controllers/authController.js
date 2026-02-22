const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'customer',
            phone: phone || null,
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔐 Login Attempt: ${email}`);

        // 1. Check User
        let user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            return res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token: generateToken(user._id),
            });
        }

        // 2. Check Staff if User not found
        // Only require if needed, or check if already required. 
        // Based on broken code, it was required inside? Let's safeguard.
        // Assuming Staff model exists.
        try {
            const Staff = require('../models/Staff');
            const staff = await Staff.findOne({ email }).select('+password');

            if (staff && (await bcrypt.compare(password, staff.password))) {
                return res.json({
                    _id: staff.id,
                    name: staff.name,
                    email: staff.email,
                    role: 'staff',
                    availabilityStatus: staff.availabilityStatus,
                    token: generateToken(staff._id),
                });
            }
        } catch (err) {
            console.log('Staff check skipped or failed:', err.message);
        }

        console.log(`❌ Login Failed: Invalid credentials (${email})`);
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
        });
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error retrieving profile' });
    }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone
        };

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
        });
    } catch (error) {
        console.error('Update Details Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    updateDetails
};
