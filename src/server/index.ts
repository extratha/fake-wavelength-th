import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
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

app.get("/", (req, res) => {
  res.send("Server is running");
});

type TeamKey = "teamA" | "teamB"
type ScoreType = Record<TeamKey, number>

type GameState = {
  roomId: string;
  clueGiver: string | null;
  turn: TeamKey | null;
  clue: string;
  scores: ScoreType;
  pairWords: PairWord | null;
  allPairWords: PairWord[];
  answerPosition: number | null;
  guessPosition: number | null;
  teamA: string[];
  teamB: string[];
  users: { userId: string; name: string, team?: string }[];
  hostId: string;
  dialRotation: number;
  screenOpen: boolean;
  markerRotation: number;
  disableRandomMaker: boolean; 
  disableSubmitClue: boolean;
};

// state ที่ส่งไป client: ไม่มีรายการคำทั้งหมด และ markerRotation อาจเป็น null (ซ่อนจากคนที่ยังไม่ควรเห็น)
type ClientGameState = Omit<GameState, 'allPairWords' | 'markerRotation'> & {
  markerRotation: number | null;
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
  }, 60000);
}
function cancelRoomDeletion(roomId: string) {
  if (roomTimeouts[roomId]) {
    clearTimeout(roomTimeouts[roomId]);
    delete roomTimeouts[roomId];
  }
}

function updateRoomState(roomId: string, room: RoomType) {
  // allPairWords ใช้แค่ฝั่ง server (สุ่มคำ) ไม่ต้องส่งไป client ทุกครั้ง เพื่อลดขนาด payload
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { allPairWords, ...stateForClient } = room.state;
  const gameStateWithUsers: ClientGameState = {
    ...stateForClient,
    hostId: room.hostId,
    users: Array.from(room.users.values()),
  };
  console.log('server emit game state to client ')

  // ส่งแยกทีละคน: ตำแหน่งเป้า (markerRotation) ส่งให้เฉพาะคนให้คำใบ้ หรือทุกคนเมื่อเปิดคะแนนแล้ว
  // ถ้าส่งให้ทุกคนแล้วแค่ซ่อนใน UI ผู้เล่นจะเปิด DevTools ดูคำตอบได้
  const socketIdsInRoom = io.sockets.adapter.rooms.get(roomId) ?? new Set<string>();
  for (const socketId of socketIdsInRoom) {
    const roomSocket = io.sockets.sockets.get(socketId);
    if (!roomSocket) continue;

    const canSeeMarker = room.state.screenOpen || roomSocket.userId === room.state.clueGiver;
    roomSocket.emit("gameStateUpdate", {
      ...gameStateWithUsers,
      markerRotation: canSeeMarker ? room.state.markerRotation : null,
    });
  }
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

const DISCONNECT_GRACE_PERIOD_MS = 5000;

// ผู้ใช้คนนี้ยังมี socket ที่ต่ออยู่ในห้องนี้ไหม (เช่น reconnect กลับมาแล้ว หรือเปิดอีกแท็บอยู่)
function isUserConnectedToRoom(userId: string, roomId: string) {
  for (const [, connectedSocket] of io.sockets.sockets) {
    if (connectedSocket.userId === userId && connectedSocket.rooms.has(roomId)) {
      return true;
    }
  }
  return false;
}

function removeDisconnectedUser(userId: string) {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room.users.has(userId)) continue;
    if (isUserConnectedToRoom(userId, roomId)) continue;

    room.users.delete(userId);
    console.log(`User ${userId} removed from room ${roomId} on disconnect`);

    // ถ้า host หลุด ให้ตั้ง host ใหม่ (เหมือน leaveRoom) ไม่งั้นห้องจะไม่มีใครควบคุมได้
    if (room.hostId === userId) {
      const remainingUsers = Array.from(room.users.values());
      if (remainingUsers.length > 0) {
        const newHost = remainingUsers[Math.floor(Math.random() * remainingUsers.length)];
        setNewHost(roomId, newHost.userId)
      } else {
        room.hostId = "";
      }
    }

    // แจ้งคนที่เหลือในห้อง ให้รายชื่อผู้เล่นอัปเดต
    updateRoomState(roomId, room);

    if (room.users.size === 0 && !roomTimeouts[roomId]) {
      scheduleRoomDeletion(roomId);
    }
  }
}

type RoomRole = 'host' | 'clueGiver';

// ตรวจสิทธิ์ฝั่ง server: client ส่ง event อะไรมาก็ได้ จึงต้องเช็คว่าคนส่ง (socket.userId) มีสิทธิ์จริง
function isRoomMember(socket: Socket, room: RoomType) {
  return !!socket.userId && room.users.has(socket.userId);
}

function canControlRoom(socket: Socket, room: RoomType, allowedRoles: RoomRole[]) {
  if (!isRoomMember(socket, room)) return false;
  if (allowedRoles.includes('host') && room.hostId === socket.userId) return true;
  if (allowedRoles.includes('clueGiver') && room.state.clueGiver === socket.userId) return true;
  return false;
}

function rejectUnauthorized(socket: Socket, eventName: string) {
  console.log(`⛔ ${socket.userId ?? 'unknown user'} tried "${eventName}" without permission`);
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
          clue: '',
          pairWords: null,
          allPairWords: getFreshPairWords(),
          answerPosition: null,
          guessPosition: null,
          teamA: [],
          teamB: [],
          users: [user],
          hostId: userId,
          roomId: room,
          dialRotation: 0,
          screenOpen: false,
          markerRotation: 0,
          disableRandomMaker: false,
          disableSubmitClue: false,
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
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'assignHost');

    const targetToHost = room.users.get(targetToHostId)
    if (!targetToHost) return;
    setNewHost(roomId, targetToHostId)
    updateRoomState(roomId, room)
    console.log(`${userId} has set ${targetToHost.name} to HOST `)
  })

  socket.on("leaveRoom", ({ roomId, userId, name }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (userId !== socket.userId) return rejectUnauthorized(socket, 'leaveRoom');

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

    // รอสักครู่ก่อนลบออกจากห้อง เผื่อเน็ตหลุดชั่วคราว (client จะ joinRoom ใหม่เองตอน reconnect)
    // ถ้าปิดหน้า/รีเฟรช client จะส่ง leaveRoom มาก่อนอยู่แล้ว จึงไม่ต้องรอ
    setTimeout(() => removeDisconnectedUser(userId), DISCONNECT_GRACE_PERIOD_MS);
  });

  socket.on("reconnect", () => {
    console.log("✅ reconnect success");
  });


  socket.on("assignClueGiver", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'assignClueGiver');

    // ตรวจสอบว่าผู้เล่นอยู่ในห้อง
    const user = room.users.get(userId);
    if (!user) return;

    room.state.clueGiver = userId;
    room.state.disableRandomMaker = false
    room.state.disableSubmitClue = false
    console.log(`🎯 ${user.name} (${userId}) is now Clue Giver in room ${roomId}`);

    updateRoomState(roomId, room);
  });

  socket.on("kickUser", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'kickUser');

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
    if (!isRoomMember(socket, room)) return rejectUnauthorized(socket, 'updateDialRotation');
    room.state.dialRotation = rotation;
    console.log(`${userName} has updateDialRotation : ${rotation}`)
    updateRoomState(roomId, room);
  });

  socket.on("toggleScreen", ({ roomId, screenOpen, userName }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'toggleScreen');

    room.state.screenOpen = screenOpen;
    console.log(`${userName} has updated screenOpen : ${screenOpen}`)
    updateRoomState(roomId, room);
  });

  socket.on("randomizeMarker", ({ roomId, userName }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'randomizeMarker');

    // สุ่มที่ server แทน client เพื่อไม่ให้คนกดสุ่ม (เช่น host) เห็นค่าใน network
    const rotation = Math.floor(Math.random() * 180) - 90;
    room.state.markerRotation = rotation;
    console.log(`${userName} has updated randomizeMarker`)
    updateRoomState(roomId, room);
  });

  socket.on('updateTeamScore', ({ roomId, team, score, method }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'updateTeamScore');

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
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'setTurnOfTeam');

    room.state.turn = team
    console.log('Now is ', team, "'s turn")
    updateRoomState(roomId, room);

  })

  socket.on('userUpdateThierTeam', ({ roomId, userId, team }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!isRoomMember(socket, room) || userId !== socket.userId) return rejectUnauthorized(socket, 'userUpdateThierTeam');

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
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'randomizeTeam');

    const users = Array.from(room.users.values())
    if (users.length === 0) return

    // สุ่มผู้เล่นทั้งหมด (Fisher-Yates: ทุกลำดับมีโอกาสเท่ากัน ต่างจาก sort(() => Math.random() - 0.5) ที่เอนเอียง)
    const shuffledUsers = [...users]
    for (let i = shuffledUsers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledUsers[i], shuffledUsers[j]] = [shuffledUsers[j], shuffledUsers[i]];
    }

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
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'randomPairWord');

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
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'resetPairWord');

    resetPairWords(room)
    updateRoomState(roomId, room)
    console.log('Reset pair word success ')
  })

  socket.on('setDisableRandomMaker', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'setDisableRandomMaker');

    room.state.disableRandomMaker = true
    updateRoomState(roomId, room)
    console.log('random maker has been disabled ')
  })

  socket.on('submitClue', ({ roomId, clue }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['clueGiver'])) return rejectUnauthorized(socket, 'submitClue');

    room.state.clue=  clue
    room.state.disableSubmitClue = true
    updateRoomState(roomId, room)
    console.log('The clue is : ', clue)
  })


});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
