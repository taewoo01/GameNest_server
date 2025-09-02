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

// ✅ 허용할 프론트엔드 도메인
const allowedOrigins = [process.env.CLIENT_URL || "https://game-nest-gilt.vercel.app"];

// 🔹 CORS 설정
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman, curl 등 origin 없는 요청 허용
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // withCredentials 허용
}));

// 🔹 모든 OPTIONS(preflight) 요청 허용
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// ✅ 라우터 연결
app.use("/auth", authRoutes);
app.use("/game", gamesRoutes);
app.use("/community", communityRoutes);
app.use("/gameComment", gameComment);
app.use("/communityComment", communityComment);
app.use("/myComment", myComment);
app.use("/myScrap", myScrap);
app.use("/steam", News);
app.use("/chat", Chat);

// 기본 라우터
app.get("/", (req, res) => res.send("✅ 서버 작동 중"));

// 🔹 404 처리
app.use((req, res) => res.status(404).json({ message: "Not Found" }));

// 🔹 글로벌 에러 처리
app.use((err: any, req: any, res: any, next: any) => {
  console.error("⚠️ 글로벌 에러:", err.message || err);
  res.status(500).json({
    message: "서버 오류",
    error: err.message || err
  });
});

export default app;
