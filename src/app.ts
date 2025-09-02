import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.route";
import gamesRoutes from "./routes/game.route";
import communityRoutes from "./routes/community.routs";
import gameComment from "./routes/gameComment.route";
import communityComment from "./routes/communityComment.route";
import myComment from "./routes/myComment.route";
import myScrap from "./routes/myScrap.route";
import News from "./routes/new.route";
import Chat from "./routes/chat.route";

const app = express();

// ✅ 허용할 프론트 도메인 (쉼표 구분 지원)
const allowedOrigins = (process.env.CLIENT_URL || "https://game-nest-gilt.vercel.app")
  .split(",")
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman, curl 등 origin 없는 요청 허용
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`❌ CORS 차단됨: ${origin}`);
    return callback(null, false); // 에러 대신 차단
  },
  credentials: true,
}));

app.use(express.json());

// 라우터 연결
app.use("/auth", authRoutes);
app.use("/game", gamesRoutes);
app.use("/community", communityRoutes);
app.use("/gameComment", gameComment);
app.use("/communityComment", communityComment);
app.use("/myComment", myComment);
app.use("/myScrap", myScrap);
app.use("/steam", News);
app.use("/chat", Chat);

// 테스트용
app.get("/", (req, res) => res.send("✅ 서버 작동 중"));

export default app;
