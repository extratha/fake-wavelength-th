import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { pairWords as fullPairWords, PairWord } from './constant/pairWords';

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

type TeamKey = "teamA" | "teamB"
type ScoreType = Record<TeamKey, number>

type GameState = {
  roomId: string;
  clueGiver: string | null;
  turn: TeamKey | null;
  scores: ScoreType;
  pairWords: PairWord | null;
  allPairWords: PairWord[];
  answerPosition: number | null;
  guessPosition: number | null;
  clue: string | null;
  teamA: string[];
  teamB: string[];
  users: { userId: string; name: string, team?: string }[];
  hostId: string;
  dialRotation: number;
  screenOpen: boolean;
  markerRotation: number;
};

type RoomType = {
  users: Map<string, { name: string; userId: string; team?: string }>;
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

function setNewHost(roomId: string, userId: string) {
  const room = rooms[roomId]
  const newHost = room.users.get(userId)
  if (!newHost) {
    console.log("ERROR not found new host to update ")
    return
  }
  room.hostId = newHost.userId;
  io.to(roomId).emit("newHost", { userId: newHost.userId, name: newHost.name });
  console.log("New host is : ", newHost.name)
}

function getFreshPairWords(): PairWord[] {
  return fullPairWords.map(p => ({ ...p }));
}

function getUnusedPair(room: RoomType): PairWord | null {
  const available = room.state.allPairWords?.filter(p => !p.used);
  if (!available || available.length === 0) return null;
  const selected = available[Math.floor(Math.random() * available.length)];
  selected.used = true;
  room.state.pairWords = selected;
  return selected;
}

function resetPairWords(room: RoomType) {
  for (const p of room.state.allPairWords) {
    p.used = false;
  }
  room.state.pairWords = null;
}

io.on("connection", (socket) => {

  socket.on("getAvailableRooms", (callback) => {
    const availableRooms = Object.keys(rooms);
    console.log('Available rooms : ', availableRooms)
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
          turn: null,
          pairWords: null,
          allPairWords: getFreshPairWords(),
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

  socket.on("joinRoom", ({ roomId, userId, name }, callback) => {
    console.log('joining', roomId)
    cancelRoomDeletion(roomId)

    const existingRoom = rooms[roomId];
    if (!existingRoom) {
      if (callback) callback({ success: false, message: "ห้องนี้ไม่มีในระบบ" });
      return;
    }

    existingRoom.users.set(userId, { name, userId });
    socket.join(roomId);
    socket.userId = userId;

    if (existingRoom.users.size === 1) {
      setNewHost(roomId, userId)
      console.log(`⚡ ${name} (${userId}) is now host in room ${roomId}`);
    }

    if (callback) callback({
      success: true,
      currentHostId: existingRoom.hostId
    });

    updateRoomState(roomId, existingRoom)

    console.log(`${name} (${userId}) "JOINED" room ${roomId}`);
  });

  socket.on('assignHost', ({ roomId, userId, targetToHostId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const targetToHost = room.users.get(targetToHostId)
    if (!targetToHost) return;
    setNewHost(roomId, targetToHostId)
    updateRoomState(roomId, room)
    console.log(`${userId} has set ${targetToHost.name} to HOST `)
  })

  socket.on("leaveRoom", ({ roomId, userId, name }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.users.delete(userId);
    socket.leave(roomId);
    console.log(`${userId} (${name}) "LEFTED" room ${roomId}`);

    // socket.emit('forceLeftRoom')

    // ถ้า host ออก ให้ตั้ง host ใหม่
    if (room.hostId === userId) {
      const users = Array.from(room.users.values()); if (users.length > 0) {
        const newHost = users[Math.floor(Math.random() * users.length)];
        setNewHost(roomId, newHost.userId)
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
        setNewHost(roomId, newHost.userId)
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

  socket.on('updateTeamScore', ({ roomId, team, score, method }) => {
    const room = rooms[roomId]
    if (!room) return

    const teamType = team as TeamKey
    const currentScore = room.state.scores[teamType]
    room.state.scores[teamType] =
      method === '+' ? currentScore + score : currentScore - score;

    console.log('Score update at ', teamType, method, score, 'score')
    updateRoomState(roomId, room);
  })

  socket.on('setTurnOfTeam', ({ roomId, team }) => {
    const room = rooms[roomId]
    if (!room) return

    room.state.turn = team
    console.log('Now is ', team, "'s turn")
    updateRoomState(roomId, room);

  })

  socket.on('userUpdateThierTeam', ({ roomId, userId, team }) => {
    const room = rooms[roomId]
    if (!room) return

    const user = room.users.get(userId)
    if (!user) {
      console.log('Cannot update team. Not found user')
      return
    }

    user.team = team
    updateRoomState(roomId, room)
    console.log(`${user.name} has joined ${team === 'teamA' ? 'TEAM A' : 'TEAM B'}. `)
  })

  socket.on('randomizeTeam', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return

    const users = Array.from(room.users.values())
    if (users.length === 0) return

    // สุ่มผู้เล่นทั้งหมด
    const shuffledUsers = users.sort(() => Math.random() - 0.5)

    let teamA: typeof users = []
    let teamB: typeof users = []

    if (users.length === 1) {
      // ถ้ามีคนเดียว สุ่มลงทีมใดทีมหนึ่ง
      if (Math.random() < 0.5) teamA.push(shuffledUsers[0])
      else teamB.push(shuffledUsers[0])
    } else {
      // ถ้ามีมากกว่า 1 คน แบ่งให้ทั้ง 2 ทีมมีอย่างน้อย 1 คน
      const mid = Math.floor(shuffledUsers.length / 2)

      // ถ้า 2 คน: A = 1, B = 1
      // ถ้า 3 คน: A = 1, B = 2
      // ถ้า 4 คน: A = 2, B = 2
      teamA = shuffledUsers.slice(0, mid)
      teamB = shuffledUsers.slice(mid)

      // แก้กรณีพิเศษ ถ้า mid = 0 เช่นกรณี users.length = 2 แล้ว Math.floor(1) = 0
      if (teamA.length === 0) {
        teamA.push(teamB.pop()!) // ดึง 1 คนจาก B ไป A
      }
    }

    // ตั้งค่า team ใหม่ให้ผู้เล่น
    for (const user of teamA) {
      user.team = 'teamA'
    }
    for (const user of teamB) {
      user.team = 'teamB'
    }

    updateRoomState(roomId, room)

    console.log(`[Room ${roomId}] Teams randomized: ${teamA.map(u => u.name).join(', ')} → TEAM A | ${teamB.map(u => u.name).join(', ')} → TEAM B`)
  })

  socket.on('randomPairWord', ({ roomId }, callback) => {
    const room = rooms[roomId]
    if (!room) return

    const result = getUnusedPair(room)
    if (!result) {
      callback({ success: false, message: 'คำหมดแล้ว กรุณา reset ก่อน' })

      console.log('No unused pair words left')
      return
    }

    updateRoomState(roomId, room)
    const left = room.state.pairWords ? room.state.pairWords.words[0] : ''
    const right = room.state.pairWords ? room.state.pairWords.words[1] : ''
    console.log('Random pair word current words are ', left, right)
  })

  socket.on('resetPairWord', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return

    resetPairWords(room)
    updateRoomState(roomId, room)
    console.log('Reset pair word success ')
  })


});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
