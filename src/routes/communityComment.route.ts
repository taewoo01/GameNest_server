import { Router, Request, Response } from "express";
import pool from "../db/pool";
import authenticateToken from "../middlewares/authenticateToken";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";

const router = Router();

/** ----------------------------------------
 * 댓글 리스트 트리 구조 변환
 ---------------------------------------- */
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

/** ----------------------------------------
 * 커뮤니티 댓글 조회
 ---------------------------------------- */
router.get( ROUTES.COMMUNITYCOMMENT.LIST, async (req: Request, res: Response) => {
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
    res.status(500).json({ message: MESSAGES.SERVER_ERROR});
  }
});

/** ----------------------------------------
 * 커뮤니티 댓글 작성
 ---------------------------------------- */
router.post(ROUTES.COMMUNITYCOMMENT.LIST, authenticateToken, async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const userId = req.user?.id;
  const { content, parent_id } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "")
    return res.status(400).json({ message: MESSAGES.COMMENT_FIELDS });

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
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: err.message });
  }
});

/** ----------------------------------------
 * 커뮤니티 댓글 수정
 ---------------------------------------- */
router.put(ROUTES.COMMUNITYCOMMENT.UPDATE, authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;
  const { content } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "")
    return res.status(400).json({ message: MESSAGES.COMMENT_FIELDS });

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

    res.json({ message: MESSAGES.COMMENT_UPDATE_SUCESS });
  } catch (err: any) {
    console.error("댓글 수정 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: err.message });
  }
});

/** ----------------------------------------
 * 커뮤니티 댓글 삭제
 ---------------------------------------- */
router.delete(ROUTES.COMMUNITYCOMMENT.UPDATE, authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });

  try {
    const [rows]: any = await pool.query(
      `SELECT user_id FROM community_comments WHERE id = ?`,
      [commentId]
    );

    if (rows.length === 0) return res.status(404).json({ message: MESSAGES.COMMENT_NOT_FOUND });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: MESSAGES.USER_ONIY_DELETE });

    await pool.query(`DELETE FROM community_comments WHERE id = ?`, [commentId]);

    res.json({ message: MESSAGES.COMMENT_DELETE_SUCESS });
  } catch (err: any) {
    console.error("댓글 삭제 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: err.message });
  }
});

export default router;
