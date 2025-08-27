import { Server, Socket } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import pool from "./db/pool";

interface UserData {
  id: number;
  nickname: string;
}

interface ChatMessage {
  text: string;
}

export default function setupSocket(io: Server) {
  // 인증 미들웨어
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("인증 실패"));

    jwt.verify(token, process.env.JWT_SECRET as string, async (err: jwt.VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
      if (err || !decoded || typeof decoded === "string" || !("id" in decoded)) {
        return next(new Error("토큰 유효하지 않음"));
      }

      try {
        const [userRows]: any = await pool.query(
          "SELECT id, user_nickname FROM users WHERE id = ?",
          [decoded.id]
        );
        if (userRows.length === 0) return next(new Error("유저 없음"));

        socket.data.user = {
          id: userRows[0].id,
          nickname: userRows[0].user_nickname,
        } as UserData;

        next();
      } catch (error: unknown) {
        console.error("유저 조회 에러:", error);
        next(new Error("서버 에러"));
      }
    });
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as UserData;
    console.log(`🟢 유저 접속: ${user.nickname} (${socket.id})`);

    socket.on("chat message", async (msg: ChatMessage) => {
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
      } catch (error: unknown) {
        console.error("DB 저장 에러:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔴 유저 퇴장: ${user.nickname} (${socket.id})`);
    });
  });
}
