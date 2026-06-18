// Act 3 技术融合拓扑 - 技术分类共现网络
// 数据来自 type.csv，由 build_act3_tech_data.py 预处理

let act3TechData = null;

function loadAct3Data(callback) {
    if (act3TechData) {
        callback(act3TechData);
        return;
    }
    fetch('data/act3_tech_network.json')
        .then(r => r.json())
        .then(data => {
            act3TechData = data;
            console.log(`[Act3] 已加载技术共现网络：${Object.keys(data.techNodes).length} 节点，${Object.keys(data.techEdges).length} 边`);
            callback(data);
        })
        .catch(err => {
            console.error('[Act3] 加载技术共现数据失败:', err);
            callback({ techNodes: {}, techEdges: {}, stats: {} });
        });
}

function renderAct3() {
    loadAct3Data(function(data) {
        const svg = d3.select("#act3TechNetworkSvg");
        svg.selectAll("*").remove();

        const mainG = svg.append("g");

        // D3 缩放与拖拽平移
        svg.call(d3.zoom().scaleExtent([0.3, 5]).on("zoom", (event) => {
            mainG.attr("transform", event.transform);
        }));

        // Ctrl + 滚轮缩放，普通滚轮正常滚动页面
        const svgNode = svg.node();
        svg.on("wheel.zoom", null);
        svgNode.addEventListener("wheel", function(event) {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const [scaleMin, scaleMax] = [0.3, 5];
            const t = d3.zoomTransform(svgNode);
            const factor = Math.pow(2, -event.deltaY * 0.002);
            let newK = Math.max(scaleMin, Math.min(scaleMax, t.k * factor));
            const k = newK / t.k;
            if (Math.abs(k - 1) < 0.001) return;

            const [mx, my] = d3.pointer(event, svgNode);
            const newT = d3.zoomIdentity
                .translate(mx - k * (mx - t.x), my - k * (my - t.y))
                .scale(newK);

            svgNode.__zoom = newT;
            mainG.attr("transform", newT);
        }, { passive: false });

        // 创建悬浮提示
        let tooltip = d3.select("#techNetworkTooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "techNetworkTooltip")
                .style("position", "absolute")
                .style("background", "rgba(255,255,255,0.98)")
                .style("padding", "12px 16px")
                .style("border-radius", "8px")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.12)")
                .style("border", "1px solid rgba(5,150,105,0.2)")
                .style("font-size", "13px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("display", "none");
        }

        // 构建节点和边
        const techEntries = Object.entries(data.techNodes);
        const totalPatents = data.stats.total_patents || 1;

        // 计算阈值：专利数 >= 中位数的视为"核心"
        const freqs = techEntries.map(t => t[1]).sort((a, b) => a - b);
        const medianFreq = freqs[Math.floor(freqs.length / 2)];

        let nodes = techEntries.map((t, i) => ({
            id: t[0],
            size: t[1],
            isCore: t[1] >= medianFreq,
            group: t[1] >= medianFreq ? 0 : 1
        }));

        let links = [];
        let nodeSet = new Set(nodes.map(n => n.id));
        Object.entries(data.techEdges).forEach(([key, val]) => {
            let parts = key.split("|");
            if (nodeSet.has(parts[0]) && nodeSet.has(parts[1])) {
                links.push({ source: parts[0], target: parts[1], value: val });
            }
        });

        const W = svg.node().clientWidth || 900;
        const H = svg.node().clientHeight || 600;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(180))
            .force("charge", d3.forceManyBody().strength(-800).distanceMax(600))
            .force("x", d3.forceX(W / 2).strength(0.08))
            .force("y", d3.forceY(H / 2).strength(0.08))
            .force("collide", d3.forceCollide().radius(d => Math.max(25, Math.sqrt(d.size) * 2)));

        // 边粗细（根据共现次数）
        const maxCo = Math.max(...links.map(l => l.value), 1);

        // 预计算每条线的彩色色值（仅悬停时使用）
        function linkColoredStroke(d) {
            const ratio = d.value / maxCo;
            if (ratio > 0.6) return "rgba(225,29,72,0.6)";
            if (ratio > 0.3) return "rgba(5,150,105,0.5)";
            return "rgba(100,116,139,0.3)";
        }

        const link = mainG.append("g").selectAll("line").data(links).join("line")
            .attr("stroke", "rgba(100,116,139,0.2)")
            .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value / maxCo) * 8));

        // 节点
        const maxSize = Math.max(...nodes.map(n => n.size));
        const node = mainG.append("g").selectAll("g").data(nodes).join("g")
            .attr("cursor", "pointer");

        node.append("circle")
            .attr("r", d => Math.max(15, Math.min(40, 10 + Math.sqrt(d.size / maxSize) * 30)))
            .attr("fill", d => d.isCore ? "#d97706" : "#0284c7")
            .attr("fill-opacity", 0.85)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        // 节点标签（所有节点都显示）
        node.append("text")
            .attr("dy", 2)
            .attr("text-anchor", "middle")
            .text(d => {
                const name = d.id;
                return name.length > 6 ? name.substring(0, 6) : name;
            })
            .attr("fill", "#fff")
            .style("font-size", "9px")
            .style("font-weight", "600")
            .style("pointer-events", "none");

        // 节点下方的数量标签
        node.append("text")
            .attr("dy", d => Math.max(15, Math.min(40, 10 + Math.sqrt(d.size / maxSize) * 30)) + 12)
            .attr("text-anchor", "middle")
            .text(d => `${d.size}件`)
            .attr("fill", "#475569")
            .style("font-size", "8px")
            .style("pointer-events", "none");

        // 选中状态跟踪
        let selectedNode = null;
        let selectedNodeEl = null;

        function applyHighlight(d) {
            link.each(function(l) {
                const connected = (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id;
                d3.select(this)
                    .attr("stroke", connected ? linkColoredStroke(l) : "rgba(100,116,139,0.06)")
                    .attr("stroke-opacity", connected ? 1 : 0.4);
            });
        }

        function resetHighlight() {
            link.attr("stroke", "rgba(100,116,139,0.2)").attr("stroke-opacity", 1);
            node.selectAll("circle")
                .attr("stroke", "#fff").attr("stroke-width", 1.5);
        }

        // 交互事件
        node.on("click", function (event, d) {
            // 点击同一节点则取消选中
            if (selectedNode && selectedNode.id === d.id) {
                selectedNode = null;
                selectedNodeEl = null;
                resetHighlight();
                document.getElementById("techInsightContent").innerHTML = `
                    <span style="color:var(--text-secondary);">点击网络中的任意节点查看技术详情...</span>
                `;
                return;
            }

            // 恢复之前选中节点的样式
            if (selectedNodeEl) {
                d3.select(selectedNodeEl).select("circle")
                    .attr("stroke", "#fff").attr("stroke-width", 1.5);
            }

            selectedNode = d;
            selectedNodeEl = this;
            d3.select(this).select("circle")
                .attr("stroke", "#1e293b").attr("stroke-width", 3);
            applyHighlight(d);

            let linkedNodes = links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            );
            let linkedCount = linkedNodes.length;
            let totalCo = linkedNodes.reduce((s, l) => s + l.value, 0);

            let linkedTechs = linkedNodes.map(l => {
                const other = (l.source.id || l.source) === d.id ? (l.target.id || l.target) : (l.source.id || l.source);
                return `${other}(${l.value})`;
            }).slice(0, 5).join("、");

            document.getElementById("techInsightContent").innerHTML = `
                <div style='background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid ${d.isCore ? "#d97706" : "#0284c7"}'>
                    <strong>选中分类标签：</strong><span style='color:${d.isCore ? "#d97706" : "#0284c7"}; font-weight:bold;'>${d.id}</span><br/><br/>
                    <strong>统计热度：</strong>本批数据包含 <span style='color:#d97706; font-weight:bold;'>${d.size}</span> 件资产<br/><br/>
                    <strong>技术衍生交集：</strong>与拓扑图中其他 <span style='color:#059669'>${linkedCount}</span> 个细分技术组存在深度跨界协同<br/>
                    <strong>共现强度总和：</strong>${totalCo}<br/><br/>
                    <strong>Top 关联技术：</strong><span style='font-size:11px; color:#475569;'>${linkedTechs || "无"}</span>
                </div>
            `;
        })
        .on("mouseover", function (event, d) {
            let linkedCount = links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            ).length;

            tooltip.style("display", "block")
                .html(`
                    <div style="font-weight:bold; color:#1e293b; margin-bottom:6px; font-size:13px;">${d.id}</div>
                    <div style="color:#475569; margin-bottom:3px;"><strong>专利数：</strong>${d.size} 件</div>
                    <div style="color:#475569;"><strong>关联技术：</strong>${linkedCount} 个</div>
                    <div style="color:#475569; font-size:11px; margin-top:4px;">${d.isCore ? "核心高频研发" : "边缘交叉创新"}</div>
                `);

            // 没有选中节点时才临时高亮
            if (!selectedNode) {
                d3.select(this).select("circle")
                    .attr("stroke", "#1e293b").attr("stroke-width", 3);
                applyHighlight(d);
            }
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.style("display", "none");
            // 没有选中节点时才重置
            if (!selectedNode) {
                d3.select(this).select("circle")
                    .attr("stroke", "#fff").attr("stroke-width", 1.5);
                link.attr("stroke", "rgba(100,116,139,0.2)").attr("stroke-opacity", 1);
            } else if (selectedNode.id !== d.id) {
                // 移出的不是选中节点，不干扰选中状态
            } else {
                // 移出选中节点，保持高亮
                d3.select(this).select("circle")
                    .attr("stroke", "#1e293b").attr("stroke-width", 3);
            }
        });

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // 首次加载时显示默认统计
        if (!document.getElementById("techInsightContent").querySelector("div")) {
            document.getElementById("techInsightContent").innerHTML = `
                <div style='background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid #059669'>
                    <strong>数据概览：</strong><br/>
                    本批数据共 <span style='color:#d97706; font-weight:bold;'>${totalPatents}</span> 件专利，
                    涵盖 <span style='color:#059669; font-weight:bold;'>${nodes.length}</span> 个技术分类，
                    形成 <span style='color:#6366f1; font-weight:bold;'>${links.length}</span> 条共现关系。
                </div>
            `;
        }
    });
}
