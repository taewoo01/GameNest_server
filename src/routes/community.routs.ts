import { Router, Request, Response } from "express";
import { MESSAGES } from "../constants/messages";
import { ROUTES } from "../constants/routes";
import pool from "../db/pool";
import authenticateToken from "../middlewares/authenticateToken";
import { RowDataPacket } from "mysql2";

const router = Router();

function stripHtmlTags(input: string) {
  return input.replace(/<\/?[^>]+(>|$)/g, "");
}

/* ---------------- 내가 쓴 게시글 조회 (로그인 필요) ---------------- */
router.get("/my-posts", authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user.id;
  try {
    const [posts] = await pool.execute<RowDataPacket[]>(
      `SELECT c.id, u.user_nickname AS user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
      FROM community_posts c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json(posts);
  } catch (err) {
    console.error("❌ 내 게시글 조회 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/* ---------------- 게시글 목록 조회 ---------------- */
router.get(ROUTES.COMMUNITY.LIST, async (req: Request, res: Response) => {
  try {
    const { category = "", search = "" } = req.query;

    let sql = `
      SELECT c.id, u.user_nickname as user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
      FROM community_posts c
      JOIN users u ON c.user_id = u.id
    `;
    const params: any[] = [];
    const where: string[] = [];

    if (category && category !== "전체글" && category !== "인기글") {
      where.push("c.category = ?");
      params.push(category);
    }

    if (search) {
      where.push("c.title LIKE ?");
      params.push(`%${search}%`);
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    if (category === "인기글") {
      sql += where.length > 0 ? " AND c.views >= 50" : " WHERE c.views >= 50";
    }

    sql += " ORDER BY c.created_at DESC";

    const [rows]: any[] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: MESSAGES.POST_FETCH_FAIL });
  }
});

/* ---------------- 게시글 작성 ---------------- */
router.post(ROUTES.COMMUNITY.WRITE, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, content, category } = req.body;
    const user_id = req.user?.id;

    if (!user_id) return res.status(401).json({ message: MESSAGES.USER_NOT_FOUND });
    if (!title || !content || !category) return res.status(400).json({ message: MESSAGES.REQUIRED_FIELDS });

    const validCategories = ["자유", "질문"];
    if (!validCategories.includes(category)) return res.status(400).json({ message: MESSAGES.INVALID_CATEGORY });

    const [userRows]: any = await pool.query("SELECT id FROM users WHERE id = ?", [user_id]);
    if (userRows.length === 0) return res.status(400).json({ message: MESSAGES.USER_NOT_FOUND });

    const cleanContent = stripHtmlTags(content); // ✅ HTML 제거

    const sql = `
      INSERT INTO community_posts
        (user_id, title, content, category, views, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, NOW(), NOW())
    `;
    await pool.query(sql, [user_id, title, cleanContent, category]);

    res.status(201).json({ message: MESSAGES.POST_CREATE_SUCCESS });
  } catch (err: any) {
    console.error("글 작성 오류:", err);
    res.status(500).json({ message: MESSAGES.POST_CREATE_FAIL, error: err.message });
  }
});

/* ---------------- 게시글 상세 조회 (로그인 없어도 가능) ---------------- */
router.get(ROUTES.COMMUNITY.DETAIL_COMMU, async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  const token = req.headers.authorization?.split(" ")[1];
  let userId: number | null = null;

  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      userId = payload.id;
    } catch {}
  }

  if (isNaN(postId)) return res.status(400).json({ message: "유효하지 않은 게시글 ID입니다." });

  try {
    // 조회수 증가
    await pool.query("UPDATE community_posts SET views = views + 1 WHERE id = ?", [postId]);

    // 게시글 데이터 조회
    const [postRows]: any = await pool.query(
      `SELECT c.id, u.user_nickname AS user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
       FROM community_posts c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [postId]
    );

    if (postRows.length === 0) return res.status(404).json({ message: MESSAGES.POST_NOT_FOUND });

    const post = postRows[0];

    // 좋아요 개수
    const [likeCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM community_likes WHERE post_id = ?",
      [postId]
    );
    const likeCount = likeCountRows[0].count;

    // 로그인 유저일 경우 liked / scrapped 상태
    let liked = false;
    let scrapped = false;

    if (userId) {
      const [likeRows]: any = await pool.query(
        "SELECT * FROM community_likes WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );
      liked = likeRows.length > 0;

      const [scrapRows]: any = await pool.query(
        "SELECT * FROM community_scraps WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );
      scrapped = scrapRows.length > 0;
    }

    res.json({ ...post, likeCount, liked, scrapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: MESSAGES.POST_FETCH_FAIL });
  }
});

/* ---------------- 좋아요 / 스크랩 토글 (로그인 필요) ---------------- */
router.post(ROUTES.COMMUNITY.ACTION_COMMU, authenticateToken, async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) return res.status(400).json({ message: "유효하지 않은 게시글 ID입니다." });

  const userId = req.user.id;
  const { type }: { type: "like" | "scrap" } = req.body;

  try {
    if (type === "like") {
      const [exists]: any = await pool.query(
        "SELECT * FROM community_likes WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );
      if (exists.length > 0) {
        await pool.query("DELETE FROM community_likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
      } else {
        await pool.query("INSERT INTO community_likes (user_id, post_id) VALUES (?, ?)", [userId, postId]);
      }
    }

    if (type === "scrap") {
      const [exists]: any = await pool.query(
        "SELECT * FROM community_scraps WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );
      if (exists.length > 0) {
        await pool.query("DELETE FROM community_scraps WHERE user_id = ? AND post_id = ?", [userId, postId]);
      } else {
        await pool.query("INSERT INTO community_scraps (user_id, post_id) VALUES (?, ?)", [userId, postId]);
      }
    }

    // 최신 상태 반영
    const [postRows]: any = await pool.query(
      `SELECT c.id, u.user_nickname AS user_id, c.title, c.content, c.category, c.views, c.created_at, c.updated_at
       FROM community_posts c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [postId]
    );
    const post = postRows[0];

    const [likeCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM community_likes WHERE post_id = ?",
      [postId]
    );
    const likeCount = likeCountRows[0].count;

    const [likeRows]: any = await pool.query(
      "SELECT * FROM community_likes WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );
    const liked = likeRows.length > 0;

    const [scrapRows]: any = await pool.query(
      "SELECT * FROM community_scraps WHERE user_id = ? AND post_id = ?",
      [userId, postId]
    );
    const scrapped = scrapRows.length > 0;

    res.json({ ...post, likeCount, liked, scrapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: MESSAGES.ACTION_FAIL });
  }
});

export default router;
