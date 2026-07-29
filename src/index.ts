// src/index.ts
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import setupSocket from "./socket";
import { allowedOrigins } from "./config/cors";

dotenv.config();

// ✅ 포트와 호스트 설정
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 5000;
const HOST: string = process.env.HOST || "0.0.0.0";

// ✅ HTTP 서버 생성 (Express 기반, CORS는 app.ts에서 이미 설정됨)
const httpServer = createServer(app);

// ✅ Socket.IO 서버 생성 (실시간 통신용)
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
