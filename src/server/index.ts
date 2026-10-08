import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { pairWords as fullPairWords, PairWord } from './constant/pairWords';
import { calculateRoundResult, getOpposingTeam, LeftRightGuess, RoundResult } from './game/scoring';
import { generateUniqueRoomCode, RoomSummary } from './game/roomCode';
import { pickFairRandomClueGiver } from './game/clueGiver';
import {
  appendChatMessage,
  ChatMessage,
  createPlayerMessage,
  createSystemMessage,
  createClueMessage,
  formatRoundResultMessage,
  formatWinnerMessage,
  isChatRateLimited,
  normalizeChatText,
} from './game/chat';

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
  // ---------- รอบการเล่น / การคิดคะแนน ----------
  // ทีมตรงข้ามแทงว่าเป้าอยู่ซ้ายหรือขวาของเข็ม
  leftRightGuess: LeftRightGuess | null;
  // true ตั้งแต่เปิดหน้าปัดครั้งแรกของรอบ: ล็อกการแทงซ้าย/ขวา และล็อกเข็ม
  isRoundLocked: boolean;
  // สุ่มเป้าแล้วในรอบนี้หรือยัง (ถ้ายังไม่สุ่ม จะไม่คิดคะแนน)
  isTargetSet: boolean;
  // สุ่มคู่คำใหม่แล้วในรอบนี้หรือยัง (คู่คำของรอบก่อนยังค้างอยู่บนจอ ใช้บอกขั้นตอนให้คนให้คำใบ้)
  isPairWordPickedThisRound: boolean;
  roundNumber: number;
  roundResult: RoundResult | null;
  winner: TeamKey | null;
  // จำนวนครั้งที่แต่ละคน (userId) เคยเป็นคนให้คำใบ้ในเกมนี้ ใช้สุ่มแบบยุติธรรม
  clueGiverTurnCount: Record<string, number>;
  // คนให้คำใบ้คนล่าสุดของแต่ละทีม (กันสุ่มได้คนเดิมติดกัน)
  lastClueGiverByTeam: Record<TeamKey, string | null>;
  // คนให้คำใบ้ "ยกมือขอข้าม" รอ host เลือกคนใหม่
  clueGiverSkipRequested: boolean;
};

// state ที่ส่งไป client: ไม่มีรายการคำทั้งหมด และ markerRotation อาจเป็น null (ซ่อนจากคนที่ยังไม่ควรเห็น)
type ClientGameState = Omit<GameState, 'allPairWords' | 'markerRotation'> & {
  markerRotation: number | null;
};

type RoomType = {
  users: Map<string, { name: string; userId: string; team?: string }>;
  state: GameState;
  hostId: string
  // แชทแยกจาก state (ไม่ส่งไปพร้อม gameStateUpdate ทุกครั้ง ส่งเฉพาะข้อความใหม่)
  chatMessages: ChatMessage[];
  // เวลาที่ส่งแชทล่าสุดของแต่ละคน ใช้กันส่งรัว
  chatSendTimesByUser: Map<string, number[]>;
}

const rooms: Record<string, RoomType> = {};

const roomTimeouts: Record<string, NodeJS.Timeout> = {};

// รายชื่อห้องสำหรับหน้า lobby: เฉพาะห้องที่มีคนอยู่ (ห้องว่างที่รอลบไม่ต้องโชว์)
function getRoomSummaries(): RoomSummary[] {
  return Object.entries(rooms)
    .filter(([, room]) => room.users.size > 0)
    .map(([roomId, room]) => ({ roomId, playerCount: room.users.size }));
}

// แจ้งทุกคน (รวมคนที่อยู่หน้า lobby) เมื่อมีห้องเกิด/หาย หรือจำนวนผู้เล่นในห้องเปลี่ยน
function broadcastRoomList() {
  io.emit("updateRooms", getRoomSummaries());
}

// ข้อความจากระบบในแชท (เข้า/ออกห้อง, ผลรอบ)
function postSystemChatMessage(roomId: string, room: RoomType, text: string) {
  const message = createSystemMessage(text);
  appendChatMessage(room.chatMessages, message);
  io.to(roomId).emit("chatMessage", message);
}

function scheduleRoomDeletion(roomId: string) {
  if (roomTimeouts[roomId]) return;

  roomTimeouts[roomId] = setTimeout(() => {
    if (rooms[roomId]?.users.size === 0) {
      delete rooms[roomId];
      console.log(`💥 Room ${roomId} deleted`);
      broadcastRoomList();
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
  room.state.isPairWordPickedThisRound = false;
}

const DISCONNECT_GRACE_PERIOD_MS = 5000;
const CLUE_MAX_LENGTH = 100;

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

    const disconnectedUserName = room.users.get(userId)?.name;
    room.users.delete(userId);
    if (disconnectedUserName) postSystemChatMessage(roomId, room, `${disconnectedUserName} หลุดออกจากห้อง`);
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
    broadcastRoomList();

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

// หมุนเข็มได้เฉพาะสมาชิกทีมเดียวกับคนให้คำใบ้ ที่ไม่ใช่คนให้คำใบ้เอง (ตามกฎ Wavelength สากล)
// ทีมตรงข้าม, host ที่ไม่ได้อยู่ทีมนั้น และคนที่ยังไม่เลือกทีมหมุนไม่ได้
// ถ้ายังไม่มีคนให้คำใบ้ (หรือเขายังไม่มีทีม) จะไม่มีใครหมุนได้
function canRotateDial(socket: Socket, room: RoomType) {
  if (!isRoomMember(socket, room)) return false;

  const clueGiverId = room.state.clueGiver;
  if (!clueGiverId || socket.userId === clueGiverId) return false;

  const guessingTeam = room.users.get(clueGiverId)?.team;
  if (!guessingTeam) return false;

  return room.users.get(socket.userId!)?.team === guessingTeam;
}

function rejectUnauthorized(socket: Socket, eventName: string) {
  console.log(`⛔ ${socket.userId ?? 'unknown user'} tried "${eventName}" without permission`);
}

// เวลาเดียวกับ animation เปิดหน้าปัดฝั่ง client: บวกคะแนนหลังฉากหมุนเปิดเสร็จ
const SCREEN_REVEAL_DURATION_MS = 3000;

function setClueGiver(room: RoomType, userId: string | null) {
  room.state.clueGiver = userId;
  room.state.clueGiverSkipRequested = false;
  if (userId) {
    room.state.clueGiverTurnCount[userId] = (room.state.clueGiverTurnCount[userId] ?? 0) + 1;
    const team = room.users.get(userId)?.team;
    if (team === 'teamA' || team === 'teamB') {
      room.state.lastClueGiverByTeam[team] = userId;
    }
  }
}

// เปลี่ยนคนให้คำใบ้ระหว่างรอบ (host เลือกเอง / เริ่มรอบของทีมใหม่)
// ถ้าสุ่มเป้าไปแล้ว คนเดิมเห็นเป้าแล้ว (และอาจกลายเป็นคนหมุนเข็มได้) จึงต้องล้างเป้าให้คนใหม่สุ่มใหม่
function changeClueGiverDuringRound(room: RoomType, userId: string | null) {
  setClueGiver(room, userId);
  room.state.disableRandomMaker = false;

  if (room.state.isTargetSet && !room.state.isRoundLocked) {
    room.state.isTargetSet = false;
    room.state.markerRotation = 0;
    room.state.leftRightGuess = null;
    room.state.clue = '';
  }
}

// คนให้คำใบ้คนถัดไปของทีม (วนตามลำดับที่เข้าห้อง) ถ้าทีมไม่มีคนคืนค่า null
// คนให้คำใบ้คนถัดไปของทีม (สุ่มจากคนที่เป็นน้อยครั้งที่สุด) ถ้าทีมไม่มีคนคืนค่า null
function pickNextClueGiver(room: RoomType, team: TeamKey): string | null {
  const teamMemberIds = Array.from(room.users.values())
    .filter((user) => user.team === team)
    .map((user) => user.userId);
  return pickFairRandomClueGiver(teamMemberIds, room.state.clueGiverTurnCount, room.state.lastClueGiverByTeam[team]);
}

// ตอนเปิดหน้าปัด: ล็อกรอบทันที (กันแทงซ้าย/ขวาหลังเห็นเป้า) แล้วถ่ายค่าเข็ม/เป้า/คำแทงไว้
// คะแนนจะถูกบวกหลัง animation เปิดเสร็จ โดยใช้ค่าที่ถ่ายไว้ ไม่ใช่ค่าตอนนั้น
function lockRoundAndScheduleScoring(roomId: string, room: RoomType) {
  if (room.state.isRoundLocked) return;
  room.state.isRoundLocked = true;

  const guessingTeam = room.state.turn;
  if (!guessingTeam || !room.state.isTargetSet) {
    console.log(`[Room ${roomId}] Screen opened without turn or target. Skip scoring.`);
    return;
  }

  const roundNumberAtReveal = room.state.roundNumber;
  const snapshot = {
    guessingTeam,
    dialRotation: room.state.dialRotation,
    markerRotation: room.state.markerRotation,
    leftRightGuess: room.state.leftRightGuess,
  };

  setTimeout(() => {
    const currentRoom = rooms[roomId];
    if (!currentRoom) return;

    // คิดจากคะแนนปัจจุบัน (เผื่อ host แก้คะแนนด้วยมือระหว่างรอ animation)
    const result = calculateRoundResult({ ...snapshot, scoresBeforeRound: currentRoom.state.scores });
    currentRoom.state.scores = result.scoresAfterRound;
    currentRoom.state.winner = result.winner;

    // ถ้า host เริ่มรอบใหม่ไปแล้วระหว่างรอ ยังบวกคะแนนให้ แต่ไม่แสดงสรุปผลทับรอบใหม่
    if (currentRoom.state.roundNumber === roundNumberAtReveal) {
      currentRoom.state.roundResult = result;
      postSystemChatMessage(roomId, currentRoom, formatRoundResultMessage(result));
      if (result.winner) postSystemChatMessage(roomId, currentRoom, formatWinnerMessage(result.winner));
    }

    console.log(`[Room ${roomId}] Round ${roundNumberAtReveal} scored:`, JSON.stringify({
      guessingTeam: result.guessingTeam,
      guessingTeamPoints: result.guessingTeamPoints,
      leftRightGuess: result.leftRightGuess,
      opposingTeamPoints: result.opposingTeamPoints,
      nextTurn: result.nextTurn,
      winner: result.winner,
    }));
    updateRoomState(roomId, currentRoom);
  }, SCREEN_REVEAL_DURATION_MS);
}

// รีเซ็ตกระดานสำหรับรอบใหม่ (ไม่แตะคะแนน)
function resetBoardForNewRound(room: RoomType) {
  room.state.roundNumber += 1;
  room.state.screenOpen = false;
  room.state.clue = '';
  room.state.dialRotation = 0;
  room.state.markerRotation = 0;
  room.state.disableRandomMaker = false;
  room.state.leftRightGuess = null;
  room.state.isRoundLocked = false;
  room.state.isTargetSet = false;
  room.state.isPairWordPickedThisRound = false;
  room.state.roundResult = null;
  room.state.clueGiverSkipRequested = false;
}

function startRoundForTeam(room: RoomType, team: TeamKey) {
  resetBoardForNewRound(room);
  room.state.turn = team;
  const nextClueGiver = pickNextClueGiver(room, team);
  setClueGiver(room, nextClueGiver);
}

io.on("connection", (socket) => {

  socket.on("getAvailableRooms", (callback) => {
    if (typeof callback !== 'function') return;
    callback(getRoomSummaries());
  });

  socket.on("createRoom", ({ name, userId }, callback) => {
    // server เป็นคนสุ่มรหัสห้อง จะได้รับประกันว่าไม่ซ้ำกับห้องที่มีอยู่
    const room = generateUniqueRoomCode((code) => !!rooms[code]);
    if (!room) {
      if (callback) callback({ success: false, message: "สร้างห้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
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
          leftRightGuess: null,
          isRoundLocked: false,
          isTargetSet: false,
          isPairWordPickedThisRound: false,
          roundNumber: 1,
          roundResult: null,
          winner: null,
          clueGiverTurnCount: {},
          lastClueGiverByTeam: { teamA: null, teamB: null },
          clueGiverSkipRequested: false,
        },
        hostId: userId,
        chatMessages: [],
        chatSendTimesByUser: new Map(),
      };

      socket.join(room);
      socket.userId = userId

      console.log(`Room ${room} created by ${name} (${userId})`);

      broadcastRoomList();
      if (callback) callback({ success: true, roomId: room });
      postSystemChatMessage(room, rooms[room], `${name} สร้างห้อง`);

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

    // ถ้ายังอยู่ในห้อง (เช่น reconnect ระหว่าง grace period) ให้เก็บทีมเดิมไว้ ไม่งั้นทีมจะหายทุกครั้งที่ต่อใหม่
    const userAlreadyInRoom = existingRoom.users.get(userId);
    existingRoom.users.set(userId, { ...userAlreadyInRoom, name, userId });
    socket.join(roomId);
    socket.userId = userId;
    // แจ้งในแชทเฉพาะคนที่เพิ่งเข้ามาใหม่ (ไม่ใช่การต่อใหม่ของคนที่อยู่ในห้องอยู่แล้ว)
    if (!userAlreadyInRoom) postSystemChatMessage(roomId, existingRoom, `${name} เข้าห้อง`);

    if (existingRoom.users.size === 1) {
      setNewHost(roomId, userId)
      console.log(`⚡ ${name} (${userId}) is now host in room ${roomId}`);
    }

    if (callback) callback({
      success: true,
      currentHostId: existingRoom.hostId
    });

    updateRoomState(roomId, existingRoom)
    broadcastRoomList()

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

    // หน้า lobby ส่ง leaveRoom ทุกครั้งที่เปิด จึงแจ้งในแชทเฉพาะเมื่ออยู่ในห้องจริง
    const leavingUserName = room.users.get(userId)?.name;
    room.users.delete(userId);
    socket.leave(roomId);
    if (leavingUserName) postSystemChatMessage(roomId, room, `${leavingUserName} ออกจากห้อง`);
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
    broadcastRoomList()

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

    changeClueGiverDuringRound(room, userId);
    console.log(`🎯 ${user.name} (${userId}) is now Clue Giver in room ${roomId}`);

    updateRoomState(roomId, room);
  });

  socket.on("kickUser", ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'kickUser');

    if (!room.users.has(userId)) return;

    const kickedUserName = room.users.get(userId)?.name;
    room.users.delete(userId);
    postSystemChatMessage(roomId, room, `${kickedUserName} ถูกเชิญออกจากห้อง`);

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
    broadcastRoomList();

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
    if (!canRotateDial(socket, room)) return rejectUnauthorized(socket, 'updateDialRotation');
    // เปิดหน้าปัดแล้ว ล็อกเข็ม (คะแนนคิดจากตำแหน่งตอนเปิด)
    if (room.state.isRoundLocked) return;
    room.state.dialRotation = rotation;
    console.log(`${userName} has updateDialRotation : ${rotation}`)
    updateRoomState(roomId, room);
  });

  socket.on("toggleScreen", ({ roomId, screenOpen, userName }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'toggleScreen');

    room.state.screenOpen = screenOpen;
    if (screenOpen) {
      lockRoundAndScheduleScoring(roomId, room);
    }
    console.log(`${userName} has updated screenOpen : ${screenOpen}`)
    updateRoomState(roomId, room);
  });

  socket.on("randomizeMarker", ({ roomId, userName }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (!canControlRoom(socket, room, ['host', 'clueGiver'])) return rejectUnauthorized(socket, 'randomizeMarker');

    // ห้ามสุ่มเป้าใหม่ตอนหน้าปัดเปิดอยู่ ไม่งั้นทุกคนจะเห็นเป้าใหม่ทันที
    if (room.state.screenOpen) return;

    // สุ่มที่ server แทน client เพื่อไม่ให้คนกดสุ่ม (เช่น host) เห็นค่าใน network
    const rotation = Math.floor(Math.random() * 180) - 90;
    room.state.markerRotation = rotation;
    // เป้าใหม่ = เริ่มรอบใหม่: ปลดล็อกการแทง/เข็ม และล้างผลรอบก่อน
    room.state.isTargetSet = true;
    room.state.isRoundLocked = false;
    room.state.leftRightGuess = null;
    room.state.roundResult = null;
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

    if (team !== 'teamA' && team !== 'teamB') return

    room.state.turn = team

    // สุ่มคนให้คำใบ้จากทีมนี้ให้อัตโนมัติ ถ้าคนให้คำใบ้ตอนนี้ไม่ได้อยู่ทีมนี้ (host ยังเปลี่ยนเองได้ทีหลัง)
    const currentClueGiverTeam = room.state.clueGiver ? room.users.get(room.state.clueGiver)?.team : undefined
    if (currentClueGiverTeam !== team) {
      changeClueGiverDuringRound(room, pickNextClueGiver(room, team))
    }

    console.log('Now is ', team, "'s turn")
    updateRoomState(roomId, room);

  })

  // คนให้คำใบ้ "ยกมือขอข้าม" (หรือเอามือลง) ให้ host รู้ว่าต้องเลือกคนใหม่
  socket.on('setClueGiverSkipRequest', ({ roomId, requested }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['clueGiver'])) return rejectUnauthorized(socket, 'setClueGiverSkipRequest');
    if (typeof requested !== 'boolean') return
    // เปิดหน้าปัดแล้ว รอบนี้จบแล้ว ไม่ต้องขอข้าม
    if (room.state.isRoundLocked) return

    room.state.clueGiverSkipRequested = requested
    updateRoomState(roomId, room)
    console.log(`✋ ${socket.userId} ${requested ? 'asks to skip' : 'cancels skip request'} as clue giver`)
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

    room.state.isPairWordPickedThisRound = true
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

  socket.on('setLeftRightGuess', ({ roomId, guess }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!isRoomMember(socket, room)) return rejectUnauthorized(socket, 'setLeftRightGuess');
    if (guess !== 'left' && guess !== 'right') return;

    // แทงได้เฉพาะทีมตรงข้ามกับทีมที่กำลังเล่น
    const guessingTeam = room.state.turn
    const requesterTeam = room.users.get(socket.userId!)?.team
    if (!guessingTeam || requesterTeam !== getOpposingTeam(guessingTeam)) {
      return rejectUnauthorized(socket, 'setLeftRightGuess');
    }

    // ล็อกทันทีที่มีการเปิดหน้าปัด (เช็คที่ server กันยิง event เองหลังเห็นเป้า)
    if (room.state.isRoundLocked || room.state.screenOpen) {
      console.log(`🔒 ${socket.userId} tried to change left/right guess after reveal`)
      return
    }

    room.state.leftRightGuess = guess
    updateRoomState(roomId, room)
  })

  socket.on('startNextRound', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'startNextRound');

    // ใช้ตาที่ระบบคำนวณ (สลับทีม หรือ catch-up) ถ้าไม่มีผลรอบ ก็สลับทีมปกติ
    const currentTurn = room.state.turn
    const nextTurn = room.state.roundResult?.nextTurn ?? (currentTurn ? getOpposingTeam(currentTurn) : 'teamA')
    startRoundForTeam(room, nextTurn)
    updateRoomState(roomId, room)
    console.log(`[Room ${roomId}] Next round ${room.state.roundNumber}: ${nextTurn}`)
  })

  socket.on('startNewGame', ({ roomId }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['host'])) return rejectUnauthorized(socket, 'startNewGame');

    room.state.scores = { teamA: 0, teamB: 0 }
    room.state.winner = null
    room.state.clueGiverTurnCount = {}
    room.state.lastClueGiverByTeam = { teamA: null, teamB: null }
    startRoundForTeam(room, 'teamA')
    updateRoomState(roomId, room)
    console.log(`[Room ${roomId}] New game started`)
  })

  // ---------- แชท ----------
  // ประวัติแชททั้งหมดที่ server เก็บไว้ (สูงสุด 100 ข้อความ) สำหรับคนที่เพิ่งเข้าห้อง/ต่อใหม่
  socket.on('getChatHistory', ({ roomId }, callback) => {
    if (typeof callback !== 'function') return
    const room = rooms[roomId]
    if (!room || !isRoomMember(socket, room)) return callback([])
    callback(room.chatMessages)
  })

  socket.on('sendChatMessage', ({ roomId, text }, callback) => {
    const respond = (response: { success: boolean; message?: string }) => {
      if (typeof callback === 'function') callback(response)
    }
    const room = rooms[roomId]
    if (!room) return respond({ success: false, message: 'ไม่พบห้อง' })
    if (!isRoomMember(socket, room)) return rejectUnauthorized(socket, 'sendChatMessage')

    // คนให้คำใบ้ห้ามพิมพ์แชท (กันใบ้เพิ่มทางแชท)
    if (room.state.clueGiver === socket.userId) {
      return respond({ success: false, message: 'คนให้คำใบ้พิมพ์แชทไม่ได้' })
    }

    const chatText = normalizeChatText(text)
    if (!chatText) return respond({ success: false, message: 'พิมพ์ข้อความก่อนส่ง' })

    const userId = socket.userId!
    const recentSendTimes = room.chatSendTimesByUser.get(userId) ?? []
    room.chatSendTimesByUser.set(userId, recentSendTimes)
    if (isChatRateLimited(recentSendTimes)) {
      return respond({ success: false, message: 'ส่งเร็วเกินไป รอสักครู่แล้วลองใหม่' })
    }

    const senderName = room.users.get(userId)?.name ?? 'ผู้เล่น'
    const message = createPlayerMessage(userId, senderName, chatText)
    appendChatMessage(room.chatMessages, message)
    io.to(roomId).emit('chatMessage', message)
    respond({ success: true })
  })

  socket.on('submitClue', ({ roomId, clue }) => {
    const room = rooms[roomId]
    if (!room) return
    if (!canControlRoom(socket, room, ['clueGiver'])) return rejectUnauthorized(socket, 'submitClue');

    // ส่งคำใบ้ใหม่ทับของเดิมได้เรื่อย ๆ (ไม่ล็อกหลังส่งครั้งแรก)
    if (typeof clue !== 'string') return
    const trimmedClue = clue.trim()
    if (!trimmedClue) return

    const newClue = trimmedClue.slice(0, CLUE_MAX_LENGTH)
    const isClueChanged = newClue !== room.state.clue
    room.state.clue = newClue
    updateRoomState(roomId, room)

    // ส่งคำใบ้เข้าแชทด้วย คนที่ดูแชทอยู่ (โดยเฉพาะบนมือถือ) จะได้ไม่พลาดคำใบ้ใหม่
    // ส่งคำเดิมซ้ำไม่ต้องโพสต์ใหม่ กันแชทรก
    if (isClueChanged) {
      const clueGiverId = socket.userId!
      const clueGiverName = room.users.get(clueGiverId)?.name ?? 'คนให้คำใบ้'
      const message = createClueMessage(clueGiverId, clueGiverName, newClue)
      appendChatMessage(room.chatMessages, message)
      io.to(roomId).emit('chatMessage', message)
    }
    console.log('The clue is : ', room.state.clue)
  })


});

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
