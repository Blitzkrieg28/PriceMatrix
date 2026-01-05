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
        console.log(" Socket.io Initialized!");
        return io;
    },

    broadcastLog: (message, type = "info") => {
        if (!io) return; 
        
        io.emit("server-log", {
            message,
            type, 
            timestamp: new Date().toISOString()
        });
    }
};