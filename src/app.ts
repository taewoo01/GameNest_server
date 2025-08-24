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

app.use(cors());
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

app.get("/", (req, res) => res.send("✅ 서버 작동 중"));

export default app;
