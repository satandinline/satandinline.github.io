// 全景仪表盘模块（完全自包含）
window.act1Module = {
    // 模块私有：图表实例管理
    charts: {},

    // 模块初始化入口
    init(options) {
        const { globalData } = options;
        this._renderMetrics(globalData);
        this._renderAllCharts(globalData);
    },

    // 模块销毁：清理所有本模块创建的资源
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    },

    // 私有方法：渲染统计数字
    _renderMetrics(globalData) {
        document.getElementById('metricTotalCount').innerText = globalData.totalCount.toLocaleString();
        document.getElementById('metricSubDateRange').innerText =
            `分析周期：${globalData.minYear || 2000}-${globalData.maxYear || 2026}年资产全景`;
        document.getElementById('metricHighValueCount').innerText = globalData.highValueCount.toLocaleString();

        const pct = globalData.totalCount > 0
            ? ((globalData.highValueCount / globalData.totalCount) * 100).toFixed(1)
            : 0;
        document.getElementById('metricHighValueRatio').innerText = `高价值资产占比 ${pct}%`;
    },

    // 私有方法：渲染所有图表
    _renderAllCharts(globalData) {
        this._renderGrantRateChart(globalData);
        this._renderHighValueArcChart(globalData);
        this._renderTechRoseChart(globalData);
        this._renderCityBarChart(globalData);
    },

    _renderGrantRateChart(globalData) {
        this.charts.chartAct1GrantRate = new Chart(
            document.getElementById('chartAct1GrantRate').getContext('2d'),
            {
                type: 'doughnut',
                data: {
                    labels: Object.keys(globalData.legalStatusStats),
                    datasets: [{
                        data: Object.values(globalData.legalStatusStats),
                        backgroundColor: ['#10b981', '#38bdf8', '#fb7185', '#475569'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
                }
            }
        );
    },

    _renderHighValueArcChart(globalData) {
        this.charts.chartAct1HighValueArc = new Chart(
            document.getElementById('chartAct1HighValueArc').getContext('2d'),
            {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [
                            globalData.highValueCount,
                            Math.max(1, globalData.totalCount - globalData.highValueCount)
                        ],
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
            }
        );
    },

    _renderTechRoseChart(globalData) {
        const sortedTech = Object.entries(globalData.techThemeClustering)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        this.charts.chartAct1TechRose = new Chart(
            document.getElementById('chartAct1TechRose').getContext('2d'),
            {
                type: 'polarArea',
                data: {
                    labels: sortedTech.map(x => x[0].substring(0, 8)),
                    datasets: [{
                        data: sortedTech.map(x => x[1]),
                        backgroundColor: [
                            'rgba(56,189,248,0.6)', 'rgba(129,140,248,0.6)',
                            'rgba(16,185,129,0.6)', 'rgba(244,63,94,0.6)',
                            'rgba(245,158,11,0.6)', 'rgba(45,212,191,0.6)'
                        ],
                        borderColor: '#0f172a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    },
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } }
                    }
                }
            }
        );
    },

    _renderCityBarChart(globalData) {
        const sortedCity = Object.entries(globalData.cityRanking)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        this.charts.chartAct1CityBar = new Chart(
            document.getElementById('chartAct1CityBar').getContext('2d'),
            {
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
            }
        );
    }
};