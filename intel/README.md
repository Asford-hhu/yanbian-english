# 每日情报（intel）

这里每天自动生成一份「今日训练建议」，由 GitHub Actions 调用 Qoder Cloud Agents 写成，
供线上页面读取：

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
  "updatedAt": "2026-11-27T23:05:11.000Z"
}
```

## 启用步骤

1. 仓库 **Settings → Secrets and variables → Actions**，新增三个 Secret：

   | Name | 值 |
   | --- | --- |
   | `QODER_PAT` | Qoder 个人访问令牌 |
   | `QODER_AGENT_ID` | Cloud Agents 里那个 brief Agent 的 id |
   | `QODER_ENVIRONMENT_ID` | 同一 Agent 绑定的 environment id |

2. **Actions → daily-intel → Run workflow** 手动跑一次，确认生成 `intel/latest.json`。
3. 之后每天 07:00（北京时间）自动跑。

## 失败时的行为

- 三个 Secret 缺任一个：脚本打印 `[skip]` 并以 0 退出，**不会变成红色失败**，旧文件保留。
- Agent 超时 / 返回不合法：同样以 0 退出，旧文件保留。
- 页面读不到 `latest.json`（404 / 断网）：前端自动回落本地规则引擎，并标「本地估算 · 未连接 AI」。
