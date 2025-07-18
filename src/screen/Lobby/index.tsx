"use client";

import Button from "@/component/Button";
import InputText from "@/component/InputText";
import { useUsername } from "@/hooks/useUsername";
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

type RoomStatus = "idle" | "exists" | "created" | "error";

export default function Lobby() {
  const { username, setUsername } = useUsername();
	const [room, setRoom] = useState("");
	const [roomStatus, setRoomStatus] = useState<RoomStatus>("idle");
	const [errorMsg, setErrorMsg] = useState("");


	useEffect(() => {
		socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);

		socket.on("connect", () => {
			console.log("connected", socket.id);
		});

		socket.on("roomExists", () => {
			setRoomStatus("exists");
		});

		socket.on("roomCreated", () => {
			setRoomStatus("created");
		});

		socket.on("roomError", (msg: string) => {
			setErrorMsg(msg);
			setRoomStatus("error");
		});

		return () => {
			socket.disconnect();
		};
	}, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

	const createRoom = () => {
    if (!username.trim() || !room.trim()) {
      setErrorMsg("กรุณากรอกชื่อและหมายเลขห้อง");
      return;
    }
    setErrorMsg("");
    setRoomStatus("idle");
    socket.emit("createRoom", { room, name: username });
  };

  const joinRoom = () => {
    if (!username.trim() || !room.trim()) {
      setErrorMsg("กรุณากรอกชื่อและหมายเลขห้อง");
      return;
    }
    setErrorMsg("");
    setRoomStatus("idle");
    socket.emit("joinRoom", { room, name: username });
  };

	return (
		<div style={{ maxWidth: 400, margin: "auto", padding: 20, }}>
			<h1 style={{ fontSize: "24px", margin: '0 0 24px 0' }}>Lobby</h1>
			<InputText
				placeholder="ชื่อ"
				value={username}
				onChange={(e) => handleChangeName(e)}
				style={{ width: "100%", marginBottom: 10, padding: 8 }}
			/>
			<InputText
				placeholder="หมายเลขห้อง"
				value={room}
				onChange={(e) => setRoom(e.target.value)}
				style={{ width: "100%", marginBottom: 10, padding: 8 }}
			/>
			<div style={{ display: "flex", flexDirection: 'row', gap: "16px", justifyContent: 'space-between' }}>
				<Button onClick={createRoom}>
					สร้างห้อง
				</Button>
				<Button onClick={joinRoom}>เข้าห้อง</Button>
			</div>
			{roomStatus === "exists" && (
				<p style={{ color: "red" }}>ห้องนี้มีอยู่แล้ว ไม่สามารถสร้างซ้ำได้</p>
			)}
			{roomStatus === "created" && (
				<p style={{ color: "green" }}>สร้างห้องสำเร็จ! เข้าสู่ห้อง...</p>
			)}
			{errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
		</div>
	);
}
