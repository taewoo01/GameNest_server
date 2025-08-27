import * as express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        nickname?: string; // 필요 시 추가
      };
    }
  }
}
