import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

// สร้าง express app
const app = express();
const httpServer = createServer(app);

// ใช้ socket.io กับ CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*", // ปรับตาม domain จริงตอน deploy
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// เริ่มต้นตัวแปร rooms
const rooms: Record<
  string,
  {
    users: Set<string>;
  }
> = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", ({ room, name }) => {
    if (rooms[room]) {
      socket.emit("roomExists");
    } else {
      rooms[room] = { users: new Set() };
      rooms[room].users.add(name);
      socket.join(room);
      socket.emit("roomCreated");
      console.log(`Room ${room} created by ${name}`);
    }
  });

  socket.on("joinRoom", ({ room, name }) => {
    if (rooms[room]) {
      rooms[room].users.add(name);
      socket.join(room);
      socket.emit("roomJoined"); // เปลี่ยนชื่อ event เพื่อความชัดเจน
      console.log(`${name} joined room ${room}`);
    } else {
      socket.emit("roomError", "ห้องนี้ไม่มีอยู่");
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // อาจเพิ่ม logic เพื่อลบผู้ใช้จาก rooms
  });
});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
