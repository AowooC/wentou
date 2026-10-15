# 问透 Wentou · AI follow-up questions for psychology notes

Psychology-only, for students worldwide. UI: 中文 (`/`) and English (`/en/`), auto-detected from browser language; AI output follows the notes' language. Non-psychology notes are politely declined. Offline fallback = rule-based, Chinese intro-psych only.

Edit UI text in `tools/build.py` + `tools/template.html`, then run `python3 tools/build.py` to regenerate `public/index.html` and `public/en/index.html`.

粘贴/上传普通心理学笔记 → AI 标出模糊点与易混概念 → 每处 2–3 个追问 → 语义判定理解程度 → 生成《疑点清单》。无 LLM 时自动降级为离线规则版。

## 运行
    LLM_API_KEY=sk-... node server.js      # http://localhost:8787 ；无依赖，需 Node 20+；PDF 上传需 poppler-utils(pdftotext)
    docker build -t wentou . && docker run -p 10000:10000 -e LLM_API_KEY=... wentou

## 环境变量
| 变量 | 默认 | 说明 |
|---|---|---|
| LLM_API_KEY | — | OpenAI API Key（必填才有 AI 模式） |
| ANALYZE_MODEL / JUDGE_MODEL / LLM_MODEL | gpt-4.1 / gpt-4.1 / gpt-4.1-mini | 检测 / 判定 / 识图 模型 |
| FREE_ANALYSES_PER_IP_PER_DAY | 5 | 每 IP 每天免费分析次数（判定为其 2 倍） |
| DAILY_USD_CAP | 3 | 全站每日 OpenAI 花费上限（美元，按 token 估算） |
| MAX_NOTE_CHARS / MAX_UPLOAD_MB | 6000 / 5 | 输入上限 |
| PUBLIC_URL | https://wentou.onrender.com | 用于 canonical/OG/sitemap |
| DATA_DIR | ./data | 反馈 feedback.jsonl 存放处（Render 免费盘为临时盘，反馈同时以 JSON 打到 stdout） |
| IP_SALT | wentou | 日志中 IP 哈希盐 |

接口：`GET /healthz`、`GET /api/status`、`POST /api/analyze|judge|extract|feedback`。配额与花费计数在内存中，重启即清零。
