// Act 1: 全景仪表盘专属交互逻辑

function renderAct1() {
    // 更新核心指标
    document.getElementById('metricTotalCount').innerText = globalProcessedMetrics.totalCount.toLocaleString();
    document.getElementById('metricSubDateRange').innerText = `分析周期：${globalProcessedMetrics.minYear || 2000}-${globalProcessedMetrics.maxYear || 2026}年资产全景`;
    document.getElementById('metricHighValueCount').innerText = globalProcessedMetrics.highValueCount.toLocaleString();

    let pct = globalProcessedMetrics.totalCount > 0 ? ((globalProcessedMetrics.highValueCount / globalProcessedMetrics.totalCount) * 100).toFixed(1) : 0;
    document.getElementById('metricHighValueRatio').innerText = `高价值资产占比 ${pct}%`;

    // 渲染图表
    clearCanvas('chartAct1GrantRate');
    loadedChartsInstances['chartAct1GrantRate'] = new Chart(document.getElementById('chartAct1GrantRate').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(globalProcessedMetrics.legalStatusStats),
            datasets: [{
                data: Object.values(globalProcessedMetrics.legalStatusStats),
                backgroundColor: ['#10b981', '#38bdf8', '#fb7185', '#475569'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
        }
    });

    clearCanvas('chartAct1HighValueArc');
    loadedChartsInstances['chartAct1HighValueArc'] = new Chart(document.getElementById('chartAct1HighValueArc').getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [globalProcessedMetrics.highValueCount, Math.max(1, globalProcessedMetrics.totalCount - globalProcessedMetrics.highValueCount)],
                backgroundColor: ['#f59e0b', '#1e293b'],
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

    clearCanvas('chartAct1TechRose');
    let sortedTech = Object.entries(globalProcessedMetrics.techThemeClustering).sort((a, b) => b[1] - a[1]).slice(0, 6);
    loadedChartsInstances['chartAct1TechRose'] = new Chart(document.getElementById('chartAct1TechRose').getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: sortedTech.map(x => x[0].substring(0, 8)),
            datasets: [{
                data: sortedTech.map(x => x[1]),
                backgroundColor: ['rgba(56,189,248,0.6)', 'rgba(129,140,248,0.6)', 'rgba(16,185,129,0.6)', 'rgba(244,63,94,0.6)', 'rgba(245,158,11,0.6)', 'rgba(45,212,191,0.6)'],
                borderColor: '#0f172a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' } } },
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } }
        }
    });

    clearCanvas('chartAct1CityBar');
    let sortedCity = Object.entries(globalProcessedMetrics.cityRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);
    loadedChartsInstances['chartAct1CityBar'] = new Chart(document.getElementById('chartAct1CityBar').getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedCity.map(x => x[0]),
            datasets: [{
                data: sortedCity.map(x => x[1]),
                backgroundColor: '#38bdf8',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function clearCanvas(id) {
    if (loadedChartsInstances[id]) loadedChartsInstances[id].destroy();
}
