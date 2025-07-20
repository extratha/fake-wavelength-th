"use client";

import Button from "@/component/Button";
import InputText from "@/component/InputText";
import Modal, { ModalOptions } from "@/component/Modal";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import profileImage from "../../assets/app-profile.png";
import Image from "next/image";
import { v4 as uuidv4 } from 'uuid'
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from "@/hooks/useUserProfile";

export default function Lobby() {
	const roomPattern = /^[a-zA-Z0-9-]+$/
	const socketRef = useRef<Socket | null>(null)

	const { profile, updateProfile } = useUserProfile();
	const router = useRouter()
	const searchParams = useSearchParams()

	const [room, setRoom] = useState("");
	const [availableRooms, setAvailableRooms] = useState<string[]>([]);
	const [modalOptions, setModalOptions] = useState<ModalOptions>({
		open: false,
		message: "",
	});
	socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || '')

	const socket = socketRef.current;

	socket.on("updateRooms", (rooms: string[]) => {
		setAvailableRooms(rooms);
	});

	useEffect(() => {
		console.log(profile)
		if (!profile.userId) {
			updateProfile({ ...profile, userId: uuidv4() })
		}

		socket.on("connect", () => {
			console.log("connected", socket.id);

			socket.emit("getAvailableRooms", (rooms: string[]) => {
				console.log("Rooms:", rooms);
				setAvailableRooms(rooms);
			});
		});

		socket.emit("leaveRoom", {
			roomId: profile.roomId,
			userId: profile.userId,
		});

		socket.on("roomExists", () => {
			setModalOptions({
				open: true,
				message: "ห้องนี้มีอยู่แล้ว ไม่สามารถสร้างซ้ำได้",
			});
		});

		socket.on("roomCreated", () => {
			setModalOptions({
				open: true,
				message: "สร้างห้องสำเร็จ! เข้าสู่ห้อง...",
			});

		});

		socket.on("roomError", (msg: string) => {
			setModalOptions({
				open: true,
				message: msg || "เกิดข้อผิดพลาดในการเข้าห้อง",
			});
		});

    //eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const error = searchParams.get('error')
		if (error) {

			setModalOptions({
				open: true,
				message: error,
			});

			const params = new URLSearchParams(searchParams)
			params.delete('error')
			const path = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
			router.replace(path, { scroll: false })
		}
	}, [searchParams, router])

	const createRoom = () => {
		if (!socketRef.current) {
			setModalOptions({
				open: true,
				message: 'รอสักครู่ กำลังเชื่อมต่อเซิร์ฟเวอร์...',
			});
			return
		}
		if (!profile.userName.trim() || !room.trim()) {
			setModalOptions({
				open: true,
				message: 'กรุณากรอกชื่อและหมายเลขห้อง',
			});
			return;
		}
		if (!roomPattern.test(room)) {
			setModalOptions({
				open: true,
				message: 'หมายเลขห้องต้องเป็นตัวอักษร A-Z ตัวเลข และขีดกลาง (-) เท่านั้น',
			});
			return
		}

		updateProfile({
			...profile,
			roomId: room,
			isClueGiver: false,
		})
		socketRef.current.emit("createRoom", { room, name: profile.userName, userId: profile.userId }, (response: { success: boolean; message?: string }) => {
			console.log("CreateRoom response:", response);
			if (response.success) {
				router.push(`/main?room=${room}`);
			} else {
				setModalOptions({
					open: true,
					message: response.message || "สร้างห้องไม่สำเร็จ",
				});
			}
		});

	};

	const joinRoom = () => {
		if (!socketRef.current) {
			setModalOptions({
				open: true,
				message: 'รอสักครู่ กำลังเชื่อมต่อเซิร์ฟเวอร์...',
			});
			return
		}
		if (!profile.userName.trim() || !room.trim()) {
			setModalOptions({
				open: true,
				message: 'กรุณากรอกชื่อและหมายเลขห้อง',
			});
			return;
		}

		if (!roomPattern.test(room)) {
			setModalOptions({
				open: true,
				message: 'หมายเลขห้องต้องเป็นตัวอักษร A-Z ตัวเลข และขีดกลาง (-) เท่านั้น',
			});
			return
		}

		updateProfile({
			...profile,
			roomId: room,
			isClueGiver: false,
		})

		socketRef.current.emit("joinRoom", { room, name: profile.userName, userId: profile.userId }, (response: { success: boolean; message?: string }) => {
			console.log("Join room response:", response);
			if (response.success) {
				router.push(`/main?room=${room}`);
			} else {
				setModalOptions({
					open: true,
					message: response.message || "เข้าห้องไม่สำเร็จ",
				});
			}
		});

	};
	const handleCloseModal = () => {
		setModalOptions(prev => ({ ...prev, open: false }));
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
				<Image
					src={profileImage}
					alt="App profile"
					width={200}
					height={200}
					style={{ justifySelf: "center", borderRadius: "24px" }}
				/>
				<h1 style={{ fontSize: "24px", margin: "24px  0", textAlign: "center" }}>
					Fake Wavelength TH
				</h1>
				<InputText
					placeholder="ชื่อ"
					value={profile.userName || ""}
					onChange={(e) =>
						updateProfile({ userName: e.target.value })
					}
					style={{ width: "100%", marginBottom: 10, padding: 8 }}
				/>
				<InputText
					placeholder="หมายเลขห้อง"
					value={room}
					onChange={(e) => setRoom(e.target.value)}
					style={{ width: "100%", marginBottom: 10, padding: 8 }}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						gap: "16px",
						justifyContent: "space-between",
					}}
				>
					<Button onClick={createRoom}>สร้างห้อง</Button>
					<Button onClick={joinRoom}>เข้าห้อง</Button>
				</div>

				{/* ✅ Modal แสดงข้อความ */}
				<Modal
					options={{ ...modalOptions, onClose: handleCloseModal } as ModalOptions}
				/>
			</div>
			<div style={{ display: 'stack', flexDirection: 'column' }}>
				<p>ห้องที่มีอยู่</p>
				{availableRooms.map((room) => (
					<p key={room}>{room}</p>
				))}
			</div>
		</div>

	);
}
