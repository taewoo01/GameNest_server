import { Router } from "express";
import pool from "../db/pool";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";

const router = Router();

/** ----------------------------------------
 * 채팅 불러오기
 ---------------------------------------- */
router.get(ROUTES.CHAT.MESSAGE, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cm.id, cm.user_id, u.user_nickname AS user, cm.text, cm.date
       FROM chat_messages cm
       JOIN users u ON cm.user_id = u.id
       ORDER BY cm.date ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("DB 에러:", error);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR});
  }
});

export default router;
