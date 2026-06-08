// Act 5 价值评估矩阵

function renderAct5() {
    const m = globalProcessedMetrics;
    const totalCount = m.totalCount || 1;

    // ── 五级资产分布 ──
    // 从三级分布估算五级分布（数据管道只计算了 high/mid/low 三档）
    const highCount = m.valueScoreDistribution.high || 0;
    const midCount  = m.valueScoreDistribution.mid  || 0;
    const lowCount  = m.valueScoreDistribution.low  || 0;

    // 将 high 拆分为 S 和 A，将 mid 视为 B+C，low 视为 D
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

    // 漏斗渲染
    const funnelEl = document.getElementById('tierFunnel');
    if (funnelEl) {
        funnelEl.innerHTML = '';
        const maxCount = Math.max(...TIERS.map(t => t.count), 1);
        TIERS.forEach((tier) => {
            const wrap = document.createElement('div');
            wrap.className = 'tier-bar-wrap';
            const barH = Math.max(4, Math.round((tier.count / maxCount) * 100));
            wrap.innerHTML = `
                <div class="tier-bar-count">${tier.count}</div>
                <div class="tier-bar-inner" style="height:${barH}px; background:${tier.color};"></div>
                <div class="tier-bar-label" style="color:${tier.color};">${tier.label}</div>`;
            wrap.addEventListener('click', () => {
                document.querySelectorAll('.tier-bar-wrap').forEach(w => w.classList.add('dimmed'));
                wrap.classList.remove('dimmed');
                const pct = totalCount > 0 ? (tier.count / totalCount * 100).toFixed(1) : '0.0';
                document.getElementById('tierDetailBox').innerHTML =
                    `<span style="color:${tier.color}; font-weight:600; margin-right:8px;">${tier.label}（${tier.range}分）</span>
                     <span style="color:var(--text-secondary);">共 ${tier.count} 件 · 占比 ${pct}%</span><br>
                     <span style="color:var(--text-primary);">${tier.desc}</span>`;
            });
            funnelEl.appendChild(wrap);
        });
    }

    // ── 风险时间轴 ──
    const expired  = m.riskDistribution.expired  || 0;
    const critical = m.riskDistribution.critical || 0;
    const normal   = m.riskDistribution.normal   || 0;

    // 将 critical（3年内到期）拆分为两个子区间，让时间轴更细腻
    const critNear = Math.round(critical * 0.4);
    const critFar  = critical - critNear;

    const RISK_ROWS = [
        { label:'已到期 / 失效',  count: expired,   color:'#e11d48' },
        { label:'1 年内到期',      count: critNear,  color:'#f43f5e' },
        { label:'1–3 年到期',      count: critFar,   color:'#fb923c' },
        { label:'3–5 年稳定',      count: Math.round(normal * 0.25), color:'#a3a3a3' },
        { label:'5 年以上安全',    count: normal - Math.round(normal * 0.25), color:'#059669' },
    ];

    const tlEl = document.getElementById('riskTimeline');
    if (tlEl) {
        tlEl.innerHTML = '';
        const maxRisk = Math.max(...RISK_ROWS.map(r => r.count), 1);
        RISK_ROWS.forEach(row => {
            const barW = Math.max(1, Math.round((row.count / maxRisk) * 100));
            const pct = totalCount > 0 ? (row.count / totalCount * 100).toFixed(1) : '0.0';
            const div = document.createElement('div');
            div.className = 'risk-row';
            div.innerHTML = `
                <div class="rr-label">${row.label}</div>
                <div class="rr-bar-bg">
                    <div class="rr-bar-fill" style="width:${barW}%; background:${row.color};"></div>
                </div>
                <div class="rr-count" style="color:${row.color};">${row.count}</div>
                <div style="width:40px; font-size:10px; color:var(--text-secondary);">${pct}%</div>`;
            tlEl.appendChild(div);
        });
    }

    // 初始化评分计算器
    updateAct5Calc();
}

// ── 评分计算器 ──
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
