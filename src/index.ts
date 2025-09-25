// src/index.ts
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import app from "./app";
import setupSocket from "./socket";

dotenv.config();

// ✅ 포트와 호스트 설정
const PORT: number = process.env.PORT ? Number(process.env.PORT) : 5000;
const HOST: string = process.env.HOST || "0.0.0.0";

// ✅ 허용할 클라이언트 도메인 (배포/로컬 환경 모두 고려)
const allowedOrigins: string[] = [
  process.env.CLIENT_URL || "https://game-nest-gilt.vercel.app",
  "http://localhost:3000",
];

// ✅ Express에 CORS 설정 (API 요청용)
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Postman 등 origin 없는 경우 허용
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "CORS 정책: 해당 Origin은 허용되지 않습니다.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // withCredentials 요청 허용
}));

// ✅ HTTP 서버 생성 (Express 기반)
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
