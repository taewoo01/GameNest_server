// src/routes/game.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";
import { DetailQuery } from "../types/auth.types";
import { Game } from "../types/game.types";
import { RowDataPacket } from "mysql2";
import { ROUTES } from "../constants/routes";
import { MESSAGES } from "../constants/messages";
import authenticateToken from "../middlewares/authenticateToken";

const router = Router();

/** ----------------------------------------
 * 게임 목록 조회
 ---------------------------------------- */
router.get(ROUTES.GAME.LIST, async (req: Request, res: Response) => {
  try {
    const sort = req.query.sort as string;
    let orderBy = "id ASC";

    if (sort === "date") orderBy = "game_created_at DESC";
    else if (sort === "likes") orderBy = "(SELECT COUNT(*) FROM likes WHERE likes.game_id = games.id) DESC";
    else if (sort === "rating") orderBy = "(SELECT AVG(rating) FROM ratings WHERE ratings.game_id = games.id) DESC";
    else if (sort === "title") orderBy = "game_title COLLATE utf8mb4_0900_ai_ci ASC";
    else if (sort === "id") orderBy = "id ASC";

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, game_title, game_thumbnail FROM games ORDER BY ${orderBy}`
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ 게임 목록 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 게임 찜
 ---------------------------------------- */-
router.post(ROUTES.GAME.LIKE, authenticateToken, async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const userId = req.user.id;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM likes WHERE user_id = ? AND game_id = ?",
      [userId, gameId]
    );

    let liked = false;
    if (rows.length > 0) {
      await pool.execute("DELETE FROM likes WHERE user_id = ? AND game_id = ?", [userId, gameId]);
      liked = false;
    } else {
      await pool.execute("INSERT INTO likes (user_id, game_id, created_at) VALUES (?, ?, NOW())", [userId, gameId]);
      liked = true;
    }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS likeCount FROM likes WHERE game_id = ?",
      [gameId]
    );

    res.json({
      liked,
      likeCount: countRows[0].likeCount || 0,
      message: liked ? MESSAGES.GAME_LIKE_ADDED : MESSAGES.GAME_LIKE_REMOVED,
    });
  } catch (err) {
    console.error("❌ 찜 토글 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 게임 별점 등록/수정
 ---------------------------------------- */
router.post(ROUTES.GAME.RATING, authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params; // game_id
  const userId = req.user.id;
  const { rating } = req.body;

  if (rating == null) return res.status(400).json({ message: MESSAGES.INVALID_INPUT });

  try {
    const [rows] = await pool.execute("SELECT 1 FROM ratings WHERE user_id = ? AND game_id = ?", [userId, id]);

    if (rows.length > 0) {
      await pool.execute(
        "UPDATE ratings SET rating = ?, created_at = NOW() WHERE user_id = ? AND game_id = ?",
        [rating, userId, id]
      );
    } else {
      await pool.execute(
        "INSERT INTO ratings (user_id, game_id, rating, created_at) VALUES (?, ?, ?, NOW())",
        [userId, id, rating]
      );
    }

    res.json({ message: MESSAGES.RATING_SAVE_SUCCESS });
  } catch (err) {
    console.error("❌ 별점 저장 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 별점 조회
 ---------------------------------------- */
router.get(ROUTES.GAME.RATING, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id } = req.query;

  try {
    const [avgRows] = await pool.execute("SELECT ROUND(AVG(rating), 1) AS avg_rating FROM ratings WHERE game_id = ?", [id]);

    let userRating = null;
    if (user_id) {
      const [userRows] = await pool.execute("SELECT rating FROM ratings WHERE user_id = ? AND game_id = ?", [user_id, id]);
      if (userRows.length > 0) userRating = userRows[0].rating;
    }

    res.json({
      avg_rating: avgRows[0].avg_rating || 0,
      user_rating: userRating,
    });
  } catch (err) {
    console.error("❌ 별점 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 게임 상세 조회
 ---------------------------------------- */
router.get(ROUTES.GAME.DETAIL, async (req: Request<{ id: string }, any, any, DetailQuery>, res: Response) => {
  const gameId = Number(req.params.id);
  const userId = req.user?.id ?? (req.query.user_id ? Number(req.query.user_id) : null);

  if (isNaN(gameId)) return res.status(400).json({ message: MESSAGES.INVALID_GAME_ID });
  if (userId !== null && isNaN(userId)) return res.status(400).json({ message: MESSAGES.INVALID_USER_ID });

  try {
    const [gameRows] = await pool.execute<RowDataPacket[]>("SELECT * FROM games WHERE id = ?", [gameId]);
    const game = gameRows[0];
    if (!game) return res.status(404).json({ message: MESSAGES.GAME_NOT_FOUND });

    let isLiked = false;
    let myRating = null;

    if (userId !== null) {
      const [likeRows] = await pool.execute<RowDataPacket[]>("SELECT * FROM likes WHERE user_id = ? AND game_id = ?", [userId, gameId]);
      isLiked = likeRows.length > 0;

      const [myRatingRows] = await pool.execute<RowDataPacket[]>("SELECT rating FROM ratings WHERE user_id = ? AND game_id = ?", [userId, gameId]);
      myRating = myRatingRows[0]?.rating ?? null;
    }

    const [likeCountRows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS likeCount FROM likes WHERE game_id = ?", [gameId]);
    const likeCount: number = likeCountRows[0]?.likeCount ?? 0;

    const [avgRatingRows] = await pool.execute<RowDataPacket[]>("SELECT AVG(rating) as average FROM ratings WHERE game_id = ?", [gameId]);
    const averageRating: number = Number(avgRatingRows[0]?.average ?? 0);

    res.json({
      game,
      liked: isLiked,
      likeCount,
      myRating,
      averageRating,
    });
  } catch (err) {
    console.error("❌ 게임 상세 정보 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 찜한 게임 목록
 ---------------------------------------- */
router.get(ROUTES.GAME.LIKED_LIST, authenticateToken, async (req: Request, res: Response) => {
  const userId = req.user.id;

  try {
    const [games] = await pool.execute<RowDataPacket[]>(
      `SELECT g.* FROM likes l JOIN games g ON l.game_id = g.id WHERE l.user_id = ? ORDER BY l.created_at DESC`,
      [userId]
    );

    res.json(games as Game[]);
  } catch (err) {
    console.error("❌ 찜한 게임 목록 조회 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

/** ----------------------------------------
 * 카테고리 게임 조회
 ---------------------------------------- */
router.get(ROUTES.GAME.CATEGORY, async (req: Request, res: Response) => {
  const { type, value } = req.params;
  let column: string;

  switch (type) {
    case "platform": column = "game_platforms"; break;
    case "mode": column = "game_modes"; break;
    case "tag": column = "game_tags"; break;
    default: return res.status(400).json({ message: MESSAGES.CATEGORY_NOT_FOUND });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, game_title, game_thumbnail FROM games WHERE JSON_CONTAINS(${column}, JSON_ARRAY(?))`,
      [value]
    );

    res.json(rows);
  } catch (err) {
    console.error("카테고리 게임 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
