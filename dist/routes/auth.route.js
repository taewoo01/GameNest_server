"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const pool_1 = __importDefault(require("../db/pool")); // DB 연결 모듈
const index_1 = require("../constants/index"); // 해시 반복 횟수
const router = express_1.default.Router();
// 회원가입
router.post("/register", async (req, res) => {
    const { user_id, password, nickname, email } = req.body;
    if (!user_id || !password || !nickname || !email) {
        return res.status(400).json({ message: "모든 항목을 입력하세요" });
    }
    try {
        const hashedPassword = await bcrypt_1.default.hash(password, index_1.HASHED_NUMBER);
        await pool_1.default.execute(`INSERT INTO users (user_id, user_password, user_nickname, user_email, user_created_at, user_updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`, [user_id, hashedPassword, nickname, email]);
        res.status(201).json({ message: "회원가입 성공" });
    }
    catch (err) {
        console.error("❌ 회원가입 에러:", err);
        res.status(500).json({ message: "DB 오류 또는 중복 계정" });
    }
});
exports.default = router;
