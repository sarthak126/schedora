const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        process.env.CLIENT_URL,
    ].filter(Boolean);

    io = socketIo(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id} (Total: ${io.sockets.sockets.size})`);

        socket.on('join_salon', (salonId) => {
            socket.join(`salon_${salonId}`);
        });

        // Provider joins their personal notification room
        socket.on('join_provider', (userId) => {
            if (userId) {
                socket.join(`provider_${userId}`);
                console.log(`📡 Provider ${userId} joined notification room`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
        });
    });

    console.log('✅ Socket.io initialized');
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };
