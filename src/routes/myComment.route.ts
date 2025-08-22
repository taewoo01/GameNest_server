// src/routes/myComment.route.ts
import { Router, Request, Response } from "express";
import authenticateToken from "../middlewares/authenticateToken";
import pool from "../db/pool";

const router = Router();

// ---------------- 내가 쓴 댓글 전체 조회 ----------------
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    // ✅ 게임 댓글
    const [gameComments]: any = await pool.query(
      `SELECT gc.id, gc.game_id AS postId, g.game_title AS postTitle, gc.content, gc.created_at AS createdAt
       FROM game_comments gc
       JOIN games g ON gc.game_id = g.id
       WHERE gc.user_id = ?`,
      [userId]
    );

    // ✅ 커뮤니티 댓글
    const [communityComments]: any = await pool.query(
      `SELECT cc.id, cc.post_id AS postId, c.title AS postTitle, cc.content, cc.created_at AS createdAt
       FROM community_comments cc
       JOIN community_posts c ON cc.post_id = c.id
       WHERE cc.user_id = ?`,
      [userId]
    );

    // ✅ 두 댓글 합치고 최신순 정렬
    const allComments = [
      ...communityComments.map(c => ({ ...c, postType: 'community' })),
      ...gameComments.map(c => ({ ...c, postType: 'game' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allComments);
  } catch (err) {
    console.error("내 댓글 조회 오류:", err);
    res.status(500).json({ message: "내 댓글 조회 실패" });
  }
});

export default router;
