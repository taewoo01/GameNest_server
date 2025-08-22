// 📦 모듈 import
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// 📄 .env 파일 로드
dotenv.config();

const app = express();

// 🧩 미들웨어
app.use(cors());
app.use(express.json());

// 🛣️ 라우터 import
import authRoutes from "./routes/auth.route";
import gamesRoutes from "./routes/game.route";
import communityRoutes from "./routes/community.routs"
import gameComment from "./routes/gameComment.route"
import communityComment from "./routes/communityComment.route"
import myComment from "./routes/myComment.route"
import myScrap from "./routes/myScrap.route"

// 🛤️ 라우터 연결
app.use("/auth", authRoutes);
app.use("/game", gamesRoutes);
app.use("/community", communityRoutes);
app.use("/gameComment", gameComment);
app.use("/communityComment", communityComment);
app.use("/myComment", myComment);
app.use("/myScrap", myScrap);
//app.use("/comment", commentRoutes);

// ✅ 기본 테스트 라우터
app.get("/", (req, res) => {
  res.send("✅ 서버 작동 중");
});

// 🚀 서버 실행
app.listen(5000, "0.0.0.0", () => {
  console.log("✅ Server running on port 5000");
});
