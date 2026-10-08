"use client";

import InputText from "@/component/InputText";
import Modal, { ModalOptions } from "@/component/Modal";
import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { socket } from '@/lib/socket'
import { v4 as uuidv4 } from 'uuid'
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from "@/hooks/useUserProfile";
import FullScreenLoading from "@/component/FullScreenLoading";
import type { RoomSummary } from "@/server/game/roomCode";
import LobbyHeader from "./LobbyHeader";
import CreateRoomSection from "./CreateRoomSection";
import JoinRoomSection from "./JoinRoomSection";

const SOCKET_RESPONSE_TIMEOUT_MS = 5000
// รหัสห้องที่ server สุ่มให้: 4 ตัว ตัวอักษรอังกฤษเล็ก/ใหญ่ และตัวเลข (ดู src/server/game/roomCode.ts)
const ROOM_CODE_PATTERN = /^[a-zA-Z0-9]{4}$/
const PLAYER_NAME_MAX_LENGTH = 20

type CreateRoomResponse = { success: boolean; roomId?: string; message?: string }
type JoinRoomResponse = { success: boolean; message?: string }

export default function Lobby() {
	const socketRef = useRef<Socket | null>(null)

	const { profile, updateProfile } = useUserProfile();
	const router = useRouter()
	const searchParams = useSearchParams()

	const [roomIdInput, setRoomIdInput] = useState("");
	const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
	const [isLoading, setIsLoading] = useState(false)
	// error ที่แสดงใต้ช่องกรอก (ตรวจตอนกดปุ่ม)
	const [nameError, setNameError] = useState<string | undefined>()
	const [roomCodeError, setRoomCodeError] = useState<string | undefined>()
	const [modalOptions, setModalOptions] = useState<ModalOptions>({
		open: false,
		message: "",
	});
	socketRef.current = socket
	const socketCurrent = socketRef.current;

	// ลงทะเบียน listener ครั้งเดียว และถอดออกตอนออกจากหน้า (เดิมอยู่ใน render ทำให้ listener เพิ่มทุกครั้งที่ re-render)
	useEffect(() => {
		const handleUpdateRooms = (rooms: RoomSummary[]) => {
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

		socketCurrent.emit("getAvailableRooms", (rooms: RoomSummary[]) => {
			setAvailableRooms(rooms);
		});
		// กลับมาหน้า lobby = ออกจากห้องเดิม (ถ้ามี)
		socketCurrent.emit("leaveRoom", {
			roomId: profile.roomId,
			userId: profile.userId,
			name: profile.userName
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

	// ต้องต่อ server ได้ก่อนถึงจะสร้าง/เข้าห้องได้
	const ensureConnected = () => {
		if (socketRef.current?.connected) return true
		setModalOptions({
			open: true,
			message: 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง',
		});
		return false
	}

	const validatePlayerName = () => {
		if (profile.userName?.trim()) return true
		setNameError('กรุณาตั้งชื่อก่อนเข้าเล่น')
		return false
	}

	const createRoom = () => {
		if (!validatePlayerName()) return
		if (!ensureConnected() || !socketRef.current) return

		setIsLoading(true)
		// ไม่ต้องส่งชื่อห้อง: server สุ่มรหัสห้องที่ไม่ซ้ำให้
		socketRef.current.timeout(SOCKET_RESPONSE_TIMEOUT_MS).emit("createRoom", { name: profile.userName, userId: profile.userId }, (timeoutError: Error | null, response: CreateRoomResponse) => {
			if (timeoutError) {
				showServerTimeoutError()
				return
			}
			if (response.success && response.roomId) {
				updateProfile({ roomId: response.roomId })
				router.push(`/main?room=${response.roomId}`);
			} else {
				// ต้องปิด loading ก่อน ไม่งั้นจอจะค้างที่ FullScreenLoading
				setIsLoading(false)
				setModalOptions({
					open: true,
					message: response.message || "สร้างห้องไม่สำเร็จ",
				});
			}
		});
	};

	const joinRoom = (roomIdProps?: string) => {
		// ห้องที่กดจากรายการ ต้องมาก่อนค่าที่พิมพ์ค้างไว้ในช่อง
		const roomId = (roomIdProps || roomIdInput).trim()

		const isNameValid = validatePlayerName()
		if (!ROOM_CODE_PATTERN.test(roomId)) {
			setRoomCodeError(roomId ? 'รหัสห้องต้องมี 4 ตัว (a-z, A-Z, 0-9)' : 'กรุณากรอกรหัสห้อง')
			return
		}
		if (!isNameValid) return
		if (!ensureConnected() || !socketRef.current) return

		setIsLoading(true)
		updateProfile({ roomId })

		socketRef.current.timeout(SOCKET_RESPONSE_TIMEOUT_MS).emit("joinRoom", { roomId, name: profile.userName, userId: profile.userId }, (timeoutError: Error | null, response: JoinRoomResponse) => {
			if (timeoutError) {
				showServerTimeoutError()
				return
			}
			if (response.success) {
				router.push(`/main?room=${roomId}`);
			} else {
				setIsLoading(false)
				setRoomCodeError(response.message || "เข้าห้องไม่สำเร็จ")
			}
		});
	};

	const handleCloseModal = () => {
		setModalOptions(prev => ({ ...prev, open: false }));
	};

	return (
		<main className="min-h-screen px-4 pb-12 pt-8 sm:pt-12">
			<div className="mx-auto flex w-full max-w-md flex-col gap-6">
				<LobbyHeader />

				<InputText
					label="ชื่อเล่นของคุณ"
					placeholder="ชื่อที่เพื่อนจะเห็นในห้อง"
					value={profile.userName || ""}
					maxLength={PLAYER_NAME_MAX_LENGTH}
					autoComplete="nickname"
					onChange={(e) => {
						setNameError(undefined)
						updateProfile({ userName: e.target.value })
					}}
					errorMessage={nameError}
				/>

				{/* เข้าห้องก่อน: ผู้เล่นควรเห็นก่อนว่ามีห้องที่ออนไลน์อยู่ไหม ถ้าไม่มีค่อยสร้างห้องใหม่ด้านล่าง */}
				<JoinRoomSection
					roomCode={roomIdInput}
					roomCodeError={roomCodeError}
					onRoomCodeChange={(roomCode) => {
						setRoomCodeError(undefined)
						setRoomIdInput(roomCode)
					}}
					onJoinRoom={joinRoom}
					rooms={availableRooms}
				/>

				<CreateRoomSection onCreateRoom={createRoom} />
			</div>

			<Modal
				options={{ ...modalOptions, onClose: handleCloseModal } as ModalOptions}
			/>
			{isLoading && <FullScreenLoading />}
		</main>
	);
}
