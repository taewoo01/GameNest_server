import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "./db/pool";

export default function setupSocket(io: Server) {
  // 인증 미들웨어
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("인증 실패"));

    jwt.verify(token, process.env.JWT_SECRET as string, async (err, decoded: any) => {
      if (err || !decoded?.id) return next(new Error("토큰 유효하지 않음"));

      try {
        const [userRows]: any = await pool.query(
          "SELECT id, user_nickname FROM users WHERE id = ?",
          [decoded.id]
        );
        if (userRows.length === 0) return next(new Error("유저 없음"));

        socket.data.user = {
          id: userRows[0].id,
          nickname: userRows[0].user_nickname,
        };
        next();
      } catch (error) {
        console.error("유저 조회 에러:", error);
        next(new Error("서버 에러"));
      }
    });
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`🟢 유저 접속: ${user.nickname} (${socket.id})`);

    socket.on("chat message", async (msg) => {
      if (!msg.text?.trim()) return;

      try {
        await pool.query(
          "INSERT INTO chat_messages (user_id, text, date) VALUES (?, ?, ?)",
          [user.id, msg.text, new Date()]
        );

        io.emit("chat message", {
          user_id: user.id,
          user: user.nickname,
          text: msg.text,
          date: new Date().toISOString(),
        });
      } catch (error) {
        console.error("DB 저장 에러:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 유저 퇴장: ${user.nickname} (${socket.id})`);
    });
  });
}
