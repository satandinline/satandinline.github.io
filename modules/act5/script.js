// 价值预警矩阵模块（完全自包含，还原原版本样式）
window.act5Module = {
    // 模块私有：图表实例管理
    charts: {},

    // 模块初始化入口
    init(options) {
        const { globalData } = options;
        this._renderAllCharts(globalData);
    },

    // 模块销毁：清理所有本模块创建的资源
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    },

    // 私有方法：渲染所有图表（还原原版本样式）
    _renderAllCharts(globalData) {
        this._renderValueBarChart(globalData);
        this._renderRiskPieChart(globalData);
    },

    // 还原：高价值资产分布柱状图
    _renderValueBarChart(globalData) {
        this.charts.chartAct5ValueFeature = new Chart(
            document.getElementById('chartAct5ValueFeature').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels: ['核心高价值资产群 (Score>=45)', '中等力量资产群 (Score 20~44)', '长尾初筛资产群 (Score<20)'],
                    datasets: [{
                        data: [
                            globalData.valueScoreDistribution.high,
                            globalData.valueScoreDistribution.mid,
                            globalData.valueScoreDistribution.low
                        ],
                        backgroundColor: ['#f59e0b', '#38bdf8', '#475569'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: {
                            ticks: { color: '#94a3b8' },
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: '高价值专利多维度特征分布', color: '#fff' }
                    }
                }
            }
        );
    },

    // 还原：风险分布饼图
    _renderRiskPieChart(globalData) {
        this.charts.chartAct5RiskMonitor = new Chart(
            document.getElementById('chartAct5RiskMonitor').getContext('2d'),
            {
                type: 'pie',
                data: {
                    labels: ['已到期终止失效风险', '临近3年内到期预警', '稳健期安全运营资产'],
                    datasets: [{
                        data: [
                            globalData.riskDistribution.expired,
                            globalData.riskDistribution.critical,
                            globalData.riskDistribution.normal
                        ],
                        backgroundColor: ['#f43f5e', '#f59e0b', '#10b981'],
                        borderWidth: 1,
                        borderColor: '#0f172a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8' } },
                        title: { display: true, text: '专利生命周期风险监控', color: '#fff' }
                    }
                }
            }
        );
    }
};