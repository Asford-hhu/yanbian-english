# 每日情报（intel）

这里每天自动生成一份「今日训练建议」，由 GitHub Actions 调用大模型写成，供线上页面读取：

```
https://raw.githubusercontent.com/Asford-hhu/yanbian-english/main/intel/latest.json
```

## 文件

| 文件 | 用途 |
| --- | --- |
| `latest.json` | 最新一天，页面只读这个 |
| `YYYY-MM-DD.json` | 按天存档，保留历史 |
| `index.json` | 最近 30 天的日期列表 |
| `gen.mjs` | 生成脚本（Actions 里跑） |

`latest.json` 结构：

```json
{
  "day": "2026-11-28",
  "line": "先补阅读细节题，再谈速度",
  "summary": "三段话，共 200–300 字…",
  "steps": [{ "t": "做 6 题阅读", "m": 8 }, …],
  "source": "agent",
  "provider": "dashscope",
  "model": "qwen-plus",
  "updatedAt": "2026-11-27T23:05:11.000Z"
}
```

## 启用：只加一个 Secret

两条通道二选一，**推荐阿里云百炼**（最简单，一个 key 就够）：

| Secret 名 | 取值 | 说明 |
| --- | --- | --- |
| `DASHSCOPE_API_KEY` | `sk-…` | 阿里云百炼控制台 → API-KEY 管理 → 创建 |
| `QODER_PAT` | `pt-…` | Qoder 控制台 → 设置 → 个人访问令牌（需已有 Cloud Agent） |

可选覆盖：`DASHSCOPE_MODEL`（默认 `qwen-plus`）、`QODER_AGENT_ID`、`QODER_ENVIRONMENT_ID`。

步骤：

1. 仓库 **Settings → Secrets and variables → Actions → New repository secret** 添加上面任意一个。
2. **Actions → daily-intel → Run workflow** 手动跑一次，确认 `intel/latest.json` 出现。
3. 之后每天 07:00（北京时间）自动跑。

## 失败时的行为

- 一个 Secret 都没配：打印 `[skip]` 并以 0 退出，**不会变红**，旧文件保留。
- 模型超时 / 输出不合规：重试一次，仍失败则 0 退出，旧文件保留。
- 页面读不到 `latest.json`：前端自动回落本地规则引擎，标「本地估算 · 未连接 AI」。
