import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * AI 供应商配置
 *
 * 现在默认使用 DeepSeek：
 *   AI_PROVIDER=deepseek
 *   DEEPSEEK_API_KEY=你的DeepSeekKey
 *
 * 后续切换阿里云百炼：
 *   AI_PROVIDER=aliyun
 *   DASHSCOPE_API_KEY=你的阿里云百炼Key
 */
const PROVIDERS = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"
  },
  aliyun: {
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: process.env.DASHSCOPE_MODEL || "qwen-plus"
  }
};

const AI_PROVIDER = process.env.AI_PROVIDER || "deepseek";
const provider = PROVIDERS[AI_PROVIDER];

if (!provider) {
  throw new Error(`未知 AI_PROVIDER：${AI_PROVIDER}。请使用 deepseek 或 aliyun。`);
}

const client = new OpenAI({
  apiKey: provider.apiKey || "missing-api-key",
  baseURL: provider.baseURL
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function buildReviewPrompt(payload) {
  const scores = payload.scores || {};
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  const choiceText = choices.length
    ? choices.map(item => `${item.index}. ${item.text}`).join("\n")
    : "暂无选择记录";

  return `
你是一个面向大学生、应届生和实习生的 AI 职场成长教练。
用户刚完成一个职场闯关游戏《激活一下，实习生！》。

游戏任务是：
用户扮演运营实习生，围绕"新用户注册后没有完成首次学习打卡，导致激活率偏低"的问题，完成数据分析、方案设计、跨部门沟通和最终汇报。

请根据以下玩家数据，生成一份个性化职场能力报告。

【游戏结局】
${payload.endingTitle || "未知结局"}

【系统建议】
${payload.endingAdvice || "暂无"}

【能力分数】
分析力：${scores.analysis ?? 0}
沟通力：${scores.communication ?? 0}
方案完整度：${scores.plan ?? 0}
创意值：${scores.creativity ?? 0}
压力值：${scores.pressure ?? 0}
综合评分：${scores.total ?? 0}

【玩家关键选择】
${choiceText}

请你严格返回 JSON，不要返回 Markdown，不要返回解释说明，不要使用代码块。

JSON 格式必须如下：

{
  "title": "一句话结局标题",
  "scoreSummary": "对玩家整体表现的简短总结",
  "bossComment": "老板风格点评，严肃但可以有一点幽默感",
  "strengths": [
    "优势1",
    "优势2",
    "优势3"
  ],
  "weaknesses": [
    "不足1",
    "不足2",
    "不足3"
  ],
  "suggestion": "下一步优化建议",
  "jobFit": [
    "适合的实习方向1",
    "适合的实习方向2",
    "适合的实习方向3"
  ],
  "sevenDayPlan": [
    "Day 1：具体行动",
    "Day 2：具体行动",
    "Day 3：具体行动",
    "Day 4：具体行动",
    "Day 5：具体行动",
    "Day 6：具体行动",
    "Day 7：具体行动"
  ],
  "evidence": [
    "引用玩家的一个具体选择，并说明它如何影响评价",
    "再引用一个玩家的具体选择，并说明它如何影响评价"
  ],
  "endingLevel": "excellent"
}

字段要求：
1. endingLevel 根据玩家表现判断，只能是 excellent（优秀）、normal（普通）、funny（搞笑/创意多但缺数据）、hidden（隐藏结局——全面优秀）四种之一，与游戏结局对应。
2. strengths、weaknesses、jobFit、sevenDayPlan、evidence 必须是数组，不允许为空。
3. evidence 必须至少引用 2 条玩家的具体关键选择，并说明该选择反映了什么能力。
4. 内容必须具体，结合玩家的分数和选择来写，不要空泛鸡汤。
5. 如果玩家偏数据分析和轻量落地，要表扬其运营判断。
6. 如果玩家偏抽奖、重资源、缺少数据依据，要指出方案热闹但不够落地。
`;
}

function extractJsonFromText(text) {
  if (!text) return null;

  // 去掉可能出现的 ```json 代码块
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // 如果 AI 前后多说了几句话，尽量截取第一个 { 到最后一个 }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

function fallbackReview(rawText = "") {
  return {
    title: "AI 复盘生成中出现了一点小插曲",
    scoreSummary: "你的本轮表现已经完成记录，但 AI 返回格式暂时不够标准。",
    bossComment: "至少你已经跑完了完整项目流程，这比很多只停在 PPT 的方案强。",
    strengths: [
      "完成了完整的运营情景模拟流程",
      "产生了可用于复盘的选择记录",
      "已经具备 AI 个性化总结的基础"
    ],
    weaknesses: [
      "AI 返回格式需要继续稳定",
      "Prompt 可以进一步强调只返回 JSON",
      "前端展示可以保留兜底内容，避免现场演示失败"
    ],
    suggestion: "建议重新生成一次 AI 复盘，或在 Prompt 中继续强化 JSON 输出要求。",
    jobFit: [
      "用户运营实习生",
      "产品运营实习生",
      "增长运营助理"
    ],
    sevenDayPlan: [
      "Day 1：整理本轮选择记录，标注哪些选择影响了分析力",
      "Day 2：补充一个低成本 MVP 方案",
      "Day 3：设计 3 个核心验证指标",
      "Day 4：整理用户激活漏斗图",
      "Day 5：写一版结构化汇报稿",
      "Day 6：模拟老板追问并完善回答",
      "Day 7：把项目整理成作品集案例"
    ],
    evidence: [
      "AI 未能稳定解析具体选择，因此使用系统兜底复盘。",
      rawText ? "原始返回内容已被后端捕获，可继续优化解析逻辑。" : "本次没有可用的 AI 原始返回内容。"
    ],
    endingLevel: "good"
  };
}

app.post("/api/ai-review", async (req, res) => {
  try {
    if (!provider.apiKey) {
      const missingName = AI_PROVIDER === "aliyun" ? "DASHSCOPE_API_KEY" : "DEEPSEEK_API_KEY";
      return res.status(500).json({
        error: `后端缺少 ${missingName}。请复制 .env.example 为 .env，并填写对应 API Key。`
      });
    }

    const prompt = buildReviewPrompt(req.body || {});

    const completion = await client.chat.completions.create({
      model: provider.model,
      messages: [
        {
          role: "system",
          content: "你是专业的 AI 求职教练、职场能力分析师和校园招聘产品顾问。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      stream: false
    });

    const rawText = completion.choices?.[0]?.message?.content || "";

    let review;

    try {
      review = extractJsonFromText(rawText);
    } catch (parseError) {
      console.warn("AI 返回内容不是标准 JSON，使用兜底内容。");
      console.warn("AI 原始返回：", rawText);
      review = fallbackReview(rawText);
    }

    res.json({
      provider: AI_PROVIDER,
      model: provider.model,
      review
    });
  } catch (error) {
    console.error("AI review failed:", error);
    res.status(500).json({
      error: error.message || "AI 调用失败，请检查 API Key、模型名称和网络。"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Demo is running at http://localhost:${PORT}`);
  console.log(`AI provider: ${AI_PROVIDER}`);
  console.log(`AI model: ${provider.model}`);
});
