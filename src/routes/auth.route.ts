import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool";
import jwt, { verify } from "jsonwebtoken";
import authenticateToken from "../middlewares/authenticateToken";
import { HASHED_NUMBER } from "../constants";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";
import { User } from "../types/auth.types";
import { RowDataPacket } from "mysql2";

const router = express.Router();

/** ----------------------------------------
 * 회원가입
 ---------------------------------------- */
router.post(ROUTES.AUTH.REGISTER, async (req: Request, res: Response) => {
  const { user_login_id, user_password, user_nickname, user_email } = req.body as User;

  if (!user_login_id || !user_password || !user_nickname || !user_email) {
    return res.status(400).json({ message: MESSAGES.REQUIRED_FIELDS });
  }

  try {
    const hashedPassword = await bcrypt.hash(user_password, HASHED_NUMBER);

    await pool.execute(
      `INSERT INTO users (user_login_id, user_password, user_nickname, user_email, user_created_at, user_updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [user_login_id, hashedPassword, user_nickname, user_email]
    );

    res.status(201).json({ message: MESSAGES.REGISTER_SUCCESS });
  } catch (err) {
    console.error("❌ 회원가입 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 로그인
 ---------------------------------------- */
router.post(ROUTES.AUTH.LOGIN, async (req: Request, res: Response) => {
  const { user_login_id, user_password } = req.body;

  if (!user_login_id || !user_password) {
    return res.status(400).json({ message: MESSAGES.REQUIRED_LOGIN_FIELDS });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM users WHERE user_login_id = ?",
      [user_login_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: MESSAGES.USER_NOT_FOUND });
    }

    const user = rows[0] as User;
    const isMatch = await bcrypt.compare(user_password, user.user_password);
    if (!isMatch) return res.status(401).json({ message: MESSAGES.WRONG_PASSWORD });

    const token = jwt.sign(
      { id: user.id, user_id: user.user_login_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({
      message: MESSAGES.LOGIN_SUCCESS,
      token,
      user_nickname: user.user_nickname,
    });
  } catch (err) {
    console.error("❌ 로그인 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 아이디 찾기
 ---------------------------------------- */
router.post(ROUTES.AUTH.FIND_ID, async (req: Request, res: Response) => {
  const { user_email, user_nickname } = req.body;

  if (!user_email || !user_nickname) {
    return res.status(400).json({ message: MESSAGES.REQUIRED_EMAIL_NICKNAME });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT user_login_id FROM users WHERE user_email = ? AND user_nickname = ?",
      [user_email, user_nickname]
    );

    if (rows.length === 0) return res.status(404).json({ message: MESSAGES.USER_NOT_FOUND });

    res.status(200).json({ user_login_id: rows[0].user_login_id });
  } catch (err) {
    console.error("❌ 아이디 찾기 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 비밀번호 찾기
 ---------------------------------------- */
 async function findUserByIdAndEmail(user_login_id: string, user_email: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM users WHERE user_login_id = ? AND user_email = ?",
    [user_login_id, user_email]
  );
  return rows.length ? rows[0] : null;
}

router.post(ROUTES.AUTH.FIND_PW, async (req: Request, res: Response) => {
  const { user_login_id, user_email } = req.body; // user_email로 수정

  if (!user_login_id || !user_email) {
    return res.status(400).json({ message: MESSAGES.FIND_PW_FIELDS });
  }

  try {
    const user = await findUserByIdAndEmail(user_login_id, user_email);

    if (!user) return res.status(404).json({ message: MESSAGES.FIND_PW_FAIL });

    res.status(200).json({ message: MESSAGES.FIND_PW_SUCESS, userId: user.id });
  } catch (err) {
    console.error("❌ 비밀번호 찾기 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 정보 수정
 ---------------------------------------- */
router.patch(ROUTES.AUTH.UPDATE, async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });

  try {
    const decoded: any = verify(token, process.env.JWT_SECRET as string);
    const userId = decoded.id;
    const { currentNickname, newNickname, currentEmail, newEmail } = req.body;

    if (!currentNickname || !currentEmail) {
      return res.status(400).json({ message: MESSAGES.REQUIRED_UPDATE_FIELDS });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM users WHERE id = ? AND user_nickname = ? AND user_email = ?",
      [userId, currentNickname, currentEmail]
    );

    if (rows.length === 0) return res.status(400).json({ message: MESSAGES.UPDATE_FAIL });

    await pool.execute(
      "UPDATE users SET user_nickname = ?, user_email = ?, user_updated_at = NOW() WHERE id = ?",
      [newNickname || currentNickname, newEmail || currentEmail, userId]
    );

    res.json({ message: MESSAGES.UPDATE_SUCESS });
  } catch (err) {
    console.error("❌ 정보 수정 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 비밀번호 변경
 ---------------------------------------- */
router.put(ROUTES.AUTH.UPDATE_PW, authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: MESSAGES.UPDATE_PW_FIELDS });

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT user_password FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: MESSAGES.USER_NOT_FOUND });

    const isMatch = await bcrypt.compare(oldPassword, (rows[0] as any).user_password);
    if (!isMatch) return res.status(400).json({ message: MESSAGES.UPDATE_PW_FAIL });

    const hashedPassword = await bcrypt.hash(newPassword, HASHED_NUMBER);

    await pool.execute(
      "UPDATE users SET user_password = ?, user_updated_at = NOW() WHERE id = ?",
      [hashedPassword, userId]
    );

    res.status(200).json({ message: MESSAGES.UPDATE_PW_SUCESS });
  } catch (err) {
    console.error("❌ 비밀번호 변경 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 비밀번호 변경 (로그인 필요없음 )
 ---------------------------------------- */
router.put(ROUTES.AUTH.NOLOGIN_UPDATE_PW, async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: MESSAGES.FIND_PW_FIELDS });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, HASHED_NUMBER);

    const [result] = await pool.execute(
      "UPDATE users SET user_password = ?, user_updated_at = NOW() WHERE id = ?",
      [hashedPassword, userId]
    );

    res.status(200).json({ message: MESSAGES.UPDATE_PW_SUCESS });
  } catch (err) {
    console.error("❌ 비밀번호 변경 실패:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
