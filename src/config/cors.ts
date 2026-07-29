// src/config/cors.ts
// Express(app.ts)와 Socket.IO(index.ts) 양쪽에서 공유하는 CORS 허용 origin 목록.
export const allowedOrigins: string[] = [
  process.env.CLIENT_URL || "https://game-nest-gilt.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
