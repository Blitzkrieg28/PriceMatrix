const { Server } = require("socket.io");

let io = null;

module.exports = {
    init: (httpServer) => {
        
        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

        io = new Server(httpServer, {
            cors: {
                origin: FRONTEND_URL,
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        console.log(`Socket.io Initialized!`); 
        console.log(`-> CORS Origin Allowed: ${FRONTEND_URL}`);

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized! Call init() first.");
        }
        return io;
    }
};