const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"],
    },
});

const rooms = {};

// Serve the built game files from the 'dist' directory
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Periodically send the list of available rooms to all connected clients
    const roomInterval = setInterval(() => {
        const roomList = Object.keys(rooms).map((name) => ({
            name,
            playerCount: Object.keys(rooms[name].players).length,
        }));
        socket.emit("roomList", roomList);
    }, 2000);

    socket.on("createRoom", ({ roomName, isPlayer }) => {
        if (rooms[roomName]) {
            return socket.emit("error", "Room with this name already exists.");
        }
        rooms[roomName] = {
            hostId: socket.id,
            players: {},
        };
        rooms[roomName].players[socket.id] = { id: socket.id, isPlayer };
        socket.join(roomName);
        console.log(`Room "${roomName}" created by ${socket.id}`);
        socket.emit("roomCreated", {
            roomName,
            players: rooms[roomName].players,
        });
    });

    socket.on("joinRoom", ({ roomName }) => {
        const room = rooms[roomName];
        if (!room) {
            return socket.emit("error", "Room not found.");
        }
        if (Object.keys(room.players).length >= 6) {
            return socket.emit("error", "Room is full.");
        }

        // The first player to join is always a player, subsequent can be spectators if they chose so in a more advanced setup.
        // For now, everyone who joins is a player.
        room.players[socket.id] = { id: socket.id, isPlayer: true };
        socket.join(roomName);
        console.log(`${socket.id} joined room "${roomName}"`);

        // Notify existing players about the new peer
        socket.to(roomName).emit("newPeer", socket.id);

        // Send room info to the new player
        socket.emit("joinedRoom", {
            roomName,
            hostId: room.hostId,
            players: room.players,
        });

        // Update player list for everyone in the room
        io.to(roomName).emit("playerList", Object.values(room.players));
    });

    socket.on("signal", ({ to, signal }) => {
        io.to(to).emit("signal", { from: socket.id, signal });
    });

    socket.on("startGame", ({ roomName }) => {
        const room = rooms[roomName];
        if (room && room.hostId === socket.id) {
            console.log(
                `Host ${socket.id} is starting game in room "${roomName}"`
            );
            io.to(roomName).emit("gameStarted", room.players);
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        clearInterval(roomInterval);
        for (const roomName in rooms) {
            const room = rooms[roomName];
            if (room.players[socket.id]) {
                delete room.players[socket.id];
                io.to(roomName).emit("peerDisconnect", socket.id);
                io.to(roomName).emit("playerList", Object.values(room.players));

                if (Object.keys(room.players).length === 0) {
                    delete rooms[roomName];
                    console.log(
                        `Room "${roomName}" is now empty and has been closed.`
                    );
                } else if (room.hostId === socket.id) {
                    // Simple host migration: promote the next player to host
                    const newHostId = Object.keys(room.players)[0];
                    room.hostId = newHostId;
                    io.to(roomName).emit("newHost", newHostId); // A client-side event you might want to handle
                    console.log(
                        `Host disconnected. New host of room "${roomName}" is ${newHostId}`
                    );
                }
                break;
            }
        }
    });
});

// Fallback to serving the index.html for any request that doesn't match a static file
app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

