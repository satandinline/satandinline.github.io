// Act 4: 主体竞争网络（申请人协作网络）
// 数据来源：data/act3_applicant_network.json（由 patent_exploded_split.csv 预处理生成）

let act4NetworkData = null;

function loadAct4Data(callback) {
    if (act4NetworkData) {
        callback(act4NetworkData);
        return;
    }
    fetch('data/act3_applicant_network.json')
        .then(r => r.json())
        .then(data => {
            act4NetworkData = data;
            console.log(`[Act4] 已加载申请人网络：${Object.keys(data.applicantNetwork).length} 节点，${Object.keys(data.applicantCoMatrix).length} 边`);
            callback(data);
        })
        .catch(err => {
            console.error('[Act4] 加载申请人网络数据失败:', err);
            callback({ applicantNetwork: {}, applicantCoMatrix: {} });
        });
}

function renderAct4() {
    loadAct4Data(function(data) {
        const svg = d3.select("#act4AssigneeNetworkSvg");
        svg.selectAll("*").remove();

        const mainG = svg.append("g");
        svg.call(d3.zoom().scaleExtent([0.05, 8]).on("zoom", (event) => {
            mainG.attr("transform", event.transform);
        }));

        // 创建悬浮提示
        let tooltip = d3.select("#assigneeNetworkTooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "assigneeNetworkTooltip")
                .style("position", "absolute")
                .style("background", "rgba(255,255,255,0.98)")
                .style("padding", "12px 16px")
                .style("border-radius", "8px")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
                .style("border", "1px solid rgba(5,150,105,0.2)")
                .style("font-size", "13px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("display", "none");
        }

        // 构建节点和边
        const applicantEntries = Object.entries(data.applicantNetwork).sort((a, b) => b[1] - a[1]);
        let nodes = applicantEntries.map((t, i) => ({
            id: t[0],
            size: t[1],
            group: i % 4
        }));

        let links = [];
        let nodeSet = new Set(nodes.map(n => n.id));
        Object.entries(data.applicantCoMatrix).forEach(([key, val]) => {
            let parts = key.split("|");
            if (nodeSet.has(parts[0]) && nodeSet.has(parts[1])) {
                links.push({ source: parts[0], target: parts[1], value: val });
            }
        });

        if (links.length === 0 && nodes.length > 1) {
            for (let k = 0; k < nodes.length - 1; k++)
                links.push({ source: nodes[k].id, target: nodes[k + 1].id, value: 1 });
        }

        const W = svg.node().clientWidth || 900;
        const H = svg.node().clientHeight || 600;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-120))
            .force("center", d3.forceCenter(W / 2, H / 2))
            .force("collide", d3.forceCollide().radius(d => Math.max(8, Math.sqrt(d.size) * 2)));

        // 边粗细
        const maxCo = Math.max(...links.map(l => l.value), 1);
        const link = mainG.append("g").selectAll("line").data(links).join("line")
            .attr("stroke", d => d.value > maxCo * 0.5 ? "rgba(225,29,72,0.7)" : "rgba(5,150,105,0.25)")
            .attr("stroke-width", d => Math.max(0.5, Math.sqrt(d.value / maxCo) * 4));

        // 节点
        const maxSize = Math.max(...nodes.map(n => n.size));
        const node = mainG.append("g").selectAll("g").data(nodes).join("g")
            .attr("cursor", "pointer");

        node.append("circle")
            .attr("r", d => Math.max(5, Math.min(25, 4 + Math.sqrt(d.size / maxSize) * 20)))
            .attr("fill", d => ["#059669", "#0284c7", "#6366f1", "#d97706"][d.group])
            .attr("fill-opacity", 0.85)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.8);

        // Top 20 大节点标签
        node.filter((d, i) => i < 20)
            .append("text")
            .attr("dy", -2)
            .attr("text-anchor", "middle")
            .text(d => {
                const name = d.id;
                return name.length > 6 ? name.substring(0, 6) + '…' : name;
            })
            .attr("fill", "#f0f0f0")
            .style("font-size", "8px")
            .style("font-weight", "600")
            .style("pointer-events", "none");

        // 交互事件
        node.on("click", function (event, d) {
            let linkedNodes = links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            );
            let linkedCount = linkedNodes.length;
            let totalCo = linkedNodes.reduce((s, l) => s + l.value, 0);

            document.getElementById("assigneeInsightContent").innerHTML = `
                <div style='background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid #059669'>
                    <strong>申请人：</strong>${d.id}<br/><br/>
                    <strong>专利数量：</strong><span style='color:#d97706; font-weight:bold;'>${d.size}</span> 件<br/><br/>
                    <strong>技术竞争对手：</strong>与图中其他 <span style='color:#059669'>${linkedCount}</span> 个申请人存在技术重叠<br/>
                    <strong>共现强度总和：</strong>${totalCo}
                </div>
            `;
        })
        .on("mouseover", function (event, d) {
            let linkedCount = links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            ).length;
            tooltip.style("display", "block")
                .html(`
                    <div style="font-weight:bold; color:#0f172a; margin-bottom:6px; font-size:13px;">${d.id}</div>
                    <div style="color:#64748b; margin-bottom:3px;"><strong>专利：</strong>${d.size} 件</div>
                    <div style="color:#64748b;"><strong>关联申请人：</strong>${linkedCount} 个</div>
                `);
            d3.select(this).select("circle")
                .attr("stroke", "#0f172a").attr("stroke-width", 2.5);
            link.attr("stroke-opacity", l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id ? 1 : 0.1
            );
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
            d3.select(this).select("circle")
                .attr("stroke", "#fff").attr("stroke-width", 0.8);
            link.attr("stroke-opacity", 1);
        });

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    });
}
