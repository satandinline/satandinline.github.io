// Act 2: 区域空间格局专属交互逻辑 (ECharts 地图热力图)

let echartsMapInstance = null;

function renderAct2() {
    const container = document.getElementById('echartsChinaMap');
    if (!container) return;

    // 初始化或复用 ECharts 实例
    if (echartsMapInstance) {
        echartsMapInstance.dispose();
    }
    echartsMapInstance = echarts.init(container);

    // 从 globalProcessedMetrics 获取省份专利数量
    const provinceRanking = globalProcessedMetrics.provinceRanking || {};

    // 构建 ECharts 地图数据：遍历省份排名，生成 {name, value} 数组
    // ECharts china.js 地图的省份名称为简称（北京、上海、广东...），与 provinceRanking 的 key 一致
    const mapData = Object.entries(provinceRanking).map(([name, value]) => ({
        name: name,
        value: value
    }));

    // 计算最大值和最小值用于 visualMap
    const counts = Object.values(provinceRanking);
    const maxVal = counts.length > 0 ? Math.max(...counts) : 100;
    const minVal = 0;

    const option = {
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',

        // 提示框
        tooltip: {
            show: true,
            trigger: 'item',
            triggerOn: 'mousemove|click',
            formatter: function (params) {
                if (params.value !== undefined && params.value !== '-') {
                    return `<strong>${params.name}</strong><br/>专利数量：${params.value} 件`;
                }
                return `<strong>${params.name}</strong><br/>专利数量：0 件`;
            },
            textStyle: { fontSize: 14 },
            padding: 5
        },

        // 视觉映射组件（颜色比例尺）
        visualMap: {
            show: true,
            type: 'continuous',
            min: minVal,
            max: maxVal,
            inRange: {
                color: ['#50a3ba', '#eac763', '#d94e5d']
            },
            calculable: true,
            orient: 'vertical',
            left: 'left',
            bottom: 30,
            showLabel: true,
            itemWidth: 20,
            itemHeight: 140,
            text: [maxVal + ' 件', '0'],
            textStyle: { color: '#333' }
        },

        // 系列配置
        series: [{
            type: 'map',
            name: '专利数量',
            mapType: 'china',
            roam: true,           // 允许缩放和拖拽
            aspectScale: 0.75,
            selectedMode: false,
            zoom: 1,
            label: {
                show: true,
                position: 'top',
                fontSize: 9,
                color: '#666'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#333'
                },
                itemStyle: {
                    areaColor: '#fbbf24',
                    borderColor: '#fbbf24',
                    borderWidth: 2
                }
            },
            itemStyle: {
                borderColor: '#aaa',
                borderWidth: 0.5
            },
            data: mapData
        }]
    };

    echartsMapInstance.setOption(option);

    // 窗口大小变化时自动调整图表尺寸
    window.addEventListener('resize', () => {
        if (echartsMapInstance) echartsMapInstance.resize();
    });
}
