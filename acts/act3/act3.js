// Act 3: 技术融合拓扑专属交互逻辑

function renderAct3() {
    const svg = d3.select("#act3TechNetworkSvg");
    svg.selectAll("*").remove();

    const mainG = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.1, 5]).on("zoom", (event) => { mainG.attr("transform", event.transform); }));

    // 创建悬浮提示
    const tooltip = d3.select("body").append("div")
        .attr("id", "techNetworkTooltip")
        .style("position", "absolute")
        .style("background", "rgba(255,255,255,0.98)")
        .style("padding", "12px 16px")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
        .style("border", "1px solid rgba(2,132,199,0.2)")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("display", "none");

    let topTechs = Object.entries(globalProcessedMetrics.techThemeClustering).sort((a, b) => b[1] - a[1]).slice(0, 22);
    let nodes = topTechs.map((t, i) => ({ id: t[0], size: t[1], group: i % 4 }));

    let links = [];
    let nodeSet = new Set(nodes.map(n => n.id));
    Object.entries(globalProcessedMetrics.techCoOccurrenceMatrix).forEach(([key, val]) => {
        let parts = key.split("|");
        if (nodeSet.has(parts[0]) && nodeSet.has(parts[1])) {
            links.push({ source: parts[0], target: parts[1], value: val });
        }
    });

    if (links.length === 0 && nodes.length > 1) {
        for (let k = 0; k < nodes.length - 1; k++) links.push({ source: nodes[k].id, target: nodes[k + 1].id, value: 2 });
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(130))
        .force("charge", d3.forceManyBody().strength(-240))
        .force("center", d3.forceCenter(350, 300))
        .force("collide", d3.forceCollide().radius(35));

    const link = mainG.append("g").selectAll("line").data(links).join("line")
        .attr("stroke", d => d.value > 2 ? "rgba(225,29,72,0.8)" : "rgba(2,132,199,0.3)")
        .attr("stroke-width", d => Math.max(1.5, Math.sqrt(d.value)));

    const node = mainG.append("g").selectAll("g").data(nodes).join("g").attr("cursor", "pointer")
        .on("click", function (event, d) {
            let linkedTotal = links.filter(l => l.source.id === d.id || l.target.id === d.id).length;
            document.getElementById("techInsightContent").innerHTML = `
                <div style='background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid var(--cyan-accent)'>
                    <strong>选中分类标签：</strong><br/>${d.id}<br/><br/>
                    <strong>统计热度：</strong>本批数据包含 <span style='color:var(--amber-accent); font-weight:bold;'>${d.size}</span> 件资产。<br/><br/>
                    <strong>技术衍生交集：</strong>与拓扑图中其他 <span style='color:var(--cyan-accent)'>${linkedTotal}</span> 个细分技术组存在深度跨界协同。
                </div>
            `;
        })
        .on("mouseover", function (event, d) {
            let linkedTotal = links.filter(l => l.source.id === d.id || l.target.id === d.id).length;
            tooltip.style("display", "block")
                .html(`
                    <div style="font-weight:bold; color:#0f172a; margin-bottom:8px; font-size:14px;">${d.id}</div>
                    <div style="color:#64748b; margin-bottom:4px;"><strong>热度：</strong>${d.size} 件</div>
                    <div style="color:#64748b;"><strong>关联技术：</strong>${linkedTotal} 个</div>
                `);
            // 高亮节点
            d3.select(this).select("circle")
                .attr("stroke", "#0f172a")
                .attr("stroke-width", 2);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
            // 恢复节点样式
            d3.select(this).select("circle")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1);
        });

    node.append("circle").attr("r", d => Math.min(22, 9 + Math.sqrt(d.size))).attr("fill", d => ["#0284c7", "#059669", "#6366f1", "#d97706"][d.group]).attr("stroke", "#fff").attr("stroke-width", 1);

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}
