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

  // children 배열 초기화 & map 등록
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
 * 1. 게임 댓글 조회 (대댓글 포함)
 */
router.get("/:id/comments", async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);

  try {
    const [rows]: any = await pool.query(
      `SELECT gc.id, gc.content AS comment_content, gc.created_at,
              gc.user_id, gc.parent_id,
              IFNULL(u.user_nickname, '익명') AS user_nickname
       FROM game_comments gc
       LEFT JOIN users u ON gc.user_id = u.id
       WHERE gc.game_id = ?
       ORDER BY
         CASE WHEN gc.parent_id IS NULL THEN gc.id ELSE gc.parent_id END DESC,
         gc.created_at DESC`,
      [gameId]
    );

    const tree = buildCommentTree(rows);
    res.json(tree);
  } catch (err) {
    console.error("댓글 조회 오류:", err);
    res.status(500).json({ message: "댓글 조회 실패" });
  }
});

/**
 * 2. 댓글 작성
 */
router.post("/:id/comments", authenticateToken, async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const userId = req.user?.id;
  const { content, parent_id } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "") return res.status(400).json({ message: "댓글 내용을 입력하세요." });

  try {
    const [result]: any = await pool.query(
      `INSERT INTO game_comments (user_id, game_id, content, parent_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, gameId, content, parent_id || null]
    );

    const [rows]: any = await pool.query(
      `SELECT gc.id, gc.content AS comment_content, gc.created_at,
              gc.user_id, gc.parent_id,
              IFNULL(u.user_nickname, '익명') AS user_nickname
       FROM game_comments gc
       LEFT JOIN users u ON gc.user_id = u.id
       WHERE gc.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("댓글 작성 오류:", err);
    res.status(500).json({ message: "댓글 작성 실패", error: err.message });
  }
});

/**
 * 3. 댓글 수정
 */
router.put("/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;
  const { content } = req.body;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  if (!content || content.trim() === "") return res.status(400).json({ message: "댓글 내용을 입력하세요." });

  try {
    const [rows]: any = await pool.query(`SELECT user_id FROM game_comments WHERE id = ?`, [commentId]);
    if (rows.length === 0) return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: "본인 댓글만 수정 가능합니다." });

    await pool.query(`UPDATE game_comments SET content = ?, updated_at = NOW() WHERE id = ?`, [content, commentId]);
    res.json({ message: "댓글 수정 완료" });
  } catch (err: any) {
    console.error("댓글 수정 오류:", err);
    res.status(500).json({ message: "댓글 수정 실패", error: err.message });
  }
});

/**
 * 4. 댓글 삭제 (자식 댓글도 함께 삭제)
 */
router.delete("/:id/comments/:commentId", authenticateToken, async (req: Request, res: Response) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });

  try {
    const [rows]: any = await pool.query(`SELECT user_id FROM game_comments WHERE id = ?`, [commentId]);
    if (rows.length === 0) return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (rows[0].user_id !== userId) return res.status(403).json({ message: "본인 댓글만 삭제 가능합니다." });

    await pool.query(`DELETE FROM game_comments WHERE id = ?`, [commentId]);
    res.json({ message: "댓글 삭제 완료" });
  } catch (err: any) {
    console.error("댓글 삭제 오류:", err);
    res.status(500).json({ message: "댓글 삭제 실패", error: err.message });
  }
});

export default router;
