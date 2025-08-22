import { Router, Request, Response } from "express";
import pool from "../db/pool";
import authenticateToken from "../middlewares/authenticateToken";
import { MESSAGES } from "../constants/messages";

const router = Router();

/**
 * ✅ 댓글 리스트를 트리 구조로 반환
 */
const buildCommentTree = (flatComments: any[]) => {
  const map = new Map<number, any>();
  const roots: any[] = [];

  flatComments.forEach(c => {
    c.children = [];
    map.set(c.id, c);
  });

  flatComments.forEach(c => {
    if (c.parent_id) {
      const parent = map.get(c.parent_id);
      if (parent) parent.children.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
};

/**
 * 1. 커뮤니티 댓글 조회 (대댓글 포함)
 * GET /communityComment/:id/comments
 */
router.get("/:id/comments", async (req: Request, res: Response) => {
  const postId = Number(req.params.id);

  try {
    const [rows]: any = await pool.query(
      `SELECT cc.id, cc.content AS comment_content, cc.created_at,
              cc.user_id, cc.parent_id,
              IFNULL(u.user_nickname, '익명') AS user_nickname
       FROM community_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.post_id = ?
       ORDER BY
        CASE WHEN cc.parent_id IS NULL THEN cc.id ELSE cc.parent_id END DESC,
        cc.created_at DESC`,
      [postId]
    );

    const tree = buildCommentTree(rows);
    res.json(tree);
  } catch (err) {
    console.error("댓글 조회 오류:", err);
    res.status(500).json({ message: "댓글 조회 실패" });
  }
});

/**
 * 2. 커뮤니티 댓글 작성 (대댓글 포함)
 * POST /communityComment/:id/comments
 */
router.post("/:id/comments", authenticateToken, async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const userId = req.user?.id;
  const { content, parent_id } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "")
    return res.status(400).json({ message: "댓글 내용을 입력하세요." });

  try {
    const [result]: any = await pool.query(
      `INSERT INTO community_comments (user_id, post_id, content, parent_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, postId, content, parent_id || null]
    );

    const [rows]: any = await pool.query(
      `SELECT cc.id, cc.content AS comment_content, cc.created_at,
              cc.user_id, cc.parent_id,
              IFNULL(u.user_nickname, '익명') AS user_nickname
       FROM community_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("댓글 작성 오류:", err);
    res.status(500).json({ message: "댓글 작성 실패", error: err.message });
  }
});

/**
 * 3. 커뮤니티 댓글 수정
 */
router.put("/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;
  const { content } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "")
    return res.status(400).json({ message: "댓글 내용을 입력하세요." });

  try {
    const [rows]: any = await pool.query(
      `SELECT user_id FROM community_comments WHERE id = ?`,
      [commentId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: "본인 댓글만 수정 가능합니다." });

    await pool.query(
      `UPDATE community_comments SET content = ?, updated_at = NOW() WHERE id = ?`,
      [content, commentId]
    );

    res.json({ message: "댓글 수정 완료" });
  } catch (err: any) {
    console.error("댓글 수정 오류:", err);
    res.status(500).json({ message: "댓글 수정 실패", error: err.message });
  }
});

/**
 * 4. 커뮤니티 댓글 삭제 (부모 댓글 삭제 시 자식 댓글도 삭제)
 */
router.delete("/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });

  try {
    const [rows]: any = await pool.query(
      `SELECT user_id FROM community_comments WHERE id = ?`,
      [commentId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: "본인 댓글만 삭제 가능합니다." });

    await pool.query(`DELETE FROM community_comments WHERE id = ?`, [commentId]);

    res.json({ message: "댓글 삭제 완료" });
  } catch (err: any) {
    console.error("댓글 삭제 오류:", err);
    res.status(500).json({ message: "댓글 삭제 실패", error: err.message });
  }
});

export default router;
