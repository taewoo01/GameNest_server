import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import setupSocket from "./socket";

dotenv.config();

// 포트와 호스트 설정 (Render 환경에 맞게)
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const HOST = process.env.HOST || "0.0.0.0";

// HTTP 서버 생성
const httpServer = createServer(app);

// Socket.IO 서버 생성
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*", // 클라이언트 URL 환경변수로 관리
    methods: ["GET", "POST"],
  },
});

// Socket 이벤트 설정
setupSocket(io);

// 서버 실행
httpServer.listen(PORT, HOST, () => {
  console.log(`✅ Server running on ${HOST}:${PORT}`);
});
