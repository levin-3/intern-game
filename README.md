# 《激活一下，实习生！》DeepSeek 临时接入版

这版默认接入 DeepSeek，后续也保留了阿里云百炼切换配置。

## 1. 安装依赖

在项目文件夹中执行：

```bash
npm install
```

## 2. 填写 DeepSeek API Key

复制 `.env.example`，重命名为 `.env`。

现在只需要重点改这几行：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

注意：不要把 API Key 写进 `index.html`，也不要把 `.env` 上传到公开仓库。

## 3. 启动项目

```bash
npm run dev
```

然后打开：

```text
http://localhost:3000
```

不要直接双击打开 `index.html`，因为 AI 接口 `/api/ai-review` 需要 Node 后端运行。

## 4. 后续切换到阿里云百炼

阿里云申请通过后，把 `.env` 改成：

```env
AI_PROVIDER=aliyun
DASHSCOPE_API_KEY=你的阿里云百炼APIKey
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
```

前端 `index.html` 不用改。

## 5. 主要修改位置

- `server.js`：AI 供应商切换、模型调用、AI 提示词
- `.env`：API Key、模型、供应商选择
- `index.html`：前端页面和结局页 AI 报告展示

## 6. assets 图片

如果你原来有图片资源，请把 `assets` 文件夹放到项目根目录：

```text
ai_intern_game_deepseek_version/
├── index.html
├── server.js
├── package.json
├── .env
└── assets/
```

没有 assets 也能跑，但比赛展示建议补上图片。
