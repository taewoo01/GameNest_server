import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import setupSocket from "./socket";

dotenv.config();

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Socket.IO 설정
setupSocket(io);

httpServer.listen(5000, "0.0.0.0", () => {
  console.log("✅ Server running on port 5000");
});
