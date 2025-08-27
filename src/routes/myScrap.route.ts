// src/routes/myScraps.route.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";
import authenticateToken from "../middlewares/authenticateToken";
import { ROUTES } from "../constants/routes";
import { MESSAGES } from "../constants/messages";
import { AuthenticatedRequest } from "../AuthenticatedRequest";

const router = Router();

/** ----------------------------------------
 * 내가 스크랩한 목록 조회
 ---------------------------------------- */
router.get(ROUTES.MYSCRAP.LIST, authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user!.id;
  try {
    const [rows]: any[] = await pool.query(
      `
      SELECT 
        c.id,
        c.title,
        c.category,
        c.views,
        c.created_at,
        (SELECT COUNT(*) FROM community_likes WHERE post_id = c.id) AS likeCount
      FROM community_posts c
      JOIN community_scraps s ON s.post_id = c.id
      WHERE s.user_id = ?
      ORDER BY c.created_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("내 스크랩 게시글 조회 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
