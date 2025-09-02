// src/routes/game.ts
import { Router, Request, Response } from "express";
import pool from "../db/pool";
import { ROUTES } from "../constants/routes";
import { MESSAGES } from "../constants/messages";
import authenticateToken from "../middlewares/authenticateToken";
import { AuthenticatedRequest } from "../AuthenticatedRequest";
import { Game } from "../types/game.types";
import { QueryResult } from "pg";

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
    else if (sort === "title") orderBy = "game_title ASC";
    else if (sort === "id") orderBy = "id ASC";

    const [rows] = await pool.query(
      `SELECT id, game_title, game_thumbnail FROM games ORDER BY ${orderBy}`
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ 게임 목록 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR, error: err instanceof Error ? err.message : err });
  }
});


/** ----------------------------------------
 * 게임 찜
 ---------------------------------------- */
router.post(ROUTES.GAME.LIKE, authenticateToken, async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const userId = (req as AuthenticatedRequest).user!.id;

  try {
    const likeResult: QueryResult = await pool.query(
      "SELECT * FROM likes WHERE user_id = $1 AND game_id = $2",
      [userId, gameId]
    );

    let liked = false;
    if (likeResult.rows.length > 0) {
      await pool.query("DELETE FROM likes WHERE user_id = $1 AND game_id = $2", [userId, gameId]);
    } else {
      await pool.query("INSERT INTO likes (user_id, game_id, created_at) VALUES ($1, $2, NOW())", [userId, gameId]);
      liked = true;
    }

    const countResult: QueryResult = await pool.query(
      "SELECT COUNT(*) AS likeCount FROM likes WHERE game_id = $1",
      [gameId]
    );

    const likeCount = Number(countResult.rows[0]?.likecount ?? 0);

    res.json({
      liked,
      likeCount,
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
  const gameId = Number(req.params.id);
  const userId = (req as AuthenticatedRequest).user!.id;
  const { rating } = req.body;

  if (rating == null) return res.status(400).json({ message: MESSAGES.INVALID_INPUT });

  try {
    const ratingResult: QueryResult = await pool.query(
      "SELECT 1 FROM ratings WHERE user_id = $1 AND game_id = $2",
      [userId, gameId]
    );

    if (ratingResult.rows.length > 0) {
      await pool.query(
        "UPDATE ratings SET rating = $1, created_at = NOW() WHERE user_id = $2 AND game_id = $3",
        [rating, userId, gameId]
      );
    } else {
      await pool.query(
        "INSERT INTO ratings (user_id, game_id, rating, created_at) VALUES ($1, $2, $3, NOW())",
        [userId, gameId, rating]
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
  const gameId = Number(req.params.id);
  const userIdQuery = req.query.user_id;

  try {
    const avgResult: QueryResult = await pool.query(
      "SELECT ROUND(AVG(rating)::numeric, 1) AS avg_rating FROM ratings WHERE game_id = $1",
      [gameId]
    );

    let userRating: number | null = null;
    if (userIdQuery) {
      const userResult: QueryResult = await pool.query(
        "SELECT rating FROM ratings WHERE user_id = $1 AND game_id = $2",
        [userIdQuery, gameId]
      );
      if (userResult.rows.length > 0) userRating = Number(userResult.rows[0].rating);
    }

    res.json({
      avg_rating: Number(avgResult.rows[0]?.avg_rating ?? 0),
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
router.get(ROUTES.GAME.DETAIL, authenticateToken, async (req: Request, res: Response) => {
  const gameId = Number(req.params.id);
  const userId = (req as AuthenticatedRequest).user!.id;

  if (isNaN(gameId)) return res.status(400).json({ message: MESSAGES.INVALID_GAME_ID });

  try {
    const gameResult: QueryResult<Game> = await pool.query("SELECT * FROM games WHERE id = $1", [gameId]);
    const game = gameResult.rows[0];
    if (!game) return res.status(404).json({ message: MESSAGES.GAME_NOT_FOUND });

    let isLiked = false;
    let myRating: number | null = null;

    if (userId) {
      const likeResult: QueryResult = await pool.query(
        "SELECT * FROM likes WHERE user_id = $1 AND game_id = $2",
        [userId, gameId]
      );
      isLiked = likeResult.rows.length > 0;

      const ratingResult: QueryResult = await pool.query(
        "SELECT rating FROM ratings WHERE user_id = $1 AND game_id = $2",
        [userId, gameId]
      );
      myRating = ratingResult.rows[0]?.rating ?? null;
    }

    const likeCountResult: QueryResult = await pool.query(
      "SELECT COUNT(*) AS likecount FROM likes WHERE game_id = $1",
      [gameId]
    );
    const likeCount = Number(likeCountResult.rows[0]?.likecount ?? 0);

    const avgRatingResult: QueryResult = await pool.query(
      "SELECT AVG(rating) AS average FROM ratings WHERE game_id = $1",
      [gameId]
    );
    const averageRating = Number(avgRatingResult.rows[0]?.average ?? 0);

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
  const userId = (req as AuthenticatedRequest).user!.id;

  try {
    const likedResult: QueryResult<Game> = await pool.query(
      `SELECT g.* FROM likes l JOIN games g ON l.game_id = g.id WHERE l.user_id = $1 ORDER BY l.created_at DESC`,
      [userId]
    );

    res.json(likedResult.rows);
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
    const categoryResult: QueryResult<Game> = await pool.query(
      `SELECT id, game_title, game_thumbnail FROM games WHERE ${column} @> $1::jsonb`,
      [JSON.stringify([value])]
    );

    res.json(categoryResult.rows);
  } catch (err) {
    console.error("카테고리 게임 조회 에러:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
