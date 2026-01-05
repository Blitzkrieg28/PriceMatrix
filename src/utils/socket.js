const { Server } = require("socket.io");

let io = null;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: "*", 
                methods: ["GET", "POST"]
            }
        });
        console.log("Socket.io Initialized!");
        return io;
    },

    getIO: () => {
        if (!io) {
            return null;
        }
        return io;
    }
};