# 90 天后 / 90 Days Later

> 热度退潮以后，哪些开源 AI 工具还值得学、值得用？

这是一个公开、可复现、有人类审核的 AI 工具耐久性观察项目。我们记录项目爆发时的状态，并在 30、90、180 和 365 天后复查维护、采用、社区与工程成熟度。

本项目不做“本周最火排行榜”，也不把 star 当成使用量。目标是帮助开发者和团队回答三个问题：

1. 现在是否值得投入学习时间？
2. 是否值得进入真实项目或有限度的生产试用？
3. 如果项目失速、改许可或停止维护，退出成本有多高？

## 第一阶段范围

优先研究有公开 GitHub 仓库、能够安装或运行的开源 AI 工具：

- Coding agents 与开发者工具
- Agent 与工作流框架
- RAG、数据与知识基础设施
- 推理与模型服务基础设施
- Evaluation、observability 与安全工具
- MCP 与集成基础设施
- AI-enabled applications（按应用类自己的可用性、数据质量与运维边界比较）

暂不混合评估闭源 SaaS、纯模型权重、论文演示仓库和资源列表。候选可以广泛取材，但最终只在同类项目中比较，避免用同一把尺子硬比框架、基础设施和成品应用。

## 两类内容

### 1. 90 天后

同一个项目在爆发时与复查时的前后对比：

- 当时为什么爆火？
- 热度峰值后是否继续发版和修复问题？
- 贡献者是留下了，还是只来点过 star？
- 是否出现真实下游依赖、第三方集成和公开采用证据？
- 今天适合谁使用，不适合谁使用？

### 2. 观察名单

记录最近出现异常关注增长的项目，但不做早期背书。进入观察名单不等于推荐，更不可能直接获得 A 级。

## 阶段

| 阶段 | 含义 |
| --- | --- |
| 🔥 Hype | 检测到可验证的关注爆发，进入观察名单 |
| 🟡 30d Active | 30 天后仍有有效维护活动 |
| 🟢 90d Durable | 维护、社区或采用证据在 90 天后仍成立 |
| 🔵 180d Adopted | 出现可信的下游采用或稳定使用证据 |
| 🟣 365d Infrastructure | 形成生态、长期依赖或明显迁移成本 |

时间只是复查节点，不是自动晋级条件。180 天仍存在，不代表已经成为基础设施。

## 评级

每个项目同时获得两个评级：

- **Learning Value**：是否值得投入时间学习，知识是否可迁移。
- **Adoption Confidence**：是否适合在明确边界内采用，维护和退出风险是否可接受。

总评级只有在两个维度都满足时才能达到相应等级。A 级还必须通过人工审核和硬性门槛；详见 [METHODOLOGY.md](METHODOLOGY.md)。

| 评级 | 编辑含义 |
| --- | --- |
| A | 值得认真学习，并可进入有边界、有回退方案的采用评估 |
| B | 有价值但仍有明显不确定性，适合试验或非关键场景 |
| C | 可观察或学习局部概念，不建议形成重要依赖 |
| D | 已休眠、停止、归档，或风险明显高于当前价值 |

A 不是永久认证、安全保证或投资建议。每个评级都带复查日期和证据置信度。

## 编辑原则

- 自动化可以发现候选、收集公开数据和生成草稿。
- 自动化不得直接授予 A 级，也不得发布未经人类批准的内容。
- 所有结论必须区分事实、推断和编辑判断。
- 每项关键结论附来源；更正保留修改记录。
- 项目按类型和生命周期比较，不把成熟库与新生框架直接混排。
- 机器人 commit、自动发版和模板 issue 不直接计为社区活力。

## 每周节奏

- 每周二：自动生成候选简报，优先寻找接近 90/180 天复查窗口的项目。
- 每周四：发布一篇经过审核的“90 天后”完整复盘。
- 每周日：可选发布一张图表或观察名单变化，不为凑频率降低标准。

推荐先坚持一篇深度复盘加一条轻量图表，而不是每周制作两条视频。

## 为什么图表优先

主内容使用三种固定视觉资产：

1. 从爆发前 30 天到复查日的 star 速度时间线。
2. “当时 vs 现在”的核心指标对照表。
3. 学习价值、采用信心、风险和证据置信度卡片。

视频作为月度精选内容：当案例包含产品演示、重大转折或维护者回应时，再把已有图表改造成 45–90 秒短视频。这样不会让剪辑吞掉研究时间。

## 工作流

```text
自动发现候选
    ↓
生成证据简报
    ↓
人工选择选题
    ↓
自动采集与起草
    ↓
人工核验、评级、批准
    ↓
进入定时发布队列
    ↓
30 / 90 / 180 / 365 天复查
```

详细状态机与发布门控见 [docs/EDITORIAL_WORKFLOW.md](docs/EDITORIAL_WORKFLOW.md)。

## 仓库结构

```text
config/                 发现与评级配置
content/drafts/         待审核内容
content/reports/        已批准或已发布报告
content/templates/      固定内容模板
data/candidates/        自动发现的候选项目
data/cohorts/           入选后不可随结果删除的 cohort
data/snapshots/         各观察日期的原始快照
docs/                   编辑与运营说明
scripts/                数据收集和校验脚本
tests/                  不联网的单元测试
```

## 本地运行

候选发现使用 GitHub Search API 和 GitHub 的按周 star history。建议提供只读 `GITHUB_TOKEN`：

```bash
GITHUB_TOKEN=... python3 scripts/discover.py
python3 -m unittest discover -s tests
python3 scripts/validate_review.py content/drafts content/reports
```

发现任务只生成候选文件和简报，不会发布内容。GitHub Actions 的定时任务也只上传待审核 artifact。

当前自动节奏：每周二、周五扫描候选；每月 5 日刷新 World Monitor 的公开证据快照。定时任务产生的是私有 Actions artifact，不会自动改评级或发布到任何社交平台。

## 主要公开数据源

- [GitHub REST API](https://docs.github.com/en/rest)
- [GitHub repository star history](https://docs.github.com/en/rest/activity/starring#get-repository-star-history)
- [GH Archive](https://www.gharchive.org/)：需要更长事件历史时使用
- [OpenSSF Scorecard](https://securityscorecards.dev/)：安全与工程成熟度的辅助证据
- [deps.dev](https://deps.dev/) 与 [ecosyste.ms](https://ecosyste.ms/)：包、依赖和下游采用信号
- 项目发行说明、文档、路线图与维护者公开声明

## 当前状态

`v0.1-review`：自动发现、证据采集、评级门控和人工发布流程已经可以运行。第一篇案例已经进入审核：

- [World Monitor · 188 天后完整复盘](content/drafts/worldmonitor-180-days-later.md)
- [可直接复制的小红书文案](content/xiaohongshu/worldmonitor/caption.txt)
- [小红书 3:4 图片目录](assets/worldmonitor/2026-09-06/)
- [可复核数据快照](data/snapshots/worldmonitor/2026-09-06/)

自动化只负责发现候选和收集证据，不会绕过人工批准发布内容。

## 许可

- `scripts/`、`tests/` 和自动化代码： [MIT](LICENSE)
- 原创报告、图表与项目生成的数据集： [CC BY 4.0](LICENSE-CONTENT.md)
