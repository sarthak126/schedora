const io = require("socket.io-client");
const socket = io("http://localhost:5000");

socket.on("connect", () => {
    console.log("Connected to test socket!");

    // We listen to the socket globally or we just mock a booking
});
