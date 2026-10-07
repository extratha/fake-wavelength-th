"use client";

import Button from "@/component/Button";
import InputText from "@/component/InputText";
import Modal, { ModalOptions } from "@/component/Modal";
import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { socket } from '@/lib/socket'
import profileImage from "../../assets/app-profile.png";
import Image from "next/image";
import { v4 as uuidv4 } from 'uuid'
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from "@/hooks/useUserProfile";
import FullScreenLoading from "@/component/FullScreenLoading";

const SOCKET_RESPONSE_TIMEOUT_MS = 5000

type RoomResponse = { success: boolean; message?: string }

export default function Lobby() {
	const roomPattern = /^[a-zA-Z0-9-]+$/
	const socketRef = useRef<Socket | null>(null)

	const { profile, updateProfile } = useUserProfile();
	const router = useRouter()
	const searchParams = useSearchParams()

	const [roomIdInput, setRoomIdInput] = useState("");
	const [availableRooms, setAvailableRooms] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false)
	const [modalOptions, setModalOptions] = useState<ModalOptions>({
		open: false,
		message: "",
	});
	socketRef.current = socket
	const socketCurrent = socketRef.current;

	// ลงทะเบียน listener ครั้งเดียว และถอดออกตอนออกจากหน้า (เดิมอยู่ใน render ทำให้ listener เพิ่มทุกครั้งที่ re-render)
	useEffect(() => {
		const handleUpdateRooms = (rooms: string[]) => {
			setAvailableRooms(rooms);
		};
		socketCurrent.on("updateRooms", handleUpdateRooms);
		return () => {
			socketCurrent.off("updateRooms", handleUpdateRooms);
		};
	}, [socketCurrent]);

	useEffect(() => {
		if (!profile.userId) {
			updateProfile({ ...profile, userId: uuidv4() })
		}

		socketCurrent.on("connect", () => {
		});

		socketCurrent.emit("getAvailableRooms", (rooms: string[]) => {
			setAvailableRooms(rooms);
		});
		socketCurrent.emit("leaveRoom", {
			roomId: profile.roomId,
			userId: profile.userId,
			name: profile.userName
		});


		socketCurrent.on("roomCreated", () => {
			setModalOptions({
				open: true,
				message: "สร้างห้องสำเร็จ! เข้าสู่ห้อง...",
			});

		});

		socketCurrent.on("roomError", (msg: string) => {
			setModalOptions({
				open: true,
				message: msg || "เกิดข้อผิดพลาดในการเข้าห้อง",
			});
		});

		//eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		// มาจากลิงก์ห้องแต่ยังไม่ได้ตั้งชื่อ: เติมเลขห้องให้เลย
		const roomFromLink = searchParams.get('room')
		if (roomFromLink) {
			setRoomIdInput(roomFromLink)
		}

		const error = searchParams.get('error')
		if (error) {

			setModalOptions({
				open: true,
				message: error,
			});

			const params = new URLSearchParams(searchParams)
			params.delete('error')
			params.delete('room')
			const path = window.location.pathname + (params.toString() ? `?${params.toString()}` : '')
			router.replace(path, { scroll: false })
		}
	}, [searchParams, router])

	const showServerTimeoutError = () => {
		setIsLoading(false)
		setModalOptions({
			open: true,
			message: 'เซิร์ฟเวอร์ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง',
		});
	}

	const createRoom = () => {
		try {
			setIsLoading(true)

			// เช็คสถานะการเชื่อมต่อจริง (เดิมเช็คแค่ว่ามี object socket ซึ่งมีอยู่เสมอ)
			if (!socketRef.current?.connected) {
				setModalOptions({
					open: true,
					message: 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
				});
				throw 'connecting'
			}
			if (!profile.userName.trim() || !roomIdInput.trim()) {
				setModalOptions({
					open: true,
					message: 'กรุณากรอกชื่อและหมายเลขห้อง',
				});
				throw 'require_fields'
			}
			if (!roomPattern.test(roomIdInput)) {
				setModalOptions({
					open: true,
					message: 'หมายเลขห้องต้องเป็นตัวอักษร A-Z ตัวเลข และขีดกลาง (-) เท่านั้น',
				});
				throw 'validation_fields'
			}

			updateProfile({
				...profile,
				roomId: roomIdInput,
			})

			socketRef.current.timeout(SOCKET_RESPONSE_TIMEOUT_MS).emit("createRoom", { room: roomIdInput, name: profile.userName, userId: profile.userId }, (timeoutError: Error | null, response: RoomResponse) => {
				if (timeoutError) {
					showServerTimeoutError()
					return
				}
				if (response.success) {
					router.push(`/main?room=${roomIdInput}`);
				} else {
					// ต้องปิด loading ก่อน ไม่งั้นจอจะค้างที่ FullScreenLoading และ modal error ไม่แสดง
					setIsLoading(false)
					setModalOptions({
						open: true,
						message: response.message || "สร้างห้องไม่สำเร็จ",
					});
				}
			});
		} catch  {
			setIsLoading(false)
		}
	};

	const joinRoom = (roomIdProps?: string) => {
		try {
			setIsLoading(true)

			// เช็คสถานะการเชื่อมต่อจริง (เดิมเช็คแค่ว่ามี object socket ซึ่งมีอยู่เสมอ)
			if (!socketRef.current?.connected) {
				setModalOptions({
					open: true,
					message: 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
				});
				throw 'connecting'
			}

			if (!profile.userName.trim() || (!roomIdInput.trim() && !roomIdProps)) {
				setModalOptions({
					open: true,
					message: 'กรุณากรอกชื่อและหมายเลขห้อง',
				});
				throw 'require_fields'
			}

			// ห้องที่กดจากรายการ ต้องมาก่อนค่าที่พิมพ์ค้างไว้ในช่อง
			const roomId = roomIdProps || roomIdInput

			if (!roomPattern.test(roomId)) {
				setModalOptions({
					open: true,
					message: 'หมายเลขห้องต้องเป็นตัวอักษร A-Z ตัวเลข และขีดกลาง (-) เท่านั้น',
				});
				throw 'validation_fields'
			}

			updateProfile({
				...profile,
				roomId,
			})

			socketRef.current.timeout(SOCKET_RESPONSE_TIMEOUT_MS).emit("joinRoom", {   roomId, name: profile.userName, userId: profile.userId }, (timeoutError: Error | null, response: RoomResponse) => {
				if (timeoutError) {
					showServerTimeoutError()
					return
				}
				if (response.success) {
					router.push(`/main?room=${roomId}`);
				} else {
					setIsLoading(false)
					setModalOptions({
						open: true,
						message: response.message || "เข้าห้องไม่สำเร็จ",
					});
				}
			});
		} catch (error) {
			console.log("Join Room Error : ", error)
			setIsLoading(false)
		}
	};

	const handleCloseModal = () => {
		setModalOptions(prev => ({ ...prev, open: false }));
	};

	if (isLoading) return <FullScreenLoading />

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
					value={roomIdInput}
					onChange={(e) => setRoomIdInput(e.target.value)}
					style={{ width: "100%", marginBottom: 10, padding: 8 }}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						gap: "16px",
						justifyContent: "space-between",
						alignItems: 'center'
					}}
				>
					<Button onClick={createRoom}>สร้างห้อง</Button>
					หรือ
					<Button onClick={() => joinRoom()}>เข้าห้อง</Button>
				</div>

				<div className="flex flex-row mt-8 gap-2 items-center">
					<p >ห้องที่มีอยู่: </p>
					{availableRooms.map((room, index) => (
						<React.Fragment key={index}>
							<p key={room} className="min-w-8 min-h-8 p-1 cursor-pointer text-center rounded-[50px] hover:bg-mediumBrown"
								onClick={() => joinRoom(room)} >{room}</p>
							{availableRooms[index + 1] ? <>|</> : ''}
						</React.Fragment>
					))}
				</div>
				{/* ✅ Modal แสดงข้อความ */}
				<Modal
					options={{ ...modalOptions, onClose: handleCloseModal } as ModalOptions}
				/>

			</div>
		</div>

	);
}
