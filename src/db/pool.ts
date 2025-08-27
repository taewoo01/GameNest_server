import mysql from "mysql2/promise";
import dotenv from "dotenv";

// 📄 .env 파일 로드
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST as string,
  port: Number(process.env.DB_PORT) || 3306, // 포트 지정
  user: process.env.DB_USER as string,
  password: process.env.DB_PASS as string,
  database: process.env.DB_NAME as string,
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
