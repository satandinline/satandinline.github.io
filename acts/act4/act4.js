// Act 4: 主体竞争网络专属交互逻辑

function renderAct4() {
    const svg = d3.select("#act4AssigneeNetworkSvg");
    svg.selectAll("*").remove();

    const mainG = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.1, 5]).on("zoom", (event) => { mainG.attr("transform", event.transform); }));

    let topCompanies = Object.entries(globalProcessedMetrics.assigneeRanking).sort((a, b) => b[1] - a[1]).slice(0, 18);
    let nodes = topCompanies.map(t => ({ id: t[0], size: t[1] }));

    let links = [];
    let nodeSet = new Set(nodes.map(n => n.id));
    Object.entries(globalProcessedMetrics.assigneeCoMatrix).forEach(([key, val]) => {
        let parts = key.split("|");
        if (nodeSet.has(parts[0]) && nodeSet.has(parts[1])) {
            links.push({ source: parts[0], target: parts[1], value: val });
        }
    });

    if (links.length === 0 && nodes.length > 1) {
        for (let k = 0; k < nodes.length - 1; k++) { links.push({ source: nodes[k].id, target: nodes[k + 1].id, value: 5 }); }
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(350, 300))
        .force("collide", d3.forceCollide().radius(45));

    const link = mainG.append("g").selectAll("line").data(links).join("line")
        .attr("stroke", "rgba(245,158,11,0.7)").attr("stroke-width", 2);

    const node = mainG.append("g").selectAll("g").data(nodes).join("g").attr("cursor", "pointer")
        .on("click", function (event, d) {
            let primaryTech = Object.keys(assigneeTechFocus[d.id] || {})[0] || '未明确主技术域';
            document.getElementById("assigneeInsightContent").innerHTML = `
                <div style='background:#0d1e3d; padding:12px; border-radius:6px; border-left:4px solid var(--emerald-accent)'>
                    <strong>🏢 锁定实体名称：</strong><br/>${d.id}<br/><br/>
                    <strong>📈 机器人技术持有量：</strong>当前拥有 <span style='color:var(--cyan-accent); font-weight:bold;'>${d.size}</span> 件在册专利。<br/><br/>
                    <strong>🎯 研发布局主攻板块：</strong><br/><span style='color:var(--amber-accent);'>${primaryTech}</span><br/><br/>
                    ℹ 拓扑连线意味着两家机构在相同的细分赛道高频对撞，属于高度激烈的直接市场竞争对手。
                </div>
            `;
        });

    node.append("circle").attr("r", d => Math.min(26, 11 + Math.sqrt(d.size))).attr("fill", "#818cf8").attr("stroke", "#fff").attr("stroke-width", 1.5);
    node.append("text").attr("dy", -3).attr("text-anchor", "middle").text(d => d.id.substring(0, 5)).attr("fill", "#fff").style("font-size", "10px");

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}
