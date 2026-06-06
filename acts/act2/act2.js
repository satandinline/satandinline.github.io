// Act 2: 全球与区域空间格局专属交互逻辑

const OFFLINE_GEO_DATA = {
    "广东": "M395,395 L415,395 L425,405 L415,415 L390,412 L380,402 Z", "北京": "M420,185 L435,185 L435,195 L420,195 Z",
    "上海": "M475,285 L485,285 L485,295 L475,295 Z", "浙江": "M460,300 L475,300 L480,320 L465,330 L455,315 Z",
    "江苏": "M455,265 L475,270 L475,290 L455,290 L445,275 Z", "山东": "M430,225 L460,225 L465,245 L445,255 L425,240 Z",
    "湖北": "M390,295 L425,295 L430,315 L405,325 L390,310 Z", "湖南": "M390,330 L415,330 L420,360 L395,365 L385,345 Z",
    "四川": "M310,295 L350,295 L355,335 L325,345 L310,320 Z", "福建": "M440,345 L460,345 L455,375 L435,375 L430,355 Z",
    "安徽": "M440,275 L455,275 L455,305 L435,305 Z", "河南": "M395,245 L430,245 L430,275 L395,275 Z",
    "河北": "M415,170 L440,170 L435,215 L415,215 Z", "陕西": "M365,235 L390,235 L390,285 L365,285 Z",
    "辽宁": "M460,150 L485,155 L480,180 L455,175 Z", "黑龙江": "M480,70 L520,90 L500,130 L465,110 Z",
    "吉林": "M475,120 L505,130 L495,160 L465,145 Z", "内蒙古": "M310,140 L440,165 L410,195 L340,185 Z",
    "山西": "M395,200 L415,200 L410,240 L392,240 Z", "甘肃": "M290,210 L350,245 L340,275 L280,240 Z",
    "宁夏": "M350,220 L365,220 L365,245 L350,245 Z", "青海": "M240,230 L300,240 L290,285 L230,270 Z",
    "新疆": "M120,130 L220,170 L200,260 L100,210 Z", "西藏": "M130,265 L250,285 L230,350 L120,320 Z",
    "重庆": "M355,300 L380,300 L380,325 L355,325 Z", "贵州": "M345,340 L375,340 L370,370 L340,370 Z",
    "云南": "M295,355 L335,360 L325,410 L285,395 Z", "广西": "M345,385 L380,385 L385,415 L350,415 Z",
    "江西": "M425,325 L445,325 L440,365 L420,365 Z", "海南": "M390,440 L410,440 L410,455 L390,455 Z",
    "台湾": "M465,370 L480,370 L475,400 L460,400 Z", "天津": "M430,195 L442,195 L442,205 L430,205 Z"
};

function renderAct2() {
    const tooltip = d3.select("#globalTooltip");
    const svg = d3.select("#offlineChinaMapSvg");

    // 清空 SVG 内容（确保幂等性）
    svg.selectAll("*").remove();

    let counts = Object.values(globalProcessedMetrics.provinceRanking);
    let maxVal = Math.max(...counts, 5);
    let colorScale = d3.scaleLinear().domain([0, Math.log10(maxVal)]).range(["#131e35", "#38bdf8"]);

    Object.entries(OFFLINE_GEO_DATA).forEach(([provName, pathStr]) => {
        let count = globalProcessedMetrics.provinceRanking[provName] || 0;
        let fillColor = count === 0 ? "#0d1527" : colorScale(Math.log10(count));

        svg.append("path")
            .attr("d", pathStr)
            .attr("class", "map-province-path")
            .attr("fill", fillColor)
            .on("mouseover", function (event) {
                d3.select(this).attr("fill", "#fbbf24");
                tooltip.style("opacity", 1).html(`<strong>${provName}份</strong><br/>申报样本量：${count} 件`);
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", function () {
                d3.select(this).attr("fill", fillColor);
                tooltip.style("opacity", 0);
            });
    });

    clearCanvas('chartAct2GlobalPie');
    let gbData = Object.entries(globalProcessedMetrics.globalRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);
    let dictName = { 'CN': '中国 (CN)', 'US': '美国 (US)', 'WO': '世界产权组织', 'EP': '欧洲专利局', 'JP': '日本特许厅' };

    loadedChartsInstances['chartAct2GlobalPie'] = new Chart(document.getElementById('chartAct2GlobalPie').getContext('2d'), {
        type: 'pie',
        data: {
            labels: gbData.map(x => dictName[x[0]] || x[0]),
            datasets: [{
                data: gbData.map(x => x[1]),
                backgroundColor: ['#38bdf8', '#818cf8', '#f59e0b', '#10b981', '#f43f5e'],
                borderWidth: 1,
                borderColor: '#0f172a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } },
                title: { display: true, text: '受理局确权对比分布', color: '#fff' }
            }
        }
    });

    clearCanvas('chartAct2GlobalBar');
    loadedChartsInstances['chartAct2GlobalBar'] = new Chart(document.getElementById('chartAct2GlobalBar').getContext('2d'), {
        type: 'bar',
        data: {
            labels: gbData.map(x => dictName[x[0]] || x[0]),
            datasets: [{
                data: gbData.map(x => x[1]),
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: { ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
