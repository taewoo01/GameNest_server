// authenticateToken.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { MESSAGES } from "../constants/messages";

export default function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err || !decoded || typeof decoded !== "object") {
      return res.status(403).json({ message: MESSAGES.INVALID_TOKEN });
    }

    // user 추가: 타입 단언 사용
    (req as any).user = { id: (decoded as any).id, email: (decoded as any).email };
    next();
  });
}
