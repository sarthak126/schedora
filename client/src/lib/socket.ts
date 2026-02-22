import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
});

export const connectSocket = (salonId: string) => {
    if (!socket.connected) {
        socket.connect();
    }
    socket.emit('join_salon', salonId);
};

// Connect as provider to receive personal notifications
export const connectAsProvider = (userId: string) => {
    if (!socket.connected) {
        socket.connect();
    }
    socket.emit('join_provider', userId);
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
