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
    ${header('先说人话', '它到底是干什么的？', '把散落的全球信号，放进一张可交互地图')}
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
    ${header('为什么会火', '它让人 3 秒就懂', '传播原因是推断；传播时间线可以核实')}
    ${reason(72, 350, 1, '熟悉的想象', ['“开源全球战情室”', '一句话就有画面。'], C.orangeSoft, C.orange)}
    ${reason(650, 350, 2, '截图就能传播', ['暗色地图、事件点、航线，', '视觉冲击远胜抽象框架。'], C.blueSoft, C.blue)}
    ${reason(72, 600, 3, '解决真实痛点', ['把散落在许多标签页的', '新闻与数据汇到一处。'], C.yellowSoft, C.yellow)}
    ${reason(650, 600, 4, '同时吸引两群人', ['普通人可直接体验；开发者', '能看源码、API 与 MCP。'], C.greenSoft, C.green)}
    ${rect(72, 900, 1072, 355, C.ink, 34)}
    ${text(116, 975, '能验证的传播路径', 29, C.yellow, 500)}
    ${text(126, 1065, '02/26', 34, C.orange, 500)}
    ${text(126, 1110, '社区开始扩散', 26, C.paper2)}
    ${line(300, 1055, 430, 1055, C.muted, 3)}
    ${text(480, 1065, '03/01', 34, C.yellow, 500, 'middle')}
    ${text(480, 1110, '已约 18,964 ★', 26, C.paper2, 400, 'middle')}
    ${line(565, 1055, 700, 1055, C.muted, 3)}
    ${text(790, 1065, '03/02', 34, C.orange, 500, 'middle')}
    ${text(790, 1110, '单日 +3,770', 26, C.paper2, 400, 'middle')}
    ${line(875, 1055, 975, 1055, C.muted, 3)}
    ${text(1095, 1065, '07 月', 34, C.blue, 500, 'end')}
    ${text(1095, 1110, '第二波峰', 26, C.paper2, 400, 'end')}
    ${line(116, 1160, 1100, 1160, '#3A4B58', 2)}
    ${text(116, 1212, '能解释“为什么容易传播”，但不能确认唯一的第一条爆帖。', 28, C.paper2, 500)}
    ${rect(72, 1310, 1072, 132, C.paper2, 26)}
    ${text(621, 1390, '它火的不是一个新模型，而是一种一眼能懂的 AI 产品形态。', 31, C.ink, 500, 'middle')}
    ${footer(3)}
  `);
}

function thenNow() {
  const col = (x, y, label, value, note, accent) => `
    ${text(x, y, label, 28, C.muted, 500)}
    ${text(x, y + 72, value, 52, accent, 500)}
    ${text(x, y + 121, note, 25, C.muted, 400)}
  `;
  return shell(`
    ${header('当时 vs 现在', '188 天，发生了什么？', '同一个项目，同一组可复核口径')}
    ${text(108, 390, '爆火日 · 03/02', 34, C.orange, 500)}
    ${text(1134, 390, '复查日 · 09/06', 34, C.green, 500, 'end')}
    ${line(621, 345, 621, 1370, C.line, 3)}
    ${col(108, 490, '累计 STAR EVENTS', '约 24,007', '单日峰值 3,770', C.orange)}
    ${col(675, 490, '累计 STAR EVENTS', '85,679', '之后又增加约 61,672', C.green)}
    ${line(108, 680, 565, 680)}${line(675, 680, 1134, 680)}
    ${col(108, 760, '仓库 COMMITS', '1,597', '从创建到爆火日', C.orange)}
    ${col(675, 760, '仓库 COMMITS', '6,686', '仍在持续开发', C.green)}
    ${line(108, 950, 565, 950)}${line(675, 950, 1134, 950)}
    ${col(108, 1030, '公开 RELEASE', 'v2.5.23', '爆火当晚发布', C.orange)}
    ${col(675, 1030, '源码 / TAG', 'v2.10.0', '但 Release 页仍是 v2.5.23', C.blue)}
    ${rect(108, 1245, 1026, 168, C.yellowSoft, 28)}
    ${text(150, 1310, '关键区别', 28, C.ink, 500)}
    ${lines(150, 1364, ['开发很活跃 ≠ 用户拿到的稳定版本同步。'], 33, 1.3, C.ink, 500)}
    ${text(72, 1497, '＊历史累计 stars 使用 star events 近似，不扣除后来取消的 star。', 25, C.muted)}
    ${footer(4)}
  `);
}

async function starTimeline() {
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
  const chart = { x: 100, y: 445, w: 1042, h: 650 };
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
    ${header('STAR 时间线', '热度降了，但没有消失', '每周新增 star events · 线性刻度')}
    ${grids}
    <path d="${area}" fill="${C.orangeSoft}" opacity="0.85"/>
    <path d="${dPath}" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${px(march)}" cy="${py(weeks[march].value)}" r="13" fill="${C.orange}"/>
    <circle cx="${px(july)}" cy="${py(weeks[july].value)}" r="13" fill="${C.blue}"/>
    ${line(px(march), py(weeks[march].value) + 20, px(march), 1180, C.orange, 2, '7 8')}
    ${line(px(july), py(weeks[july].value) + 20, px(july), 1180, C.blue, 2, '7 8')}
    ${text(px(march), py(weeks[march].value) - 36, '3 月主峰 · 14,678 / 周', 28, C.orange, 500, 'middle')}
    ${text(px(july), py(weeks[july].value) - 36, '7 月第二波 · 12,274 / 周', 28, C.blue, 500, 'middle')}
    ${text(chart.x, 1148, '1 月', 26, C.muted)}
    ${text(chart.x + chart.w * .26, 1148, '3 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w * .52, 1148, '5 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w * .78, 1148, '7 月', 26, C.muted, 400, 'middle')}
    ${text(chart.x + chart.w, 1148, '9 月', 26, C.muted, 400, 'end')}
    ${rect(100, 1232, 1042, 210, C.paper2, 28)}
    ${text(145, 1304, '读图', 28, C.muted, 500)}
    ${lines(145, 1360, ['一次性爆火会只剩长尾；World Monitor 在 7 月', '出现第二个大波峰，因此不能简单判定“热度死亡”。'], 33, 1.35, C.ink, 500)}
    ${footer(5)}
  `);
}

function hypeRetention() {
  const bar = (y, label, value, max, color, note = '') => `
    ${text(104, y, label, 30, C.ink, 500)}
    ${text(1138, y, value.toLocaleString('en-US'), 34, color, 500, 'end')}
    ${rect(104, y + 30, 1034, 54, C.line, 27)}
    ${rect(104, y + 30, Math.max(30, 1034 * value / max), 54, color, 27)}
    ${note ? text(104, y + 126, note, 27, C.muted) : ''}
  `;
  return shell(`
    ${header('热度半衰', '8.7%：降温，不是死亡', '按 30 天窗口观察关注速度')}
    ${bar(440, '爆火后第 1–30 天', 24706, 24706, C.orange)}
    ${bar(670, '爆火后第 61–90 天', 2157, 24706, C.yellow, '只剩首月的 8.7%')}
    ${bar(930, '复查前最近 30 天', 6223, 24706, C.blue, '第二波传播后，速度重新高于 61–90 天窗口')}
    ${rect(104, 1248, 1034, 180, C.ink, 30)}
    ${text(150, 1318, '半衰期真正想测的是：', 28, C.yellow, 500)}
    ${lines(150, 1376, ['关注下降后，还有没有人继续维护、接入和使用？'], 34, 1.3, C.paper2, 500)}
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
    ${header('维护强度', '项目没有停更', '但“活动量”仍要拆开看')}
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
    ${rect(106, 1215, 1030, 190, C.yellowSoft, 28)}
    ${text(148, 1283, '注意', 28, C.ink, 500)}
    ${lines(148, 1340, ['仓库含自动化与 AI 辅助提交，commit 数不能直接', '翻译成“这么多真人贡献者”。'], 31, 1.35, C.ink)}
    ${footer(7)}
  `);
}

function whyNotA() {
  const item = (y, n, titleValue, body, fill, accent) => `
    ${rect(88, y, 1066, 205, fill, 28)}
    ${pill(122, y + 32, `0${n}`, accent, C.paper2, 82)}
    ${text(235, y + 73, titleValue, 38, C.ink, 500)}
    ${lines(235, y + 126, body, 27, 1.35, C.muted)}
  `;
  return shell(`
    ${header('为什么不是 A', '活跃，不等于稳稳可用', 'A 级必须同时经得住交付、社区与采用验证')}
    ${item(365, 1, '发布渠道分裂', ['源码 / tag 到 v2.10.0，公开桌面 Release', '仍停在 v2.5.23；抽查构建失败。'], C.orangeSoft, C.orange)}
    ${item(592, 2, '维护过度集中', ['owner 约占累计贡献 89.7%，外部贡献者', '增加了，但关键单点风险仍在。'], C.yellowSoft, C.yellow)}
    ${item(819, 3, '真实采用仍薄', ['核实到 1 个独立 API 接入；这证明有人用，', '还不能证明已经形成规模生态。'], C.blueSoft, C.blue)}
    ${item(1046, 4, '完整部署并不轻', ['基础开发启动通过；完整自托管还涉及 Redis、', '多组 secret、数据源与依赖风险管理。'], C.greenSoft, C.green)}
    ${rect(88, 1310, 1066, 120, C.ink, 28)}
    ${text(621, 1384, 'A 不是“我喜欢”，而是“证据够稳”。', 36, C.paper2, 500, 'middle')}
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
    ${header('最终评级', '综合 B · 71 / 100', 'Learning A · Adoption B · Confidence high')}
    ${scoreRows}
    ${rect(88, 1055, 1066, 174, C.greenSoft, 28)}
    ${text(130, 1118, '适合', 30, C.green, 500)}
    ${lines(130, 1172, ['学实时数据架构 · 体验 Web / 当前源码 · 非关键原型'], 31, 1.3, C.ink, 500)}
    ${rect(88, 1252, 1066, 174, C.orangeSoft, 28)}
    ${text(130, 1315, '暂不适合', 30, C.orange, 500)}
    ${lines(130, 1369, ['依赖旧桌面版 · 直接做关键生产依赖 · 当作唯一事实源'], 31, 1.3, C.ink, 500)}
    ${text(621, 1492, '下次复查：2026-12-05', 30, C.muted, 500, 'middle')}
    ${footer(9)}
  `);
}

async function render() {
  await fs.mkdir(OUT, { recursive: true });
  const cards = [
    ['01-cover', cover()],
    ['02-what-it-is', whatItIs()],
    ['03-why-it-caught-fire', whyItCaughtFire()],
    ['04-then-now', thenNow()],
    ['05-star-timeline', await starTimeline()],
    ['06-hype-retention', hypeRetention()],
    ['07-maintenance', maintenance()],
    ['08-why-not-a', whyNotA()],
    ['09-verdict', verdict()],
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
    cards: cards.map(([name], index) => ({ order: index + 1, svg: `${name}.svg`, png: `${name}.png` })),
  };
  await fs.writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

render().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
