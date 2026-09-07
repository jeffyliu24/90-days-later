#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'assets/worldmonitor/2026-09-06');
const CSV = path.join(ROOT, 'data/snapshots/worldmonitor/2026-09-06/star-history.csv');
const W = 1242;
const H = 1660;

const C = {
  paper: '#F6F1E7',
  paper2: '#FFFDF8',
  ink: '#13202B',
  muted: '#68737D',
  line: '#D9D2C5',
  orange: '#F05A3C',
  orangeSoft: '#FCE0D7',
  green: '#2F7D5B',
  greenSoft: '#DCECDF',
  blue: '#2B6CB0',
  blueSoft: '#DCE9F7',
  yellow: '#F2C14E',
  yellowSoft: '#F9EDC8',
  red: '#C43C3C',
};

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const text = (x, y, value, size = 48, fill = C.ink, weight = 400, anchor = 'start', extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${escapeXml(value)}</text>`;

const lines = (x, y, values, size = 48, gap = 1.3, fill = C.ink, weight = 400, anchor = 'start') =>
  values.map((value, index) => text(x, y + index * size * gap, value, size, fill, weight, anchor)).join('\n');

const rect = (x, y, width, height, fill, radius = 28, stroke = 'none', strokeWidth = 0) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

const line = (x1, y1, x2, y2, stroke = C.line, width = 2, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

const pill = (x, y, value, fill = C.orangeSoft, ink = C.orange, width = 180) =>
  `${rect(x, y, width, 54, fill, 27)}${text(x + width / 2, y + 38, value, 26, ink, 500, 'middle')}`;

const footer = (page) => `${line(72, 1572, 1170, 1572, C.line, 2)}
  ${text(72, 1618, '90 DAYS LATER', 26, C.muted, 500)}
  ${text(621, 1618, '数据截至 2026-09-06', 26, C.muted, 400, 'middle')}
  ${text(1170, 1618, `${page} / 9`, 26, C.muted, 500, 'end')}`;

const shell = (content, background = C.paper) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>World Monitor 188 天后复盘</title>
  <rect width="${W}" height="${H}" fill="${background}"/>
  <style>
    text { font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", Arial, sans-serif; }
  </style>
  ${content}
</svg>`;

const header = (kicker, titleValue, subtitle = '') => `
  ${pill(72, 68, kicker, C.orangeSoft, C.orange, 220)}
  ${text(72, 205, titleValue, 72, C.ink, 500)}
  ${subtitle ? text(72, 272, subtitle, 34, C.muted, 400) : ''}
`;

function cover() {
  return shell(`
    ${pill(72, 72, '爆火 188 天后', C.orangeSoft, C.orange, 260)}
    ${text(72, 290, '8.5 万星之后', 86, C.ink, 500)}
    ${text(72, 392, '它真的活下来了吗？', 86, C.ink, 500)}
    ${text(72, 535, 'WORLD MONITOR · 开源全球情报仪表盘', 38, C.blue, 500)}
    ${rect(72, 655, 1098, 476, C.ink, 38)}
    ${text(126, 775, '结论', 32, C.yellow, 500)}
    ${text(126, 902, '活着，而且变大了。', 66, C.paper2, 500)}
    ${text(126, 991, '但还没稳到 A。', 66, C.paper2, 500)}
    ${pill(126, 1040, '综合评级  B', C.orange, C.paper2, 238)}
    ${text(72, 1254, '学习价值 A', 46, C.green, 500)}
    ${text(392, 1254, '·', 46, C.muted, 400)}
    ${text(438, 1254, '采用信心 B', 46, C.orange, 500)}
    ${lines(72, 1352, ['不是“项目死没死”的二选一，', '而是检查热度退去后，交付是否仍可信。'], 34, 1.45, C.muted)}
    ${footer(1)}
  `);
}

function whatItIs() {
  const source = (x, y, label, fill, ink) => `${rect(x, y, 184, 76, fill, 38)}${text(x + 92, y + 51, label, 30, ink, 500, 'middle')}`;
  return shell(`
    ${header('认识工具 1 / 4', '它到底是干什么的？', '把散落的全球信号，放进一张可交互地图')}
    ${source(72, 365, '全球新闻', C.orangeSoft, C.orange)}
    ${source(294, 365, '冲突事件', C.yellowSoft, C.ink)}
    ${source(516, 365, '灾害天气', C.greenSoft, C.green)}
    ${source(738, 365, '金融市场', C.blueSoft, C.blue)}
    ${source(960, 365, '关键基建', C.orangeSoft, C.orange)}
    ${line(164, 462, 164, 530, C.orange, 3)}
    ${line(386, 462, 386, 530, C.yellow, 3)}
    ${line(608, 462, 608, 530, C.green, 3)}
    ${line(830, 462, 830, 530, C.blue, 3)}
    ${line(1052, 462, 1052, 530, C.orange, 3)}
    ${rect(72, 530, 1072, 520, C.ink, 38)}
    ${text(120, 600, 'WORLD MONITOR', 29, C.yellow, 500)}
    <circle cx="465" cy="790" r="170" fill="none" stroke="${C.blue}" stroke-width="4" opacity="0.9"/>
    <ellipse cx="465" cy="790" rx="78" ry="170" fill="none" stroke="${C.blue}" stroke-width="3" opacity="0.65"/>
    <ellipse cx="465" cy="790" rx="170" ry="72" fill="none" stroke="${C.blue}" stroke-width="3" opacity="0.65"/>
    ${line(295, 790, 635, 790, C.blue, 3)}
    <circle cx="410" cy="708" r="14" fill="${C.orange}"/><circle cx="522" cy="835" r="12" fill="${C.yellow}"/><circle cx="378" cy="874" r="10" fill="${C.green}"/>
    ${rect(700, 650, 380, 78, '#243543', 18)}${text(730, 701, '● 地图与事件时间线', 28, C.paper2, 500)}
    ${rect(700, 750, 380, 78, '#243543', 18)}${text(730, 801, '● 多来源交叉查看', 28, C.paper2, 500)}
    ${rect(700, 850, 380, 78, '#243543', 18)}${text(730, 901, '● AI 辅助摘要', 28, C.paper2, 500)}
    ${text(621, 1002, '发现线索 → 建立上下文 → 回到原始来源核实', 30, C.paper2, 500, 'middle')}
    ${rect(72, 1105, 520, 186, C.greenSoft, 28)}
    ${text(112, 1168, '你得到什么', 27, C.green, 500)}
    ${lines(112, 1222, ['2D / 3D 地图 · 情报简报', 'Web · API · MCP · SDK'], 30, 1.45, C.ink, 500)}
    ${rect(624, 1105, 520, 186, C.orangeSoft, 28)}
    ${text(664, 1168, '它不是什么', 27, C.orange, 500)}
    ${lines(664, 1222, ['不是预测未来的机器', '也不是权威事实库'], 30, 1.45, C.ink, 500)}
    ${rect(72, 1350, 1072, 104, C.paper2, 24)}
    ${text(621, 1416, '本质：一个帮助人看见全球信号关系的开源态势感知台。', 31, C.ink, 500, 'middle')}
    ${footer(2)}
  `);
}

function whyItCaughtFire() {
  const reason = (x, y, number, titleValue, body, fill, accent) => `
    ${rect(x, y, 520, 220, fill, 28)}
    ${pill(x + 34, y + 30, `0${number}`, accent, C.paper2, 78)}
    ${text(x + 138, y + 72, titleValue, 35, C.ink, 500)}
    ${lines(x + 38, y + 140, body, 27, 1.35, C.muted)}
  `;
  return shell(`
    ${header('认识工具 2 / 4', '它让人 3 秒就懂', '复杂的全球信息，被包装成一张人人看得懂的地图')}
    ${reason(72, 350, 1, '一句话有画面', ['“开源全球战情室”', '不用解释技术名词。'], C.orangeSoft, C.orange)}
    ${reason(650, 350, 2, '截图就能传播', ['暗色地图、事件点、航线，', '视觉冲击很强。'], C.blueSoft, C.blue)}
    ${reason(72, 600, 3, '解决信息碎片', ['原本散落在许多标签页，', '现在先在一处发现关联。'], C.yellowSoft, C.yellow)}
    ${reason(650, 600, 4, '同时服务两群人', ['普通人点开即看；开发者', '能研究源码与接口。'], C.greenSoft, C.green)}
    ${rect(72, 900, 1072, 310, C.ink, 34)}
    ${text(116, 975, '为什么值得关注', 29, C.yellow, 500)}
    ${lines(116, 1042, ['它展示了聊天框之外的 AI 产品形态：', 'AI 进入信息聚合、摘要与跨信号关联。'], 38, 1.42, C.paper2, 500)}
    ${line(116, 1147, 1100, 1147, '#3A4B58', 2)}
    ${text(116, 1192, '既是一款可直接体验的产品，也是一套可以拆开学习的工程系统。', 27, C.paper2)}
    ${rect(72, 1262, 1072, 180, C.paper2, 26)}
    ${text(116, 1325, '传播事实', 27, C.orange, 500)}
    ${lines(116, 1380, ['02/26 社区扩散 → 03/02 单日 +3,770 → 07 月第二波峰', '传播路径可核实；“为什么容易火”仍是基于证据的编辑判断。'], 28, 1.45, C.ink)}
    ${footer(3)}
  `);
}

function howToUse() {
  const step = (x, y, number, titleValue, body, fill, accent) => `
    ${rect(x, y, 520, 235, fill, 28)}
    ${pill(x + 34, y + 30, `0${number}`, accent, C.paper2, 78)}
    ${text(x + 138, y + 72, titleValue, 35, C.ink, 500)}
    ${lines(x + 38, y + 142, body, 28, 1.4, C.muted)}
  `;
  return shell(`
    ${header('认识工具 3 / 4', '普通人怎么用？', '例：快速了解“某个地区发生了什么”')}
    ${step(72, 355, 1, '先定位', ['搜索地区，或从地图上的', '异常事件进入。'], C.orangeSoft, C.orange)}
    ${step(650, 355, 2, '再叠图层', ['按问题打开灾害、冲突、', '航班、能源或基建图层。'], C.blueSoft, C.blue)}
    ${step(72, 625, 3, '交叉查看', ['对照事件时间、附近信号', '和多家新闻来源。'], C.yellowSoft, C.yellow)}
    ${step(650, 625, 4, '让 AI 压缩', ['用简报快速抓重点，再回到', '原始来源核实关键事实。'], C.greenSoft, C.green)}
    ${rect(72, 930, 1072, 285, C.ink, 34)}
    ${text(116, 1005, '一个具体例子', 29, C.yellow, 500)}
    ${lines(116, 1072, ['“某地突发灾害，会不会影响我的出行？”', '灾害图层 → 航班与基础设施 → 最新来源 → AI 简报'], 36, 1.5, C.paper2, 500)}
    ${rect(72, 1268, 1072, 174, C.paper2, 26)}
    ${text(116, 1332, '正确预期', 27, C.green, 500)}
    ${lines(116, 1385, ['它帮你更快发现线索、建立上下文；不会替你完成事实核验。'], 29, 1.4, C.ink, 500)}
    ${footer(4)}
  `);
}

function developerPaths() {
  const pathCard = (x, number, titleValue, body, fill, accent) => `
    ${rect(x, 380, 330, 410, fill, 28)}
    ${pill(x + 30, 412, `路径 ${number}`, accent, C.paper2, 118)}
    ${text(x + 30, 520, titleValue, 38, C.ink, 500)}
    ${lines(x + 30, 592, body, 27, 1.55, C.muted)}
  `;
  return shell(`
    ${header('认识工具 4 / 4', '开发者怎么用？', '从体验到接入，先确认价值再承担部署成本')}
    ${pathCard(72, 1, '直接体验', ['先用公开 Web', '理解地图、筛选', '与简报工作流。'], C.orangeSoft, C.orange)}
    ${pathCard(456, 2, '本地读源码', ['npm ci 与开发', '环境可以跑通；', '重点读数据管线。'], C.yellowSoft, C.yellow)}
    ${pathCard(840, 3, '程序化接入', ['REST API · MCP', 'CLI · Python', 'Ruby · Go SDK'], C.blueSoft, C.blue)}
    ${rect(72, 850, 1072, 300, C.paper2, 30)}
    ${text(116, 920, '最值得学的 5 道工程题', 30, C.green, 500)}
    ${pill(116, 975, '异构数据归一化', C.greenSoft, C.green, 260)}
    ${pill(400, 975, '缓存与降级', C.blueSoft, C.blue, 210)}
    ${pill(634, 975, '地图可视化', C.orangeSoft, C.orange, 210)}
    ${pill(868, 975, 'AI 情报简报', C.yellowSoft, C.ink, 230)}
    ${pill(116, 1055, 'Web / API / MCP 如何共用一套能力', C.blueSoft, C.blue, 530)}
    ${pill(670, 1055, '来源可信度与时效治理', C.orangeSoft, C.orange, 428)}
    ${rect(72, 1210, 1072, 232, C.ink, 30)}
    ${text(116, 1280, '建议学习路线', 28, C.yellow, 500)}
    ${lines(116, 1340, ['Web 体验 → 读架构 → 本地最小运行 → 再试 API / MCP', '完整自托管还需要 Redis、密钥与外部数据源。'], 31, 1.45, C.paper2, 500)}
    ${footer(5)}
  `);
}

async function survivalReview() {
  const raw = await fs.readFile(CSV, 'utf8');
  const daily = raw.trim().split(/\r?\n/).slice(1).map((row) => {
    const [date, value] = row.split(',');
    return { date, value: Number(value) };
  }).filter((d) => d.date <= '2026-09-06');
  const weeks = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    weeks.push({ date: chunk[0].date, value: chunk.reduce((sum, d) => sum + d.value, 0) });
  }
  const chart = { x: 100, y: 415, w: 1042, h: 535 };
  const max = Math.max(...weeks.map((d) => d.value));
  const px = (i) => chart.x + (i / (weeks.length - 1)) * chart.w;
  const py = (v) => chart.y + chart.h - (v / max) * chart.h;
  const dPath = weeks.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(d.value).toFixed(1)}`).join(' ');
  const area = `${dPath} L ${px(weeks.length - 1).toFixed(1)} ${chart.y + chart.h} L ${chart.x} ${chart.y + chart.h} Z`;
  const march = weeks.findIndex((d) => d.date === '2026-03-01');
  const july = weeks.findIndex((d) => d.date === '2026-07-19');
  const yTicks = [0, 5000, 10000, 15000];
  const grids = yTicks.map((v) => `${line(chart.x, py(v), chart.x + chart.w, py(v), C.line, 2)}${text(chart.x - 18, py(v) + 9, v === 0 ? '0' : `${v / 1000}k`, 24, C.muted, 400, 'end')}`).join('\n');
  return shell(`
    ${header('评价 1 / 4', '热度降了，但没有消失', '188 天后，同时看主峰、低谷与第二波')}
    ${grids}
    <path d="${area}" fill="${C.orangeSoft}" opacity="0.85"/>
    <path d="${dPath}" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${px(march)}" cy="${py(weeks[march].value)}" r="13" fill="${C.orange}"/>
    <circle cx="${px(july)}" cy="${py(weeks[july].value)}" r="13" fill="${C.blue}"/>
    ${line(px(march), py(weeks[march].value) + 20, px(march), 985, C.orange, 2, '7 8')}
    ${line(px(july), py(weeks[july].value) + 20, px(july), 985, C.blue, 2, '7 8')}
    ${text(px(march), py(weeks[march].value) - 36, '3 月主峰 · 14,678 / 周', 28, C.orange, 500, 'middle')}
    ${text(px(july), py(weeks[july].value) - 36, '7 月第二波 · 12,274 / 周', 28, C.blue, 500, 'middle')}
    ${text(chart.x, 995, '1 月', 26, C.muted)}
    ${text(chart.x + chart.w * .26, 995, '3 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w * .52, 995, '5 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w * .78, 995, '7 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w, 995, '9 月', 26, C.muted, 400, 'end')}
    ${rect(100, 1065, 322, 220, C.paper2, 28)}
    ${text(135, 1130, '85,679', 52, C.green, 500)}
    ${lines(135, 1182, ['复查日 stars', '峰值日后约 +61,672'], 27, 1.45, C.muted)}
    ${rect(460, 1065, 322, 220, C.yellowSoft, 28)}
    ${text(495, 1130, '8.7%', 52, C.orange, 500)}
    ${lines(495, 1182, ['第 61–90 天增速', '相对爆火后首月'], 27, 1.45, C.muted)}
    ${rect(820, 1065, 322, 220, C.blueSoft, 28)}
    ${text(855, 1130, '+6,223', 52, C.blue, 500)}
    ${lines(855, 1182, ['复查前最近 30 天', '第二波后仍有长尾'], 27, 1.45, C.muted)}
    ${rect(100, 1340, 1042, 102, C.ink, 26)}
    ${text(621, 1405, '评价：经历明显降温，但没有变成“一次性流量项目”。', 33, C.paper2, 500, 'middle')}
    ${footer(6)}
  `);
}

function maintenance() {
  const max = 2465;
  const metricBar = (y, label, value, color) => `
    ${text(106, y, label, 30, C.ink, 500)}
    ${text(1136, y, value.toLocaleString('en-US'), 40, color, 500, 'end')}
    ${rect(106, y + 30, 1030, 58, C.line, 29)}
    ${rect(106, y + 30, 1030 * value / max, 58, color, 29)}
  `;
  return shell(`
    ${header('评价 2 / 4', '开发仍强，交付仍有缺口', '持续更新值得肯定，但不能只看 commit 数')}
    ${metricBar(445, '爆火后的第一个 90 天 · commits', 2423, C.orange)}
    ${metricBar(650, '复查前最近 90 天 · commits', 2465, C.green)}
    ${rect(106, 858, 492, 260, C.paper2, 28)}
    ${text(148, 920, '2,062', 64, C.blue, 500)}
    ${text(148, 974, '最近 90 天合并 PR', 28, C.muted)}
    ${lines(148, 1041, ['吞吐仍高，', '不是“无人维护”。'], 30, 1.35, C.ink, 500)}
    ${rect(644, 858, 492, 260, C.orangeSoft, 28)}
    ${text(686, 920, '89.7%', 64, C.orange, 500)}
    ${text(686, 974, '累计贡献中的 owner 占比', 28, C.muted)}
    ${lines(686, 1041, ['维护很强，', '单点风险也很高。'], 30, 1.35, C.ink, 500)}
    ${rect(106, 1210, 1030, 228, C.yellowSoft, 28)}
    ${text(148, 1275, '交付缺口', 28, C.orange, 500)}
    ${lines(148, 1330, ['源码 / tag 已到 v2.10.0，公开桌面 Release 仍是 v2.5.23。', '开发活跃，不等于用户拿到的稳定版本同步。'], 29, 1.45, C.ink)}
    ${text(106, 1490, '＊仓库含自动化与 AI 辅助提交，commit 数不能直接等同真人贡献者数。', 24, C.muted)}
    ${footer(7)}
  `);
}

function risks() {
  const item = (y, n, titleValue, body, fill, accent) => `
    ${rect(88, y, 1066, 205, fill, 28)}
    ${pill(122, y + 32, `0${n}`, accent, C.paper2, 82)}
    ${text(235, y + 73, titleValue, 38, C.ink, 500)}
    ${lines(235, y + 126, body, 27, 1.35, C.muted)}
  `;
  return shell(`
    ${header('评价 3 / 4', '使用前先看这 4 个风险', '它值得学，不代表每个场景都能放心依赖')}
    ${item(345, 1, '聚合信息不等于事实', ['来源可能延迟，AI 摘要也可能出错；关键判断', '必须回到原始来源。'], C.orangeSoft, C.orange)}
    ${item(565, 2, '发布渠道没有同步', ['源码 / tag 到 v2.10.0，桌面 Release 仍在', 'v2.5.23；抽查的构建也失败。'], C.yellowSoft, C.yellow)}
    ${item(785, 3, '维护集中度很高', ['owner 约占累计贡献 89.7%；外部贡献增加，', '但关键单点风险仍然存在。'], C.blueSoft, C.blue)}
    ${item(1005, 4, '采用证据与部署成本', ['只核实到 1 个独立 API 接入；完整自托管还要', 'Redis、密钥和多个外部数据源。'], C.greenSoft, C.green)}
    ${rect(88, 1260, 1066, 178, C.ink, 28)}
    ${text(621, 1330, '所以不是“不推荐”，而是要分场景推荐。', 34, C.paper2, 500, 'middle')}
    ${text(621, 1385, 'A 级需要交付、社区与采用证据同时够稳。', 29, C.yellow, 500, 'middle')}
    ${footer(8)}
  `);
}

function verdict() {
  const scores = [
    ['维护', 18, C.green],
    ['采用', 13, C.orange],
    ['社区韧性', 12, C.yellow],
    ['工程成熟', 14, C.blue],
    ['可迁移性', 14, C.blue],
  ];
  const scoreRows = scores.map(([label, value, color], i) => {
    const y = 510 + i * 105;
    return `${text(106, y, label, 29, C.ink, 500)}${rect(310, y - 31, 660, 36, C.line, 18)}${rect(310, y - 31, 660 * value / 20, 36, color, 18)}${text(1136, y, `${value} / 20`, 31, color, 500, 'end')}`;
  }).join('\n');
  return shell(`
    ${header('评价 4 / 4', '推荐指数：学习 A，采用 B', '综合 B · 71 / 100 · Confidence high')}
    ${scoreRows}
    ${rect(88, 1055, 1066, 174, C.greenSoft, 28)}
    ${text(130, 1118, '推荐', 30, C.green, 500)}
    ${lines(130, 1172, ['读代码学架构 · 体验 Web · OSINT 辅助 · 非关键原型'], 31, 1.3, C.ink, 500)}
    ${rect(88, 1252, 1066, 174, C.orangeSoft, 28)}
    ${text(130, 1315, '不建议', 30, C.orange, 500)}
    ${lines(130, 1369, ['作为唯一事实源 · 高风险决策 · 直接成为关键生产依赖'], 31, 1.3, C.ink, 500)}
    ${text(621, 1492, '下次复查：2026-12-05', 30, C.muted, 500, 'middle')}
    ${footer(9)}
  `);
}

async function render() {
  await fs.mkdir(OUT, { recursive: true });
  const cards = [
    ['01-cover', cover(), 'summary'],
    ['02-what-it-is', whatItIs(), 'product_and_usage'],
    ['03-why-it-caught-fire', whyItCaughtFire(), 'product_and_usage'],
    ['04-how-to-use', howToUse(), 'product_and_usage'],
    ['05-developer-paths', developerPaths(), 'product_and_usage'],
    ['06-survival-review', await survivalReview(), 'evaluation'],
    ['07-maintenance', maintenance(), 'evaluation'],
    ['08-risks', risks(), 'evaluation'],
    ['09-verdict', verdict(), 'evaluation'],
  ];

  const pngs = [];
  for (const [name, svg] of cards) {
    const svgPath = path.join(OUT, `${name}.svg`);
    const pngPath = path.join(OUT, `${name}.png`);
    const normalizedSvg = `${svg.split('\n').map((row) => row.trimEnd()).join('\n').trim()}\n`;
    await fs.writeFile(svgPath, normalizedSvg, 'utf8');
    await sharp(Buffer.from(normalizedSvg)).png({ compressionLevel: 9 }).toFile(pngPath);
    pngs.push(pngPath);
  }

  const thumbW = 310;
  const thumbH = 415;
  const gap = 24;
  const sheetW = gap * 4 + thumbW * 3;
  const sheetH = gap * 4 + thumbH * 3;
  const composites = [];
  for (let i = 0; i < pngs.length; i += 1) {
    const input = await sharp(pngs[i]).resize(thumbW, thumbH).png().toBuffer();
    composites.push({
      input,
      left: gap + (i % 3) * (thumbW + gap),
      top: gap + Math.floor(i / 3) * (thumbH + gap),
    });
  }
  await sharp({
    create: { width: sheetW, height: sheetH, channels: 4, background: C.paper },
  }).composite(composites).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'preview-contact-sheet.png'));

  const manifest = {
    generated_at: new Date().toISOString(),
    canvas: { width: W, height: H, ratio: '3:4' },
    source_data: path.relative(ROOT, CSV),
    story_structure: {
      summary: [1],
      product_and_usage: [2, 3, 4, 5],
      evaluation: [6, 7, 8, 9],
    },
    cards: cards.map(([name, , section], index) => ({
      order: index + 1,
      section,
      svg: `${name}.svg`,
      png: `${name}.png`,
    })),
  };
  await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

render().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
