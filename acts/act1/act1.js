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
                backgroundColor: ['#10b981', '#0284c7', '#fb7185', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#64748b' } } }
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

    clearCanvas('chartAct1TechRose');
    let sortedTech = Object.entries(globalProcessedMetrics.techThemeClustering).sort((a, b) => b[1] - a[1]).slice(0, 6);
    loadedChartsInstances['chartAct1TechRose'] = new Chart(document.getElementById('chartAct1TechRose').getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: sortedTech.map(x => x[0].substring(0, 8)),
            datasets: [{
                data: sortedTech.map(x => x[1]),
                backgroundColor: ['rgba(2,132,199,0.6)', 'rgba(99,102,241,0.6)', 'rgba(5,150,105,0.6)', 'rgba(225,29,72,0.6)', 'rgba(217,119,6,0.6)', 'rgba(14,165,233,0.6)'],
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { ticks: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } } },
            plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 10 } } } }
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
                backgroundColor: '#0284c7',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { ticks: { color: '#64748b' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function clearCanvas(id) {
    if (loadedChartsInstances[id]) loadedChartsInstances[id].destroy();
}
