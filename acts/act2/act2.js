// Act 2 区域空间格局 - ECharts 地图热力图

let echartsMapInstance = null;

function renderAct2() {
    const container = document.getElementById('echartsChinaMap');
    if (!container) return;

    // 初始化 ECharts 实例
    if (echartsMapInstance) {
        echartsMapInstance.dispose();
    }
    echartsMapInstance = echarts.init(container);

    // 获取省份专利数
    const provinceRanking = globalProcessedMetrics.provinceRanking || {};

    // 构建地图数据，省份名称和 china.js 地图简称一致
    const mapData = Object.entries(provinceRanking).map(([name, value]) => ({
        name: name,
        value: value
    }));

    // 计算最大最小值
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

        // 颜色比例尺
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

        // 地图系列
        series: [{
            type: 'map',
            name: '专利数量',
            mapType: 'china',
            roam: 'move',  // 只允许拖拽平移，禁用滚轮缩放（缩放交给浏览器页面缩放）
            aspectScale: 0.75,
            selectedMode: false,
            zoom: 1.25,
            label: {
                show: true,
                position: 'top',
                fontSize: 10,
                color: '#666'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 13,
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

    // 确保 ECharts 容器不拦截滚轮事件，让页面正常滚动
    container.addEventListener('wheel', function(e) {
        e.stopPropagation();
    }, true);

    // 窗口缩放时自适应
    window.addEventListener('resize', () => {
        if (echartsMapInstance) echartsMapInstance.resize();
    });
}
