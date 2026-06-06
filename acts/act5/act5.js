// Act 5: 价值预警矩阵专属交互逻辑

function renderAct5() {
    clearCanvas('chartAct5ValueFeature');
    loadedChartsInstances['chartAct5ValueFeature'] = new Chart(document.getElementById('chartAct5ValueFeature').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['核心高价值资产群 (Score>=45)', '中等力量资产群 (Score 20~44)', '长尾初筛资产群 (Score<20)'],
            datasets: [{
                data: [globalProcessedMetrics.valueScoreDistribution.high, globalProcessedMetrics.valueScoreDistribution.mid, globalProcessedMetrics.valueScoreDistribution.low],
                backgroundColor: ['#f59e0b', '#38bdf8', '#475569'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
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
                backgroundColor: ['#f43f5e', '#fb923c', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 12 } } } }
        }
    });
}
