// Act 1: 全景仪表盘专属交互逻辑

function renderAct1() {
    // 更新核心指标
    document.getElementById('metricTotalCount').innerText = globalProcessedMetrics.totalCount.toLocaleString();
    document.getElementById('metricSubDateRange').innerText = `分析周期：${globalProcessedMetrics.minYear || 2000}-${globalProcessedMetrics.maxYear || 2026}年资产全景`;
    document.getElementById('metricHighValueCount').innerText = globalProcessedMetrics.highValueCount.toLocaleString();

    let pct = globalProcessedMetrics.totalCount > 0 ? ((globalProcessedMetrics.highValueCount / globalProcessedMetrics.totalCount) * 100).toFixed(1) : 0;
    document.getElementById('metricHighValueRatio').innerText = `高价值资产占比 ${pct}%`;

    // ========== 1. 专利法律审查结构环形图（带百分比 + 点击筛选） ==========
    clearCanvas('chartAct1GrantRate');
    const legalLabels = Object.keys(globalProcessedMetrics.legalStatusStats);
    const legalValues = Object.values(globalProcessedMetrics.legalStatusStats);
    const legalTotal = legalValues.reduce((s, v) => s + v, 0);
    // 为小扇区设置最小显示值，确保弧线在图上可见（最少占3%视觉弧度）
    const minVisualPct = 0.03;
    // 记录被筛选掉（划线/隐藏）的索引集合
    const hiddenSet = new Set();
    // 记录当前高亮（hover）的索引
    let hoveredIdx = -1;

    function getVisibleTotal() {
        return legalValues.reduce((s, v, i) => hiddenSet.has(i) ? s : s + v, 0);
    }
    function getDisplayValues() {
        const visTotal = getVisibleTotal();
        return legalValues.map((v, i) => {
            if (hiddenSet.has(i)) return 0;
            if (v === 0) return 0;
            return Math.max(v, visTotal * minVisualPct);
        });
    }

    // 自定义插件：为被筛选掉的图例项绘制删除线
    const legendStrikethroughPlugin = {
        id: 'legendStrikethrough',
        afterDraw(chart) {
            const legend = chart.legend;
            if (!legend || !legend.legendItems) return;
            const ctx = chart.ctx;
            legend.legendItems.forEach((item) => {
                if (item.textDecoration === 'line-through') {
                    const textWidth = ctx.measureText(item.text).width;
                    const x = item.textAlign === 'center'
                        ? item.x - textWidth / 2
                        : (item.textAlign === 'right' ? item.x - textWidth : item.x);
                    const y = item.y + (item.font ? item.font.size / 3 : 4);
                    ctx.save();
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + textWidth, y);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    };

    loadedChartsInstances['chartAct1GrantRate'] = new Chart(document.getElementById('chartAct1GrantRate').getContext('2d'), {
        type: 'doughnut',
        plugins: [legendStrikethroughPlugin],
        data: {
            labels: legalLabels,
            datasets: [{
                data: getDisplayValues(),
                backgroundColor: legalLabels.map((_, i) => hiddenSet.has(i) ? '#e2e8f0' : ['#22c55e', '#3b82f6', '#f43f5e', '#f59e0b'][i]),
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            onHover: function (evt, elements, chart) {
                if (!elements.length) {
                    hoveredIdx = -1;
                    chart.update('none');
                    return;
                }
                const idx = elements[0].index;
                if (hiddenSet.has(idx)) {
                    hoveredIdx = -1;
                    chart.update('none');
                    return;
                }
                if (hoveredIdx !== idx) {
                    hoveredIdx = idx;
                    chart.update('none');
                }
            },
            onClick: function (evt, elements, chart) {
                if (!elements.length) return;
                const idx = elements[0].index;
                if (hiddenSet.has(idx)) {
                    hiddenSet.delete(idx);
                } else {
                    // 至少保留一项可见
                    if (hiddenSet.size >= legalLabels.length - 1) return;
                    hiddenSet.add(idx);
                }
                hoveredIdx = -1;
                // 更新数据
                chart.data.datasets[0].data = getDisplayValues();
                chart.data.datasets[0].backgroundColor = legalLabels.map((_, i) => hiddenSet.has(i) ? '#e2e8f0' : ['#22c55e', '#3b82f6', '#f43f5e', '#f59e0b'][i]);
                chart.update();
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#334155',
                        font: { size: 13, weight: '700' },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 16,
                        boxWidth: 16,
                        boxHeight: 16,
                        generateLabels: function (chart) {
                            const dataset = chart.data.datasets[0];
                            const visTotal = getVisibleTotal();
                            return chart.data.labels.map((label, i) => {
                                const val = legalValues[i];
                                const isHidden = hiddenSet.has(i);
                                const isHovered = (i === hoveredIdx);
                                // 被筛选掉的项不显示百分比
                                const pct = (!isHidden && visTotal > 0) ? ((val / visTotal) * 100).toFixed(1) : null;
                                const pctStr = pct !== null ? `  ${pct}%` : '';
                                // 被筛选掉的项文字变灰并加删除线效果（通过变灰+变浅色模拟）
                                const fontColor = isHidden ? '#cbd5e1' : (isHovered ? dataset.backgroundColor[i] : '#334155');
                                return {
                                    text: `${label}${pctStr}`,
                                    fillStyle: isHidden ? '#e2e8f0' : dataset.backgroundColor[i],
                                    strokeStyle: isHovered ? '#ffffff' : (isHidden ? '#e2e8f0' : dataset.backgroundColor[i]),
                                    lineWidth: isHovered ? 2 : 0,
                                    fontColor: fontColor,
                                    textDecoration: isHidden ? 'line-through' : '',
                                    pointStyle: isHidden ? 'line' : 'rectRounded',
                                    index: i,
                                    hidden: false
                                };
                            });
                        }
                    },
                    onClick: function (evt, legendItem, legend) {
                        const idx = legendItem.index;
                        const chart = legend.chart;
                        if (hiddenSet.has(idx)) {
                            hiddenSet.delete(idx);
                        } else {
                            if (hiddenSet.size >= legalLabels.length - 1) return;
                            hiddenSet.add(idx);
                        }
                        hoveredIdx = -1;
                        chart.data.datasets[0].data = getDisplayValues();
                        chart.data.datasets[0].backgroundColor = legalLabels.map((_, i) => hiddenSet.has(i) ? '#e2e8f0' : ['#22c55e', '#3b82f6', '#f43f5e', '#f59e0b'][i]);
                        chart.update();
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    bodyFont: { size: 13, weight: '500' },
                    titleFont: { size: 13, weight: '700' },
                    displayColors: true,
                    boxPadding: 4,
                    filter: function (tooltipItem) {
                        return !hiddenSet.has(tooltipItem.dataIndex);
                    },
                    callbacks: {
                        label: function (ctx) {
                            const val = legalValues[ctx.dataIndex];
                            const visTotal = getVisibleTotal();
                            const pct = visTotal > 0 ? ((val / visTotal) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}：${Number(val).toLocaleString()} 件（${pct}%）`;
                        }
                    }
                },
                datalabels: {
                    display: function (ctx) {
                        return !hiddenSet.has(ctx.dataIndex);
                    },
                    font: { weight: 'bold', size: 11 },
                    color: function (ctx) {
                        if (hiddenSet.has(ctx.dataIndex)) return 'transparent';
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        if (pct < 5) return '#334155';
                        const bgColor = ctx.dataset.backgroundColor[ctx.dataIndex];
                        return (bgColor === '#f59e0b' || bgColor === '#fbbf24') ? '#1e293b' : '#ffffff';
                    },
                    align: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        return pct < 5 ? 'end' : 'center';
                    },
                    anchor: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        return pct < 5 ? 'end' : 'center';
                    },
                    offset: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        return pct < 5 ? 8 : 0;
                    },
                    clamp: true,
                    formatter: function (value, ctx) {
                        if (hiddenSet.has(ctx.dataIndex)) return '';
                        const label = ctx.chart.data.labels[ctx.dataIndex];
                        const realVal = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? ((realVal / visTotal) * 100).toFixed(1) : 0;
                        return [label, `${pct}%`];
                    },
                    textStrokeColor: function (ctx) {
                        if (hiddenSet.has(ctx.dataIndex)) return 'transparent';
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        if (pct < 5) return 'transparent';
                        const bgColor = ctx.dataset.backgroundColor[ctx.dataIndex];
                        return (bgColor === '#f59e0b' || bgColor === '#fbbf24') ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';
                    },
                    textStrokeWidth: function (ctx) {
                        if (hiddenSet.has(ctx.dataIndex)) return 0;
                        const val = legalValues[ctx.dataIndex];
                        const visTotal = getVisibleTotal();
                        const pct = visTotal > 0 ? (val / visTotal) * 100 : 0;
                        return pct < 5 ? 0 : 2;
                    }
                }
            }
        }
    });

    clearCanvas('chartAct1HighValueArc');
    loadedChartsInstances['chartAct1HighValueArc'] = new Chart(document.getElementById('chartAct1HighValueArc').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [globalProcessedMetrics.highValueCount, Math.max(1, globalProcessedMetrics.totalCount - globalProcessedMetrics.highValueCount)],
                backgroundColor: ['#d97706', '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: { tooltip: { enabled: false } }
        }
    });

    // ========== 3. 技术主题分布极区图（Top 6） ==========
    clearCanvas('chartAct1TechRose');
    let sortedTech = Object.entries(globalProcessedMetrics.techThemeClustering).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const rawTechVals = sortedTech.map(x => x[1]);
    const maxTechVal = Math.max(...rawTechVals);
    // 平方根压缩：削弱极端值主导，让各扇区面积更均衡
    const displayTechVals = rawTechVals.map(v => Math.sqrt(v / maxTechVal) * maxTechVal);
    loadedChartsInstances['chartAct1TechRose'] = new Chart(document.getElementById('chartAct1TechRose').getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: sortedTech.map(x => x[0].split('（')[0]),
            datasets: [{
                data: displayTechVals,
                backgroundColor: [
                    'rgba(200,151,60,0.55)', 'rgba(74,138,106,0.55)',
                    'rgba(58,90,138,0.55)',  'rgba(192,64,48,0.55)',
                    'rgba(138,125,101,0.55)','rgba(180,148,80,0.35)'
                ],
                borderColor: '#2a2520',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    ticks: { display: false },
                    grid: { color: 'rgba(180,148,80,0.07)' }
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#8a7d65', font: { size: 10 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    bodyFont: { size: 13, weight: '500' },
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        label: function (ctx) {
                            // tooltip 展示原始真实数值
                            const realVal = rawTechVals[ctx.dataIndex];
                            return ` ${ctx.label}：${realVal.toLocaleString()} 件专利`;
                        }
                    }
                }
            }
        }
    });

    // ========== 4. 创新地市排行 TOP 5 水平条形图（渐变+数据标签） ==========
    clearCanvas('chartAct1CityBar');
    let sortedCity = Object.entries(globalProcessedMetrics.cityRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const cityCtx = document.getElementById('chartAct1CityBar').getContext('2d');
    // 按排名创建从深到浅的水平渐变色数组
    const cityBarColors = sortedCity.map((_, i) => {
        const grad = cityCtx.createLinearGradient(0, 0, cityCtx.canvas.width, 0);
        const alpha = 1 - i * 0.15;
        grad.addColorStop(0, `rgba(2,132,199,${Math.max(alpha - 0.2, 0.3)})`);
        grad.addColorStop(1, `rgba(56,189,248,${alpha})`);
        return grad;
    });

    // 只为这个图表临时注册插件，不影响其他图表
    let cityChartPlugins = [];
    if (typeof ChartDataLabels !== 'undefined') {
        cityChartPlugins.push(ChartDataLabels);
    }

    loadedChartsInstances['chartAct1CityBar'] = new Chart(cityCtx, {
        type: 'bar',
        data: {
            labels: sortedCity.map(x => x[0]),
            datasets: [{
                data: sortedCity.map(x => x[1]),
                backgroundColor: cityBarColors,
                hoverBackgroundColor: sortedCity.map(() => {
                    const grad = cityCtx.createLinearGradient(0, 0, cityCtx.canvas.width, 0);
                    grad.addColorStop(0, '#0369a1');
                    grad.addColorStop(1, '#38bdf8');
                    return grad;
                }),
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        plugins: cityChartPlugins, // 只为这个图表添加插件
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // 水平条形图
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 11, weight: '500' }, padding: 6 },
                    grid: { color: 'rgba(148,163,184,0.1)' },
                    border: { display: false },
                    beginAtZero: true
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 12, weight: '500' }, padding: 8, maxRotation: 0, minRotation: 0 },
                    grid: { display: false },
                    border: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    bodyFont: { size: 13, weight: '500' },
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        label: function (ctx) { return ` ${ctx.label} ${ctx.parsed.x.toLocaleString()} 件`; }
                    }
                },
                datalabels: {
                    display: true,
                    anchor: 'center',
                    align: 'center',
                    color: '#ffffff',
                    font: { weight: 'bold', size: 11 },
                    rotation: 0,
                    clamp: true,
                    formatter: function (value, ctx) {
                        return value.toLocaleString();
                    },
                    offset: 0 // 居中显示
                }
            }
        }
    });
}

function clearCanvas(id) {
    if (loadedChartsInstances[id]) loadedChartsInstances[id].destroy();
}
