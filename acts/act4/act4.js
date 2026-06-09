// Act 4 主体竞争网络 - 申请人协作网络
// 数据来自 patent_explode.csv，由 build_act3_data.py 预处理

let act4NetworkData = null;

function loadAct4Data(callback) {
    if (act4NetworkData) {
        callback(act4NetworkData);
        return;
    }
    fetch('data/act4_applicant_network.json')
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

        // D3 缩放与拖拽平移
        svg.call(d3.zoom().scaleExtent([0.05, 8]).on("zoom", (event) => {
            mainG.attr("transform", event.transform);
        }));

        // Ctrl + 滚轮缩放，普通滚轮正常滚动页面
        const svgNode = svg.node();
        svg.on("wheel.zoom", null);
        svgNode.addEventListener("wheel", function(event) {
            if (!event.ctrlKey) return;
            event.preventDefault();

            const [scaleMin, scaleMax] = [0.05, 8];
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
        let tooltip = d3.select("#assigneeNetworkTooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "assigneeNetworkTooltip")
                .style("position", "absolute")
                .style("background", "rgba(255,255,255,0.98)")
                .style("padding", "12px 16px")
                .style("border-radius", "8px")
                .style("box-shadow", "0 4px 12px rgba(0,0,0,0.12)")
                .style("border", "1px solid rgba(2,132,199,0.2)")
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
            .force("link", d3.forceLink(links).id(d => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-350).distanceMax(600))
            .force("x", d3.forceX(W / 2).strength(0.12))
            .force("y", d3.forceY(H / 2).strength(0.12))
            .force("collide", d3.forceCollide().radius(d => Math.max(12, Math.sqrt(d.size) * 2)));

        // 边粗细
        const maxCo = Math.max(...links.map(l => l.value), 1);

        // 预计算每条线的彩色色值（仅悬停时使用）
        function linkColoredStroke(d) {
            return d.value > maxCo * 0.5 ? "rgba(225,29,72,0.7)" : "rgba(5,150,105,0.35)";
        }

        const link = mainG.append("g").selectAll("line").data(links).join("line")
            .attr("stroke", "rgba(100,116,139,0.18)")
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
            .attr("fill", "#1e293b")
            .style("font-size", "8px")
            .style("font-weight", "600")
            .style("pointer-events", "none");

        // 选中状态跟踪
        let selectedNode = null;
        let selectedNodeEl = null;

        function applyHighlight(d) {
            link.each(function(l) {
                const connected = (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id;
                d3.select(this)
                    .attr("stroke", connected ? linkColoredStroke(l) : "rgba(100,116,139,0.05)")
                    .attr("stroke-opacity", connected ? 1 : 0.4);
            });
        }

        function resetHighlight() {
            link.attr("stroke", "rgba(100,116,139,0.18)").attr("stroke-opacity", 1);
            node.selectAll("circle")
                .attr("stroke", "#fff").attr("stroke-width", 0.8);
        }

        // 交互事件
        node.on("click", function (event, d) {
            // 点击同一节点则取消选中
            if (selectedNode && selectedNode.id === d.id) {
                selectedNode = null;
                selectedNodeEl = null;
                resetHighlight();
                document.getElementById("assigneeInsightContent").innerHTML = `
                    <span style="color:var(--text-secondary);">点击网络中的任意节点查看申请人详情...</span>
                `;
                return;
            }

            // 恢复之前选中节点的样式
            if (selectedNodeEl) {
                d3.select(selectedNodeEl).select("circle")
                    .attr("stroke", "#fff").attr("stroke-width", 0.8);
            }

            selectedNode = d;
            selectedNodeEl = this;
            d3.select(this).select("circle")
                .attr("stroke", "#1e293b").attr("stroke-width", 2.5);
            applyHighlight(d);

            let linkedNodes = links.filter(l =>
                (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
            );
            let linkedCount = linkedNodes.length;
            let totalCo = linkedNodes.reduce((s, l) => s + l.value, 0);
            let focus = (data.applicantFocus && data.applicantFocus[d.id]) || '暂无分析数据';

            const relations = linkedNodes.map(l => {
                const otherId = (l.source.id || l.source) === d.id
                    ? (l.target.id || l.target)
                    : (l.source.id || l.source);
                return { name: otherId, strength: l.value };
            }).sort((a, b) => b.strength - a.strength);

            const maxCo = Math.max(...links.map(l => l.value), 1);
            const relationListHtml = relations.slice(0, 10).map((r, i) => {
                const pct = Math.round((r.strength / maxCo) * 100);
                const barColor = pct > 60 ? '#e11d48' : pct > 30 ? '#059669' : '#94a3b8';
                return `<div style='display:flex; align-items:center; gap:6px; margin:3px 0;'>
                    <span style='font-size:11px; color:#475569; width:14px; flex-shrink:0; text-align:right;'>${i + 1}</span>
                    <span style='font-size:12px; color:#1e293b; min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' title='${r.name}'>${r.name}</span>
                    <div style='width:60px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; flex-shrink:0;'>
                        <div style='width:${pct}%; height:100%; background:${barColor}; border-radius:3px;'></div>
                    </div>
                    <span style='font-size:10px; color:#475569; width:22px; text-align:right; flex-shrink:0;'>${r.strength}</span>
                </div>`;
            }).join('');

            const moreCount = relations.length > 10 ? relations.length - 10 : 0;

            document.getElementById("assigneeInsightContent").innerHTML = `
                <div style='background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid #059669'>
                    <strong>申请人：</strong>${d.id}<br/><br/>
                    <strong>专利数量：</strong><span style='color:#d97706; font-weight:bold;'>${d.size}</span> 件<br/><br/>
                    <strong>技术竞争对手：</strong>与图中其他 <span style='color:#059669'>${linkedCount}</span> 个申请人存在技术重叠<br/>
                    <strong>共现强度总和：</strong>${totalCo}
                </div>
                <div style='margin-top:12px; background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid #d97706'>
                    <strong style='color:#d97706;'>主攻方向：</strong><br/>
                    <p style='font-size:12px; color:#475569; margin:8px 0 0; line-height:1.6;'>${focus}</p>
                </div>
                <div style='margin-top:12px; background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid #0284c7'>
                    <strong style='color:#0284c7;'>技术竞争关系（Top ${Math.min(10, relations.length)}）：</strong>
                    <div style='margin-top:8px;'>${relationListHtml}</div>
                    ${moreCount > 0 ? `<div style='font-size:11px; color:#64748b; margin-top:6px; text-align:center;'>还有 ${moreCount} 个关联申请人…</div>` : ''}
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
                    <div style="color:#475569; margin-bottom:3px;"><strong>专利：</strong>${d.size} 件</div>
                    <div style="color:#475569;"><strong>关联申请人：</strong>${linkedCount} 个</div>
                `);

            // 没有选中节点时才临时高亮
            if (!selectedNode) {
                d3.select(this).select("circle")
                    .attr("stroke", "#1e293b").attr("stroke-width", 2.5);
                applyHighlight(d);
            }
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
            tooltip.style("display", "none");
            if (!selectedNode) {
                d3.select(this).select("circle")
                    .attr("stroke", "#fff").attr("stroke-width", 0.8);
                link.attr("stroke", "rgba(100,116,139,0.18)").attr("stroke-opacity", 1);
            } else if (selectedNode.id !== d.id) {
                // 移出的不是选中节点，不干扰
            } else {
                // 移出选中节点，保持高亮
                d3.select(this).select("circle")
                    .attr("stroke", "#1e293b").attr("stroke-width", 2.5);
            }
        });

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    });
}
