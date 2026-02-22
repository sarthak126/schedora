const io = require("socket.io-client");
const socket = io("http://localhost:5000");

// Get the user ID from the login bypass or direct DB query
// Wait, I can just listen to ALL rooms by tweaking the server, or I can find a provider ID!
// Let's first connect and see...
socket.on("connect", () => {
    console.log("Connected to local socket:", socket.id);

    // Attempt to join a known provider ID or we can just send the test notification
    const testProviderId = "test_provider_" + Date.now();

    socket.emit("join_provider", testProviderId);
    console.log("Joined provider room:", testProviderId);

    // Call test API
    const http = require("http");
    http.get(`http://localhost:5000/api/test-notification/${testProviderId}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => console.log("Test API Response:", data));
    });
});

socket.on("new_appointment", (data) => {
    console.log("🔔 RECEIVED new_appointment:", JSON.stringify(data, null, 2));
    process.exit(0);
});

// timeout after 5s
setTimeout(() => {
    console.log("Timeout waiting for notification");
    process.exit(1);
}, 5000);
