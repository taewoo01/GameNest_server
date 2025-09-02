// src/index.ts
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import setupSocket from "./socket";

dotenv.config();

// ✅ 포트와 호스트 설정
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 5000;
const HOST: string = process.env.HOST || "0.0.0.0";

// ✅ HTTP 서버 생성 (Express 기반)
const httpServer = createServer(app);

// ✅ 허용할 클라이언트 도메인 (배포/로컬 환경 모두 고려)
const allowedOrigins: string[] = [
  process.env.CLIENT_URL || "https://game-nest-gilt.vercel.app",
  "http://localhost:3000", // 로컬 개발 환경
];

// ✅ Socket.IO 서버 생성
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Socket 이벤트 설정
setupSocket(io);

// ✅ 서버 실행
httpServer.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
