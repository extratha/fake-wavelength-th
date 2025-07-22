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
  roomId: string;
  clueGiver: string | null;
  scores: Record<string, number>;
  promptPair: [string, string] | null;
  answerPosition: number | null;
  guessPosition: number | null;
  clue: string | null;
  teamA: string[];
  teamB: string[];
  users: { userId: string; name: string }[];
  hostId: string;
  dialRotation: number;
  screenOpen: boolean;
  markerRotation: number;
};

type RoomType = {
  users: Map<string, { name: string; userId: string }>;
  state: GameState;
  hostId: string
}

const rooms: Record<string, RoomType> = {};

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

function updateRoomState(roomId: string, room: RoomType) {
  const gameStateWithUsers: GameState = {
    ...room.state,
    hostId: room.hostId,
    users: Array.from(room.users.values()),
  };
  console.log('server emit game state to client ')
  io.to(roomId).emit("gameStateUpdate", gameStateWithUsers);
}

io.on("connection", (socket) => {

  socket.on("getAvailableRooms", (callback) => {
    const availableRooms = Object.keys(rooms);
    console.log('available rooms ', rooms)
    callback(availableRooms);
  });

  socket.on("createRoom", ({ room, name, userId }, callback) => {
    if (rooms[room]) {
      if (callback) callback({ success: false, message: "ห้องนี้มีอยู่แล้ว ไม่สามารถสร้างซ้ำได้" });
    } else {

      const user = { name, userId };
      rooms[room] = {
        users: new Map([[userId, user]]),
        state: {
          clueGiver: null,
          scores: {
            teamA: 0,
            teamB: 0,
          },
          promptPair: null,
          answerPosition: null,
          guessPosition: null,
          clue: null,
          teamA: [],
          teamB: [],
          users: [user],
          hostId: userId,
          roomId: room,
          dialRotation: 0,
          screenOpen: false,
          markerRotation: 0,
        },
        hostId: userId,
      };

      socket.join(room);
      socket.userId = userId

      console.log(`Room ${room} created by ${name} (${userId})`);

      io.emit("updateRooms", Object.keys(rooms));
      if (callback) callback({ success: true });

      updateRoomState(room, rooms[room]);
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

    updateRoomState(room, existingRoom)

    console.log(`${name} (${userId}) joined room ${room}`);
  });

  socket.on("leaveRoom", ({ roomId, userId, name }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.users.delete(userId);
    socket.leave(roomId);
    console.log(`${userId} (${name}) left room ${roomId}`);

    socket.emit('forceLeftRoom')

    // ถ้า host ออก ให้ตั้ง host ใหม่
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
    updateRoomState(roomId, room)


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


  socket.on("assignClueGiver", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // ตรวจสอบว่าผู้เล่นอยู่ในห้อง
    const user = room.users.get(userId);
    if (!user) return;

    room.state.clueGiver = userId;
    console.log(`🎯 ${user.name} (${userId}) is now Clue Giver in room ${roomId}`);

    updateRoomState(roomId, room);
  });

  socket.on("kickUser", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (!room.users.has(userId)) return;

    room.users.delete(userId);

    // เตะผู้ใช้จาก room (server-side)
    io.to(roomId).emit("userKicked", { userId });

    // ถ้า host โดนเตะด้วย (จริง ๆ ไม่ควร allow เตะ host แต่กันไว้ก่อน)
    if (room.hostId === userId) {
      const remainingUsers = Array.from(room.users.values());
      if (remainingUsers.length > 0) {
        const newHost = remainingUsers[Math.floor(Math.random() * remainingUsers.length)];
        room.hostId = newHost.userId;
        io.to(roomId).emit("newHost", { userId: newHost.userId, name: newHost.name });
      } else {
        room.hostId = "";
      }
    }

    updateRoomState(roomId, room);

    // ลบออกจาก socket room
    const sockets = io.sockets.sockets;
    for (const [, s] of sockets) {
      if (s.userId === userId) {
        s.leave(roomId);
        s.emit("forceLeftRoom"); // แจ้งฝั่ง client ให้ออกจาก room
        break;
      }
    }

    // ถ้าไม่มีใครในห้องแล้ว
    if (room.users.size === 0 && !roomTimeouts[roomId]) {
      scheduleRoomDeletion(roomId);
    }

    console.log(`❌ ${userId} kicked from room ${roomId}`);
  });


  // WHEEL ACTION 
  socket.on("updateDialRotation", ({ roomId, rotation, userName }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state.dialRotation = rotation;
    console.log(`${userName} has updateDialRotation : ${rotation}`)
    updateRoomState(roomId, room);
  });

  socket.on("toggleScreen", ({ roomId, screenOpen, userName }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.state.screenOpen = screenOpen;
    console.log(`${userName} has updated screenOpen : ${screenOpen}`)
    updateRoomState(roomId, room);
  });

  socket.on("randomizeMarker", ({ roomId, rotation, userName }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.state.markerRotation = rotation;
    console.log(`${userName} has updated randomizeMarker : ${rotation}`)
    updateRoomState(roomId, room);
  });

  // TODO adjust team score event

});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
