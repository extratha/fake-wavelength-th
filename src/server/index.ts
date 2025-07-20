import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

declare module "socket.io" {
  interface Socket {
    userId?: string;
  }
}
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

type GameState = {
  phase: "waiting" | "playing" | "ended";
  clueGiver: string | null;
  scores: Record<string, number>;
};

const rooms: Record<
  string,
  {
    users: Map<string, { name: string; userId: string }>;
    state: GameState;
    hostId: string
  }
> = {};

const roomTimeouts: Record<string, NodeJS.Timeout> = {};
function scheduleRoomDeletion(roomId: string) {
  if (roomTimeouts[roomId]) return;

  roomTimeouts[roomId] = setTimeout(() => {
    if (rooms[roomId]?.users.size === 0) {
      delete rooms[roomId];
      console.log(`💥 Room ${roomId} deleted`);
      io.emit("updateRooms", Object.keys(rooms));
    }
    delete roomTimeouts[roomId];
  }, 10000);
}
function cancelRoomDeletion(roomId: string) {
  if (roomTimeouts[roomId]) {
    clearTimeout(roomTimeouts[roomId]);
    delete roomTimeouts[roomId];
  }
}

io.on("connection", (socket) => {

  socket.on("getAvailableRooms", (callback) => {
    const availableRooms = Object.keys(rooms);
    callback(availableRooms);
  });

  socket.on("createRoom", ({ room, name, userId }, callback) => {
    if (rooms[room]) {
      if (callback) callback({ success: false, message: "ห้องนี้มีอยู่แล้ว ไม่สามารถสร้างซ้ำได้" });
    } else {
      rooms[room] = {
        users: new Map(),
        state: {
          phase: "waiting",
          clueGiver: null,
          scores: {},
        },
        hostId: userId,
      };
      rooms[room].users.set(userId, { name, userId });
      socket.join(room);
      socket.userId = userId
      console.log(`Room ${room} created by ${name} (${userId})`);
      console.log("Current rooms info:", rooms);
      io.emit("updateRooms", Object.keys(rooms));
      if (callback) callback({ success: true });
    }
  });

  socket.on("joinRoom", ({ room, userId, name }, callback) => {
    cancelRoomDeletion(room)

    const existingRoom = rooms[room];
    if (!existingRoom) {
      if (callback) callback({ success: false, message: "ห้องนี้ไม่มีในระบบ" });
      return;
    }

    existingRoom.users.set(userId, { name, userId });
    socket.join(room);
    socket.userId = userId;

    if (existingRoom.users.size === 1) {
      existingRoom.hostId = userId;
      io.to(room).emit("newHost", { userId, name });
      console.log(`⚡ ${name} (${userId}) is now host in room ${room}`);
    }

    if (callback) callback({
      success: true,
      currentHostId: existingRoom.hostId
    });

    console.log(`${name} (${userId}) joined room ${room}`);
  });

  socket.on("leaveRoom", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.users.delete(userId);
    socket.leave(roomId);
    console.log(`${userId} left room ${roomId}`);
    socket.emit('forceLeftRoom')

    // ถ้า host ออก ให้ตั้ง host ใหม่
    console.log('host :', room.hostId, 'leaved user :', userId)
    if (room.hostId === userId) {
      const users = Array.from(room.users.values()); if (users.length > 0) {
        const newHost = users[Math.floor(Math.random() * users.length)];
        room.hostId = newHost.userId;
        console.log('New host is ', newHost.name)
        io.to(roomId).emit("newHost", { userId: newHost.userId, name: newHost.name });
      } else {
        room.hostId = "";
      }
    }

    if (room.users.size === 0 && !roomTimeouts[roomId]) {
      scheduleRoomDeletion(roomId)
    }
  });

  socket.on("disconnect", (reason) => {
    const userId = socket.userId;
    if (!userId) return;

    console.log(`❌ User ${userId} disconnected: ${reason}`);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.users.has(userId)) {
        room.users.delete(userId);
        console.log(`User ${userId} removed from room ${roomId} on disconnect`);

        if (room.users.size === 0 && !roomTimeouts[roomId]) {
          scheduleRoomDeletion(roomId);
        }
      }
    }
  });

  socket.on("reconnect", () => {
    console.log("✅ reconnect success");
  });

});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
