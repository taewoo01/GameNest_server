// src/routes/community.route.ts
import { Router, Response } from "express";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";
import pool from "../db/pool";
import authenticateToken from "../middlewares/authenticateToken";
import { AuthenticatedRequest } from "../AuthenticatedRequest";

const router = Router();

function stripHtmlTags(input: string) {
  return input.replace(/<\/?[^>]+(>|$)/g, "");
}

/** 내가 쓴 게시글 조회 (로그인 필요) */
router.get(
  ROUTES.COMMUNITY.MY_POSTS,
  authenticateToken,
  async (req, res: Response) => {
    const userId = (req as AuthenticatedRequest).user!.id;

    try {
      const result = await pool.query<{
        id: number;
        user_id: string;
        title: string;
        content: string;
        category: string;
        views: number;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT c.id, u.user_nickname AS user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
         FROM community_posts c
         JOIN users u ON c.user_id = u.id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("❌ 내 게시글 조회 오류:", err);
      res.status(500).json({ message: MESSAGES.SERVER_ERROR });
    }
  }
);

/** 게시글 작성 */
router.post(
  ROUTES.COMMUNITY.WRITE,
  authenticateToken,
  async (req, res: Response) => {
    const { title, content, category } = req.body;
    const userId = (req as AuthenticatedRequest).user!.id;

    if (!title || !content || !category)
      return res.status(400).json({ message: MESSAGES.REQUIRED_FIELDS });

    const validCategories = ["자유", "질문"];
    if (!validCategories.includes(category))
      return res.status(400).json({ message: MESSAGES.INVALID_CATEGORY });

    try {
      const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (userResult.rows.length === 0)
        return res.status(400).json({ message: MESSAGES.USER_NOT_FOUND });

      const cleanContent = stripHtmlTags(content);

      await pool.query(
        `INSERT INTO community_posts
          (user_id, title, content, category, views, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, NOW(), NOW())`,
        [userId, title, cleanContent, category]
      );

      res.status(201).json({ message: MESSAGES.POST_CREATE_SUCCESS });
    } catch (err: any) {
      console.error("글 작성 오류:", err);
      res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: err.message });
    }
  }
);

/** 좋아요 / 스크랩 토글 */
router.post(
  ROUTES.COMMUNITY.ACTION_COMMU,
  authenticateToken,
  async (req, res: Response) => {
    const postId = Number(req.params.id);
    if (isNaN(postId)) return res.status(400).json({ message: "유효하지 않은 게시글 ID입니다." });

    const userId = (req as AuthenticatedRequest).user!.id;
    const { type }: { type: "like" | "scrap" } = req.body;

    try {
      if (type === "like") {
        const existsResult = await pool.query(
          "SELECT * FROM community_likes WHERE user_id = $1 AND post_id = $2",
          [userId, postId]
        );
        if (existsResult.rows.length > 0) {
          await pool.query(
            "DELETE FROM community_likes WHERE user_id = $1 AND post_id = $2",
            [userId, postId]
          );
        } else {
          await pool.query(
            "INSERT INTO community_likes (user_id, post_id) VALUES ($1, $2)",
            [userId, postId]
          );
        }
      }

      if (type === "scrap") {
        const existsResult = await pool.query(
          "SELECT * FROM community_scraps WHERE user_id = $1 AND post_id = $2",
          [userId, postId]
        );
        if (existsResult.rows.length > 0) {
          await pool.query(
            "DELETE FROM community_scraps WHERE user_id = $1 AND post_id = $2",
            [userId, postId]
          );
        } else {
          await pool.query(
            "INSERT INTO community_scraps (user_id, post_id) VALUES ($1, $2)",
            [userId, postId]
          );
        }
      }

      // 최신 상태 조회
      const postResult = await pool.query(
        `SELECT c.id, u.user_nickname AS user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
         FROM community_posts c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [postId]
      );
      const post = postResult.rows[0];

      const likeCountResult = await pool.query(
        "SELECT COUNT(*) as count FROM community_likes WHERE post_id = $1",
        [postId]
      );
      const likeCount = Number(likeCountResult.rows[0].count);

      const likeRowsResult = await pool.query(
        "SELECT * FROM community_likes WHERE user_id = $1 AND post_id = $2",
        [userId, postId]
      );
      const liked = likeRowsResult.rows.length > 0;

      const scrapRowsResult = await pool.query(
        "SELECT * FROM community_scraps WHERE user_id = $1 AND post_id = $2",
        [userId, postId]
      );
      const scrapped = scrapRowsResult.rows.length > 0;

      res.json({ ...post, likeCount, liked, scrapped });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: MESSAGES.SERVER_ERROR });
    }
  }
);

export default router;
