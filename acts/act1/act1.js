// Act 1: 全景仪表盘专属交互逻辑

function renderAct1() {
    // 更新核心指标
    document.getElementById('metricTotalCount').innerText = globalProcessedMetrics.totalCount.toLocaleString();
    document.getElementById('metricSubDateRange').innerText = `分析周期：${globalProcessedMetrics.minYear || 2000}-${globalProcessedMetrics.maxYear || 2026}年资产全景`;
    document.getElementById('metricHighValueCount').innerText = globalProcessedMetrics.highValueCount.toLocaleString();

    let pct = globalProcessedMetrics.totalCount > 0 ? ((globalProcessedMetrics.highValueCount / globalProcessedMetrics.totalCount) * 100).toFixed(1) : 0;
    document.getElementById('metricHighValueRatio').innerText = `高价值资产占比 ${pct}%`;

    // ========== 1. 专利法律审查结构环形图（带百分比） ==========
    clearCanvas('chartAct1GrantRate');
    const legalLabels = Object.keys(globalProcessedMetrics.legalStatusStats);
    const legalValues = Object.values(globalProcessedMetrics.legalStatusStats);
    const legalTotal = legalValues.reduce((s, v) => s + v, 0);
    // 为小扇区设置最小显示值，确保弧线在图上可见（最少占3%视觉弧度）
    const minVisualPct = 0.03;
    const legalDisplayValues = legalValues.map(v => {
        if (v === 0) return 0;
        return Math.max(v, legalTotal * minVisualPct);
    });
    // 记录当前高亮（划线）的索引
    let hoveredIdx = -1;
    loadedChartsInstances['chartAct1GrantRate'] = new Chart(document.getElementById('chartAct1GrantRate').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: legalLabels,
            datasets: [{
                data: legalDisplayValues,
                backgroundColor: ['#22c55e', '#3b82f6', '#f43f5e', '#f59e0b'],
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
                if (hoveredIdx !== idx) {
                    hoveredIdx = idx;
                    chart.update('none');
                }
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
                            return chart.data.labels.map((label, i) => {
                                const val = legalValues[i];
                                const pct = legalTotal > 0 ? ((val / legalTotal) * 100).toFixed(1) : 0;
                                const isHovered = (i === hoveredIdx);
                                return {
                                    text: `${label}  ${pct}%`,
                                    fillStyle: dataset.backgroundColor[i],
                                    strokeStyle: isHovered ? '#ffffff' : dataset.backgroundColor[i],
                                    lineWidth: isHovered ? 2 : 0,
                                    fontColor: isHovered ? dataset.backgroundColor[i] : '#334155',
                                    pointStyle: 'rectRounded',
                                    index: i
                                };
                            });
                        }
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
                    callbacks: {
                        label: function (ctx) {
                            const val = legalValues[ctx.dataIndex];
                            const pct = legalTotal > 0 ? ((val / legalTotal) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}：${Number(val).toLocaleString()} 件（${pct}%）`;
                        }
                    }
                },
                datalabels: {
                    font: { weight: 'bold', size: 11 },
                    color: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
                        if (pct < 5) return '#334155';
                        // 浅色扇区（黄/琥珀）用深色文字保证对比度
                        const bgColor = ctx.dataset.backgroundColor[ctx.dataIndex];
                        return (bgColor === '#f59e0b' || bgColor === '#fbbf24') ? '#1e293b' : '#ffffff';
                    },
                    align: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
                        return pct < 5 ? 'end' : 'center';
                    },
                    anchor: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
                        return pct < 5 ? 'end' : 'center';
                    },
                    offset: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
                        return pct < 5 ? 8 : 0;
                    },
                    clamp: true,
                    formatter: function (value, ctx) {
                        const label = ctx.chart.data.labels[ctx.dataIndex];
                        const realVal = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? ((realVal / legalTotal) * 100).toFixed(1) : 0;
                        return [label, `${pct}%`];
                    },
                    textStrokeColor: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
                        if (pct < 5) return 'transparent';
                        const bgColor = ctx.dataset.backgroundColor[ctx.dataIndex];
                        // 浅色扇区用白色描边增强对比，深色扇区用暗色描边
                        return (bgColor === '#f59e0b' || bgColor === '#fbbf24') ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';
                    },
                    textStrokeWidth: function (ctx) {
                        const val = legalValues[ctx.dataIndex];
                        const pct = legalTotal > 0 ? (val / legalTotal) * 100 : 0;
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

    // ========== 3. 技术分支主题分布雷达图（对数平滑） ==========
    clearCanvas('chartAct1TechRose');
    let sortedTech = Object.entries(globalProcessedMetrics.techThemeClustering).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const rawTechValues = sortedTech.map(x => x[1]);
    // 使用对数转换平滑极差，+1 防止 log(0)
    const logTechValues = rawTechValues.map(v => Math.log(v + 1));
    loadedChartsInstances['chartAct1TechRose'] = new Chart(document.getElementById('chartAct1TechRose').getContext('2d'), {
        type: 'radar',
        data: {
            labels: sortedTech.map(x => x[0].substring(0, 8)),
            datasets: [{
                label: '专利数量（对数平滑）',
                data: logTechValues,
                backgroundColor: 'rgba(2,132,199,0.2)',
                borderColor: '#0284c7',
                borderWidth: 2,
                pointBackgroundColor: '#0284c7',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#0369a1',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    ticks: { display: false, stepSize: 1 },
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    angleLines: { color: 'rgba(0,0,0,0.06)' },
                    pointLabels: {
                        color: '#334155',
                        font: { size: 11, weight: '600' },
                        padding: 8
                    }
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
                        label: function (ctx) {
                            const realVal = rawTechValues[ctx.dataIndex];
                            return ` ${ctx.label}：${realVal.toLocaleString()} 件专利`;
                        }
                    }
                },
                datalabels: {
                    color: '#0284c7',
                    font: { size: 10, weight: 'bold' },
                    anchor: 'end',
                    align: 'top',
                    formatter: function (value, ctx) {
                        return rawTechValues[ctx.dataIndex].toLocaleString();
                    },
                    offset: 6
                }
            }
        }
    });

    // ========== 4. 创新地市排行 TOP 5 柱状图（渐变+数据标签） ==========
    clearCanvas('chartAct1CityBar');
    let sortedCity = Object.entries(globalProcessedMetrics.cityRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const cityCtx = document.getElementById('chartAct1CityBar').getContext('2d');
    // 按排名创建从深到浅的垂直渐变色数组
    const cityBarColors = sortedCity.map((_, i) => {
        const grad = cityCtx.createLinearGradient(0, cityCtx.canvas.height, 0, 0);
        const alpha = 1 - i * 0.15;
        grad.addColorStop(0, `rgba(2,132,199,${alpha})`);
        grad.addColorStop(1, `rgba(56,189,248,${Math.max(alpha - 0.2, 0.3)})`);
        return grad;
    });
    loadedChartsInstances['chartAct1CityBar'] = new Chart(cityCtx, {
        type: 'bar',
        data: {
            labels: sortedCity.map(x => x[0]),
            datasets: [{
                data: sortedCity.map(x => x[1]),
                backgroundColor: cityBarColors,
                hoverBackgroundColor: sortedCity.map(() => {
                    const grad = cityCtx.createLinearGradient(0, cityCtx.canvas.height, 0, 0);
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 11, weight: '500' }, padding: 4, maxRotation: 0, minRotation: 0 },
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 11 }, padding: 6 },
                    grid: { color: 'rgba(148,163,184,0.1)' },
                    border: { display: false },
                    beginAtZero: true
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
                        label: function (ctx) { return ` ${ctx.label} ${ctx.parsed.y.toLocaleString()} 件`; }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#334155',
                    font: { weight: 'bold', size: 11 },
                    rotation: 0,
                    clamp: true,
                    formatter: function (value, ctx) {
                        return value.toLocaleString();
                    },
                    offset: 4
                }
            }
        }
    });
}

function clearCanvas(id) {
    if (loadedChartsInstances[id]) loadedChartsInstances[id].destroy();
}
