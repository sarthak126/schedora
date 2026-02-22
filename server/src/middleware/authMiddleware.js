const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Try to get user from User model first
            let user = await User.findById(decoded.id).select('-password');
            let isStaff = false;

            // If not found in User, check Staff model
            if (!user) {
                const Staff = require('../models/Staff');
                user = await Staff.findById(decoded.id).select('-password');
                if (user) {
                    isStaff = true;
                }
            }

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // For staff members, explicitly set auth role to 'staff'
            // (user.role contains their job title like "Hair Stylist")
            req.user = {
                ...user.toObject(),
                id: user._id.toString(), // Ensure ID is always a string
                role: isStaff ? 'staff' : user.role,
                jobRole: isStaff ? user.role : undefined // Preserve job title
            };

            next();
        } catch (error) {
            console.log(error);
            res.status(401).json({ message: 'Not authorized' });
        }
    } else if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
        }
        next();
    }
}

module.exports = { protect, authorize };
