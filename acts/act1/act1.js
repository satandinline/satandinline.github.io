// Act 1 全景仪表盘 — D3.js 实现

function renderAct1() {
    // 强制 grid 子元素 min-width:0，防止 SVG 撑爆列宽
    document.querySelectorAll('.hub-spoke-grid .dashboard-card').forEach(el => {
        el.style.minWidth = '0';
        el.style.overflow = 'hidden';
    });

    // 更新核心指标
    document.getElementById('metricTotalCount').innerText = globalProcessedMetrics.totalCount.toLocaleString();
    document.getElementById('metricSubDateRange').innerText = `分析周期：${globalProcessedMetrics.minYear || 2000}-${globalProcessedMetrics.maxYear || 2026}年资产全景`;
    document.getElementById('metricHighValueCount').innerText = globalProcessedMetrics.highValueCount.toLocaleString();

    let pct = globalProcessedMetrics.totalCount > 0 ? ((globalProcessedMetrics.highValueCount / globalProcessedMetrics.totalCount) * 100).toFixed(1) : 0;
    document.getElementById('metricHighValueRatio').innerText = `高价值资产占比 ${pct}%`;

    renderLegalDonut();
    renderHighValueArc();
    renderTechPolarArea();
    renderCityBar();
}

// ========== 1. 法律状态环形图 ==========
function renderLegalDonut() {
    const container = document.getElementById('chartAct1GrantRate');
    container.innerHTML = '';

    const labels = Object.keys(globalProcessedMetrics.legalStatusStats);
    const values = Object.values(globalProcessedMetrics.legalStatusStats);
    const colors = ['#22c55e', '#3b82f6', '#f43f5e', '#f59e0b'];
    const hiddenSet = new Set();
    let hoveredIdx = -1;

    // 逻辑坐标系（SVG 用 viewBox 自适应容器）
    const W = 400;
    const H = 240;
    const legendW = 130;
    const chartW = W - legendW;
    const radius = Math.min(chartW, H) / 2 - 10;
    const innerRadius = radius * 0.55;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const chartG = svg.append('g')
        .attr('transform', `translate(${chartW / 2}, ${H / 2})`);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 6);
    const labelArc = d3.arc().innerRadius(radius * 0.75).outerRadius(radius * 0.75);
    const outerLabelArc = d3.arc().innerRadius(radius + 14).outerRadius(radius + 14);

    // Tooltip
    let tooltip = d3.select('#legalDonutTooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('id', 'legalDonutTooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(255,255,255,0.95)')
            .style('padding', '8px 12px')
            .style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
            .style('border', '1px solid rgba(0,0,0,0.08)')
            .style('font-size', '13px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('display', 'none');
    }

    function getDisplayValues() {
        const visTotal = values.reduce((s, v, i) => hiddenSet.has(i) ? s : s + v, 0);
        const minVisualPct = 0.03;
        return values.map((v, i) => {
            if (hiddenSet.has(i)) return 0;
            if (v === 0) return 0;
            return Math.max(v, visTotal * minVisualPct);
        });
    }

    function buildPieData() {
        const dv = getDisplayValues();
        const pie = d3.pie().value(d => d.value).sort(null).padAngle(0.02);
        return pie(dv.map((v, i) => ({ index: i, value: v, label: labels[i], rawValue: values[i] })));
    }

    function visTotal() {
        return values.reduce((s, v, i) => hiddenSet.has(i) ? s : s + v, 0);
    }

    function draw() {
        const pieData = buildPieData();

        // 扇区
        const paths = chartG.selectAll('.donut-slice').data(pieData, d => d.data.index);
        paths.enter().append('path').attr('class', 'donut-slice')
            .merge(paths)
            .attr('d', d => (hoveredIdx === d.data.index && !hiddenSet.has(d.data.index)) ? arcHover(d) : arc(d))
            .attr('fill', d => hiddenSet.has(d.data.index) ? '#e2e8f0' : colors[d.data.index % colors.length])
            .attr('stroke', '#ffffff').attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                if (hiddenSet.has(d.data.index)) return;
                hoveredIdx = d.data.index;
                d3.select(this).attr('d', arcHover(d));
                const vt = visTotal();
                const p = vt > 0 ? ((d.data.rawValue / vt) * 100).toFixed(1) : '0.0';
                tooltip.style('display', 'block')
                    .html(`<strong>${d.data.label}</strong>：${d.data.rawValue.toLocaleString()} 件（${p}%）`);
            })
            .on('mousemove', function (event) {
                tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function (event, d) {
                hoveredIdx = -1;
                d3.select(this).attr('d', arc(d));
                tooltip.style('display', 'none');
            })
            .on('click', function (event, d) {
                toggleLegend(d.data.index);
            });
        paths.exit().remove();

        // 扇区内标签
        const lbls = chartG.selectAll('.donut-label').data(pieData.filter(d => !hiddenSet.has(d.data.index) && d.data.rawValue > 0), d => d.data.index);
        lbls.enter().append('text').attr('class', 'donut-label')
            .merge(lbls)
            .attr('transform', d => {
                const vt = visTotal();
                const p = vt > 0 ? (d.data.rawValue / vt) * 100 : 0;
                const a = p < 5 ? outerLabelArc : labelArc;
                return `translate(${a.centroid(d)})`;
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px').attr('font-weight', 'bold')
            .attr('fill', d => {
                const bg = colors[d.data.index % colors.length];
                const vt = visTotal();
                const p = vt > 0 ? (d.data.rawValue / vt) * 100 : 0;
                if (p < 5) return '#334155';
                return (bg === '#f59e0b') ? '#1e293b' : '#ffffff';
            })
            .text(d => {
                const vt = visTotal();
                const p = vt > 0 ? ((d.data.rawValue / vt) * 100).toFixed(1) : '0.0';
                return `${d.data.label} ${p}%`;
            });
        lbls.exit().remove();

        // 图例
        const legendG = svg.selectAll('.legend-item').data(labels.map((l, i) => ({ label: l, index: i })));
        const enterLeg = legendG.enter().append('g').attr('class', 'legend-item').style('cursor', 'pointer');
        enterLeg.append('rect').attr('class', 'leg-rect');
        enterLeg.append('text').attr('class', 'leg-text');
        enterLeg.append('line').attr('class', 'leg-strike');

        const allLeg = enterLeg.merge(legendG)
            .attr('transform', (d, i) => `translate(${chartW + 8}, ${H / 2 - labels.length * 12 + i * 28})`)
            .on('click', function (event, d) { toggleLegend(d.index); });

        allLeg.select('.leg-rect')
            .attr('width', 14).attr('height', 14).attr('rx', 3)
            .attr('fill', d => hiddenSet.has(d.index) ? '#e2e8f0' : colors[d.index % colors.length]);

        allLeg.select('.leg-text')
            .attr('x', 20).attr('y', 11)
            .attr('font-size', '12px').attr('font-weight', '700')
            .attr('fill', d => hiddenSet.has(d.index) ? '#cbd5e1' : '#334155')
            .text(d => {
                const vt = visTotal();
                const p = (!hiddenSet.has(d.index) && vt > 0) ? ((values[d.index] / vt) * 100).toFixed(1) : null;
                return p !== null ? `${d.label}  ${p}%` : d.label;
            });

        allLeg.select('.leg-strike')
            .attr('x1', 20).attr('x2', d => 20 + (d.label.length * 7 + 50))
            .attr('y1', 7).attr('y2', 7)
            .attr('stroke', '#cbd5e1').attr('stroke-width', 1.5)
            .attr('display', d => hiddenSet.has(d.index) ? 'block' : 'none');

        legendG.exit().remove();
    }

    function toggleLegend(idx) {
        if (hiddenSet.has(idx)) {
            hiddenSet.delete(idx);
        } else {
            if (hiddenSet.size >= labels.length - 1) return;
            hiddenSet.add(idx);
        }
        hoveredIdx = -1;
        draw();
    }

    draw();
}

// ========== 2. 高价值弧线 ==========
function renderHighValueArc() {
    const container = document.getElementById('chartAct1HighValueArc');
    container.innerHTML = '';

    const W = 120, H = 120;
    const outerR = Math.min(W, H) / 2;
    const innerR = outerR * 0.8;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    const g = svg.append('g').attr('transform', `translate(${W / 2}, ${H / 2})`);

    const highVal = globalProcessedMetrics.highValueCount || 0;
    const total = Math.max(1, globalProcessedMetrics.totalCount || 1);
    const ratio = highVal / total;

    const arcBg = d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(0).endAngle(2 * Math.PI);
    const arcVal = d3.arc().innerRadius(innerR).outerRadius(outerR).startAngle(0);

    // 背景环
    g.append('path').attr('d', arcBg()).attr('fill', '#e2e8f0');

    // 值环 + 动画
    const valPath = g.append('path').attr('fill', '#d97706');
    valPath.transition().duration(800).ease(d3.easeCubicOut)
        .attrTween('d', function () {
            const interp = d3.interpolate(0, ratio * 2 * Math.PI);
            return function (t) {
                return arcVal.endAngle(interp(t))();
            };
        });
}

// ========== 3. 技术主题分布极区图 ==========
function renderTechPolarArea() {
    const container = document.getElementById('chartAct1TechRose');
    container.innerHTML = '';

    let sortedTech = Object.entries(globalProcessedMetrics.techThemeClustering)
        .sort((a, b) => b[1] - a[1]).slice(0, 6);
    const rawTechVals = sortedTech.map(x => x[1]);
    const maxTechVal = Math.max(...rawTechVals);
    const displayTechVals = rawTechVals.map(v => Math.sqrt(v / maxTechVal) * maxTechVal);

    const bgColors = [
        'rgba(200,151,60,0.55)', 'rgba(74,138,106,0.55)',
        'rgba(58,90,138,0.55)', 'rgba(192,64,48,0.55)',
        'rgba(138,125,101,0.55)', 'rgba(180,148,80,0.35)'
    ];

    // 逻辑坐标系
    const W = 400;
    const H = 240;
    const legendW = 110;
    const chartW = W - legendW;
    const radius = Math.min(chartW, H) / 2 - 16;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    const g = svg.append('g').attr('transform', `translate(${chartW / 2}, ${H / 2})`);

    // Tooltip
    let tooltip = d3.select('#polarTooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div').attr('id', 'polarTooltip')
            .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)')
            .style('padding', '8px 12px').style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
            .style('border', '1px solid rgba(0,0,0,0.08)')
            .style('font-size', '13px').style('pointer-events', 'none')
            .style('z-index', '1000').style('display', 'none');
    }

    const rScale = d3.scaleLinear().domain([0, maxTechVal]).range([0, radius]);
    const angleSlice = (2 * Math.PI) / sortedTech.length;

    // 网格圈
    [0.25, 0.5, 0.75, 1].forEach(f => {
        g.append('circle').attr('r', radius * f)
            .attr('fill', 'none').attr('stroke', 'rgba(180,148,80,0.1)');
    });

    // 扇区
    const arc = d3.arc().innerRadius(0);
    sortedTech.forEach((item, i) => {
        const startA = angleSlice * i - Math.PI / 2;
        const endA = startA + angleSlice;
        const r = rScale(displayTechVals[i]);

        g.append('path')
            .attr('d', arc.outerRadius(r).startAngle(startA).endAngle(endA)())
            .attr('fill', bgColors[i % bgColors.length])
            .attr('stroke', '#2a2520').attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function (event) {
                d3.select(this).attr('fill-opacity', 0.8);
                tooltip.style('display', 'block')
                    .html(`<strong>${item[0].split('（')[0]}</strong>：${rawTechVals[i].toLocaleString()} 件专利`);
            })
            .on('mousemove', function (event) {
                tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill-opacity', 1);
                tooltip.style('display', 'none');
            });
    });

    // 图例
    const legendG = svg.append('g').attr('transform', `translate(${chartW + 4}, ${H / 2 - sortedTech.length * 10})`);
    sortedTech.forEach((item, i) => {
        const ly = i * 22;
        const lg = legendG.append('g').attr('transform', `translate(0, ${ly})`);
        lg.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2)
            .attr('fill', bgColors[i % bgColors.length]);
        lg.append('text').attr('x', 16).attr('y', 10)
            .attr('font-size', '10px').attr('fill', '#8a7d65')
            .text(item[0].split('（')[0]);
    });
}

// ========== 4. 地市排行条形图 ==========
function renderCityBar() {
    const container = document.getElementById('chartAct1CityBar');
    container.innerHTML = '';

    let sortedCity = Object.entries(globalProcessedMetrics.cityRanking)
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 逻辑坐标系
    const W = 400;
    const H = 240;
    const margin = { top: 8, right: 20, bottom: 24, left: 70 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    // 渐变定义
    const defs = svg.append('defs');
    sortedCity.forEach((_, i) => {
        const alpha = 1 - i * 0.15;
        const grad = defs.append('linearGradient').attr('id', `cityGrad${i}`)
            .attr('x1', '0%').attr('x2', '100%');
        grad.append('stop').attr('offset', '0%').attr('stop-color', `rgba(2,132,199,${Math.max(alpha - 0.2, 0.3)})`);
        grad.append('stop').attr('offset', '100%').attr('stop-color', `rgba(56,189,248,${alpha})`);
    });
    const hoverGrad = defs.append('linearGradient').attr('id', 'cityGradHover')
        .attr('x1', '0%').attr('x2', '100%');
    hoverGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0369a1');
    hoverGrad.append('stop').attr('offset', '100%').attr('stop-color', '#38bdf8');

    // Tooltip
    let tooltip = d3.select('#cityBarTooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div').attr('id', 'cityBarTooltip')
            .style('position', 'absolute').style('background', 'rgba(255,255,255,0.95)')
            .style('padding', '8px 12px').style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.12)')
            .style('border', '1px solid rgba(0,0,0,0.08)')
            .style('font-size', '13px').style('pointer-events', 'none')
            .style('z-index', '1000').style('display', 'none');
    }

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, d3.max(sortedCity, d => d[1])]).range([0, innerW]);
    const yScale = d3.scaleBand().domain(sortedCity.map(d => d[0])).range([0, innerH]).padding(0.25);

    // X 轴
    g.append('g').attr('transform', `translate(0, ${innerH})`)
        .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.format(',d')))
        .selectAll('text').attr('fill', '#64748b').attr('font-size', '11px');
    g.select('.domain').remove();
    g.selectAll('.tick line').attr('stroke', 'rgba(148,163,184,0.15)');

    // Y 轴
    g.append('g').call(d3.axisLeft(yScale).tickSize(0))
        .selectAll('text').attr('fill', '#64748b').attr('font-size', '12px').attr('font-weight', '500');
    g.selectAll('.domain').remove();

    // 条形
    g.selectAll('.city-bar').data(sortedCity).join('rect')
        .attr('class', 'city-bar')
        .attr('x', 0).attr('y', d => yScale(d[0]))
        .attr('width', 0).attr('height', yScale.bandwidth())
        .attr('fill', (d, i) => `url(#cityGrad${i})`)
        .attr('rx', 6)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('fill', 'url(#cityGradHover)');
            tooltip.style('display', 'block')
                .html(`<strong>${d[0]}</strong>：${d[1].toLocaleString()} 件`);
        })
        .on('mousemove', function (event) {
            tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function (event, d) {
            const i = sortedCity.indexOf(d);
            d3.select(this).attr('fill', `url(#cityGrad${i})`);
            tooltip.style('display', 'none');
        })
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('width', d => xScale(d[1]));

    // 条内数值标签
    g.selectAll('.city-bar-label').data(sortedCity).join('text')
        .attr('class', 'city-bar-label')
        .attr('x', d => xScale(d[1]) / 2)
        .attr('y', d => yScale(d[0]) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em').attr('text-anchor', 'middle')
        .attr('fill', '#ffffff').attr('font-size', '11px').attr('font-weight', 'bold')
        .text(d => d[1].toLocaleString())
        .style('opacity', 0)
        .transition().delay(400).duration(300)
        .style('opacity', 1);
}
