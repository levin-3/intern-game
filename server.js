import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import aiReviewHandler from "./api/ai-review.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// 本地调试时复用 Vercel 的 API 函数，保证本地和线上逻辑一致。
app.all("/api/ai-review", aiReviewHandler);

// 静态前端文件应放在 public/index.html 和 public/assets/ 下。
app.use(express.static(publicDir));

// 单页应用兜底：访问任意非 API 路径时返回首页，避免 Cannot GET /。
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Demo is running at http://localhost:${PORT}`);
  console.log(`AI provider: ${process.env.AI_PROVIDER || "deepseek"}`);
});
