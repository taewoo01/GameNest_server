// src/routes/myComment.route.ts
import { Router, Response } from "express";
import authenticateToken from "../middlewares/authenticateToken";
import pool from "../db/pool";
import { ROUTES } from "../constants/routes";
import { MESSAGES } from "../constants/messages";
import { AuthenticatedRequest } from "../AuthenticatedRequest";
import { QueryResult } from "pg";

const router = Router();

// DB에서 가져올 댓글 타입
type GameCommentRow = {
  id: number;
  postId: number;
  postTitle: string;
  content: string;
  createdAt: string;
};

type CommunityCommentRow = {
  id: number;
  postId: number;
  postTitle: string;
  content: string;
  createdAt: string;
};

// 댓글 타입
interface MyComment {
  id: number;
  postId: number;
  postTitle: string;
  content: string;
  createdAt: string;
  postType: "community" | "game";
}

/** ----------------------------------------
 * 내가 쓴 댓글 조회
 ---------------------------------------- */
router.get(ROUTES.MYCOMMENT.LIST, authenticateToken, async (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).user!.id;

  try {
    // ✅ 게임 댓글
    const gameResult: QueryResult<GameCommentRow> = await pool.query(
      `SELECT gc.id, gc.game_id AS "postId", g.game_title AS "postTitle", gc.content, gc.created_at AS "createdAt"
       FROM game_comments gc
       JOIN games g ON gc.game_id = g.id
       WHERE gc.user_id = $1`,
      [userId]
    );
    const gameComments: GameCommentRow[] = gameResult.rows;

    // ✅ 커뮤니티 댓글
    const communityResult: QueryResult<CommunityCommentRow> = await pool.query(
      `SELECT cc.id, cc.post_id AS "postId", c.title AS "postTitle", cc.content, cc.created_at AS "createdAt"
       FROM community_comments cc
       JOIN community_posts c ON cc.post_id = c.id
       WHERE cc.user_id = $1`,
      [userId]
    );
    const communityComments: CommunityCommentRow[] = communityResult.rows;

    // ✅ 두 댓글 합치고 최신순 정렬
    const allComments: MyComment[] = [
      ...communityComments.map(
        ({ id, postId, postTitle, content, createdAt }: CommunityCommentRow) => ({
          id,
          postId,
          postTitle,
          content,
          createdAt,
          postType: "community" as const
        })
      ),
      ...gameComments.map(
        ({ id, postId, postTitle, content, createdAt }: GameCommentRow) => ({
          id,
          postId,
          postTitle,
          content,
          createdAt,
          postType: "game" as const
        })
      )
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allComments);
  } catch (err) {
    console.error("내 댓글 조회 오류:", err);
    res.status(500).json({ message: MESSAGES.SERVER_ERROR });
  }
});

export default router;
