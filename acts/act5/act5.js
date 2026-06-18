// Act 5 价值评估矩阵 — D3.js 实现

function renderAct5() {
    const m = globalProcessedMetrics;
    const totalCount = m.totalCount || 1;

    // ── 五级资产分布 ──
    const highCount = m.valueScoreDistribution.high || 0;
    const midCount  = m.valueScoreDistribution.mid  || 0;
    const lowCount  = m.valueScoreDistribution.low  || 0;

    const sCount = Math.round(highCount * 0.2);
    const aCount = highCount - sCount;
    const bCount = Math.round(midCount * 0.4);
    const cCount = midCount - bCount;
    const dCount = lowCount;

    const TIERS = [
        { id:'S', label:'S 级', range:'85–100', count: sCount, color:'#d97706',
          desc:'核心战略资产。已授权、被引频繁、跨国布局完整，建议重点维持并主动运营（许可/诉讼）。' },
        { id:'A', label:'A 级', range:'70–84',  count: aCount, color:'#f59e0b',
          desc:'高质量资产。授权状态良好，具备一定引用积累，适合纳入许可谈判池或作为技术壁垒。' },
        { id:'B', label:'B 级', range:'45–69',  count: bCount, color:'#059669',
          desc:'中等价值资产。法律状态稳定，但引用与同族数量有限，可定期复评并择机运营。' },
        { id:'C', label:'C 级', range:'20–44',  count: cCount, color:'#0284c7',
          desc:'基础储备资产。多处于审查或早期授权阶段，作为技术积累保留，注意维费成本控制。' },
        { id:'D', label:'D 级', range:'0–19',   count: dCount, color:'#94a3b8',
          desc:'低效资产。失效、驳回或技术价值衰减，建议评估是否继续缴纳年费，适时放弃。' },
    ];

    renderTierFunnel(TIERS, totalCount);

    // ── 风险时间轴 ──
    const expired  = m.riskDistribution.expired  || 0;
    const critical = m.riskDistribution.critical || 0;
    const normal   = m.riskDistribution.normal   || 0;

    const critNear = Math.round(critical * 0.4);
    const critFar  = critical - critNear;

    const RISK_ROWS = [
        { label:'已到期 / 失效',  count: expired,   color:'#e11d48' },
        { label:'1 年内到期',      count: critNear,  color:'#f43f5e' },
        { label:'1–3 年到期',      count: critFar,   color:'#fb923c' },
        { label:'3–5 年稳定',      count: Math.round(normal * 0.25), color:'#a3a3a3' },
        { label:'5 年以上安全',    count: normal - Math.round(normal * 0.25), color:'#059669' },
    ];

    renderRiskTimeline(RISK_ROWS, totalCount);

    // 初始化评分计算器
    updateAct5Calc();
}

// ========== 五级资产漏斗（D3 SVG）==========
function renderTierFunnel(TIERS, totalCount) {
    const el = document.getElementById('tierFunnel');
    el.innerHTML = '';

    const W = el.clientWidth || 360;
    const H = 160;
    const topPad = 20;   // 数值标签空间
    const bottomPad = 28; // 等级标签空间
    const barAreaH = H - topPad - bottomPad; // 柱子可用高度
    const barGap = 6;
    const barW = (W - barGap * (TIERS.length - 1)) / TIERS.length;
    let selectedIdx = -1;

    // 平方根压缩，让大小悬殊的柱子都能看得见
    const maxCount = Math.max(...TIERS.map(t => t.count), 1);
    const sqrtScale = d => Math.sqrt(d.count / maxCount) * barAreaH;

    const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%').style('height', '100%');

    const groups = svg.selectAll('.tier-g').data(TIERS).join('g')
        .attr('class', 'tier-g')
        .attr('transform', (d, i) => `translate(${i * (barW + barGap)}, 0)`)
        .style('cursor', 'pointer');

    // 柱子（从底部往上长）
    groups.append('rect')
        .attr('class', 'tier-bar')
        .attr('x', 0).attr('width', barW).attr('rx', 3)
        .attr('fill', d => d.color)
        .attr('y', topPad + barAreaH).attr('height', 0)
        .transition().duration(500).ease(d3.easeCubicOut)
        .attr('y', d => topPad + barAreaH - Math.max(6, sqrtScale(d)))
        .attr('height', d => Math.max(6, sqrtScale(d)));

    // 数量标签（柱子上方）
    groups.append('text')
        .attr('x', barW / 2)
        .attr('y', d => topPad + barAreaH - Math.max(6, sqrtScale(d)) - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', '#1e293b')
        .text(d => d.count.toLocaleString());

    // 等级标签（柱子下方，用深色保证可读性）
    groups.append('text')
        .attr('x', barW / 2)
        .attr('y', topPad + barAreaH + 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px').attr('font-weight', '600')
        .attr('fill', d => d.color)
        .text(d => d.label);

    // 点击交互
    groups.on('click', function (event, d) {
        const idx = TIERS.indexOf(d);
        if (selectedIdx === idx) {
            selectedIdx = -1;
            groups.attr('opacity', 1);
        } else {
            selectedIdx = idx;
            groups.attr('opacity', (_, i) => i === idx ? 1 : 0.3);
        }
        const pct = totalCount > 0 ? (d.count / totalCount * 100).toFixed(1) : '0.0';
        document.getElementById('tierDetailBox').innerHTML =
            `<span style="color:${d.color}; font-weight:600; margin-right:8px;">${d.label}（${d.range}分）</span>
             <span style="color:var(--text-secondary);">共 ${d.count} 件 · 占比 ${pct}%</span><br>
             <span style="color:var(--text-primary);">${d.desc}</span>`;
    });
}

// ========== 风险时间轴（D3 SVG）==========
function renderRiskTimeline(RISK_ROWS, totalCount) {
    const el = document.getElementById('riskTimeline');
    el.innerHTML = '';

    const W = el.clientWidth || 800;
    const rowH = 24;
    const rowGap = 8;
    const H = RISK_ROWS.length * (rowH + rowGap);
    const labelW = 95;
    const countW = 50;
    const pctW = 42;
    const barAreaW = W - labelW - countW - pctW - 20;
    const maxRisk = Math.max(...RISK_ROWS.map(r => r.count), 1);

    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);

    const rows = svg.selectAll('.risk-g').data(RISK_ROWS).join('g')
        .attr('class', 'risk-g')
        .attr('transform', (d, i) => `translate(0, ${i * (rowH + rowGap)})`);

    // 标签
    rows.append('text')
        .attr('x', labelW - 6).attr('y', rowH / 2 + 1)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', '12px').attr('fill', '#475569')
        .text(d => d.label);

    // 背景条
    rows.append('rect')
        .attr('x', labelW).attr('y', (rowH - 16) / 2)
        .attr('width', barAreaW).attr('height', 16)
        .attr('fill', '#e2e8f0').attr('rx', 3);

    // 填充条（带动画）
    rows.append('rect')
        .attr('x', labelW).attr('y', (rowH - 16) / 2)
        .attr('width', 0).attr('height', 16)
        .attr('fill', d => d.color).attr('rx', 3)
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(1, (d.count / maxRisk) * barAreaW));

    // 数量
    rows.append('text')
        .attr('x', labelW + barAreaW + 6).attr('y', rowH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px').attr('font-weight', '600')
        .attr('fill', d => d.color)
        .text(d => d.count);

    // 百分比
    rows.append('text')
        .attr('x', labelW + barAreaW + countW + 6).attr('y', rowH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px').attr('fill', '#475569')
        .text(d => {
            const p = totalCount > 0 ? (d.count / totalCount * 100).toFixed(1) : '0.0';
            return `${p}%`;
        });
}

// ── 评分计算器（保留 DOM 操作）──
const ACT5_TIER_DEFS = [
    { min:85, id:'S', label:'S 级', color:'#d97706', advice:'核心战略资产，建议重点维持并主动推进许可或诉讼运营。' },
    { min:70, id:'A', label:'A 级', color:'#f59e0b', advice:'高质量资产，具备较强技术壁垒，可纳入许可谈判池。' },
    { min:45, id:'B', label:'B 级', color:'#059669', advice:'中等价值资产，法律状态稳定，定期复评后择机运营。' },
    { min:20, id:'C', label:'C 级', color:'#0284c7', advice:'基础储备资产，注意维费成本，关注技术演进方向。' },
    { min:0,  id:'D', label:'D 级', color:'#94a3b8', advice:'低效资产，建议评估年费效益，适时放弃以节约成本。' },
];

function updateAct5Calc() {
    const s1 = +document.getElementById('s1').value;
    const s2 = +document.getElementById('s2').value;
    const s3 = +document.getElementById('s3').value;
    const s4 = +document.getElementById('s4').value;
    document.getElementById('s1val').innerText = s1;
    document.getElementById('s2val').innerText = s2;
    document.getElementById('s3val').innerText = s3;
    document.getElementById('s4val').innerText = s4;
    const total = s1 + s2 + s3 + s4;
    const tier = ACT5_TIER_DEFS.find(t => total >= t.min);
    const scoreEl = document.getElementById('totalScore');
    const badgeEl = document.getElementById('tierBadge');
    const adviceEl = document.getElementById('tierAdvice');
    if (scoreEl) scoreEl.innerText = total;
    if (scoreEl) scoreEl.style.color = tier.color;
    if (badgeEl) badgeEl.innerText = tier.label;
    if (badgeEl) {
        badgeEl.style.color = tier.color;
        badgeEl.style.borderColor = tier.color + '66';
        badgeEl.style.background = tier.color + '14';
    }
    if (adviceEl) adviceEl.innerText = tier.advice;
}
