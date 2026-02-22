const Service = require('../models/Service');
const Salon = require('../models/Salon');

// @desc    Get services for a specific salon
// @route   GET /api/services/salon/:salonId
// @access  Public
const getSalonServices = async (req, res) => {
    try {
        const services = await Service.find({ salon: req.params.salonId });
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Add a service
// @route   POST /api/services
// @access  Private (Provider)
const addService = async (req, res) => {
    try {
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found. Create profile first.' });
        }

        if (salon.status !== 'approved') {
            return res.status(403).json({ message: 'Your salon is pending approval or rejected. Contact Admin.' });
        }

        const newService = await Service.create({
            salon: salon._id,
            ...req.body
        });

        res.status(201).json(newService);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all services for current salon
// @route   GET /api/services
// @access  Private (Provider)
const getServices = async (req, res) => {
    try {
        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon) {
            // Return empty array (200 OK) instead of 404
            return res.json([]);
        }
        const services = await Service.find({ salon: salon._id });
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Provider)
const updateService = async (req, res) => {
    try {
        let service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: 'Service not found' });

        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon || service.salon.toString() !== salon._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(service);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Provider)
const deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: 'Service not found' });

        const salon = await Salon.findOne({ owner: req.user.id });
        if (!salon || service.salon.toString() !== salon._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Service.deleteOne({ _id: service._id });
        res.json({ message: 'Service removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    addService,
    getServices,
    getSalonServices,
    updateService,
    deleteService
};
