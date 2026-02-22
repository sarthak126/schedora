const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const http = require('http');
const { initSocket } = require('./src/socket');

// Connect to Database
const mongoose = require('mongoose');

connectDB();

mongoose.connection.on('error', err => {
    console.error(`MongoDB Connection Error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB Disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB Reconnected');
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
