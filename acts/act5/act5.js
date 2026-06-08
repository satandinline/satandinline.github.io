// Act 5 价值预警矩阵

function renderAct5() {
    clearCanvas('chartAct5ValueFeature');
    loadedChartsInstances['chartAct5ValueFeature'] = new Chart(document.getElementById('chartAct5ValueFeature').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['核心高价值资产群 (Score>=45)', '中等力量资产群 (Score 20~44)', '长尾初筛资产群 (Score<20)'],
            datasets: [{
                data: [globalProcessedMetrics.valueScoreDistribution.high, globalProcessedMetrics.valueScoreDistribution.mid, globalProcessedMetrics.valueScoreDistribution.low],
                backgroundColor: ['#d97706', '#0284c7', '#64748b'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { display: false } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });

    clearCanvas('chartAct5RiskMonitor');
    loadedChartsInstances['chartAct5RiskMonitor'] = new Chart(document.getElementById('chartAct5RiskMonitor').getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['已到期/终止失效风险', '临近3年内到期预警', '稳健期安全运营资产'],
            datasets: [{
                data: [globalProcessedMetrics.riskDistribution.expired, globalProcessedMetrics.riskDistribution.critical, globalProcessedMetrics.riskDistribution.normal],
                backgroundColor: ['#e11d48', '#fb923c', '#059669'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { size: 12 } } } }
        }
    });
}
