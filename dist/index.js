"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 📦 모듈 import
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// 📄 .env 파일 로드
dotenv_1.default.config();
const app = (0, express_1.default)();
// 🧩 미들웨어
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 🛣️ 라우터 import
const auth_route_1 = __importDefault(require("./routes/auth.route"));
//import gamesRoutes from "./routes/games.route";
//import communityRoutes from "./routes/community.route";
//import commentRoutes from "./routes/comment.route";
// 🛤️ 라우터 연결
app.use("/auth", auth_route_1.default);
//app.use("/games", gamesRoutes);
//app.use("/community", communityRoutes);
//app.use("/comment", commentRoutes);
// ✅ 기본 테스트 라우터
app.get("/", (req, res) => {
    res.send("✅ 서버 작동 중");
});
// 🚀 서버 실행
app.listen(5000, "0.0.0.0", () => {
    console.log("✅ Server running on port 5000");
});
