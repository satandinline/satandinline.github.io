// 主体竞争网络模块（最终修复版）
window.act4Module = {
    simulation: null,

    init(options) {
        const { globalData, assigneeTechFocus, globalTooltip } = options;
        // 关键修复：等待DOM完全渲染后再获取SVG尺寸
        setTimeout(() => this._renderAssigneeNetwork(globalData, assigneeTechFocus, globalTooltip), 50);
    },

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        d3.select("#act4AssigneeNetworkSvg").selectAll("*").remove();
    },

    _renderAssigneeNetwork(globalData, assigneeTechFocus, tooltip) {
        const svg = d3.select("#act4AssigneeNetworkSvg");
        svg.selectAll("*").remove();

        // 强制获取实际渲染后的尺寸
        const container = svg.node().parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.attr("width", width).attr("height", height);

        const mainG = svg.append("g");
        svg.call(d3.zoom()
            .scaleExtent([0.2, 4])
            .on("zoom", (event) => mainG.attr("transform", event.transform))
        );

        // 提取TOP20竞争主体
        const topAssignees = Object.entries(globalData.assigneeRanking)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        const nodes = topAssignees.map((a, i) => ({
            id: a[0], size: a[1], group: i % 5
        }));

        // 构建竞争连线
        const links = [];
        const nodeSet = new Set(nodes.map(n => n.id));
        Object.entries(globalData.assigneeCoMatrix).forEach(([key, val]) => {
            const parts = key.split("|");
            if (nodeSet.has(parts[0]) && nodeSet.has(parts[1])) {
                links.push({ source: parts[0], target: parts[1], value: val });
            }
        });

        // 优化力导向图参数，让节点分布更均匀
        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(180).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-450))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(40)); // 增加碰撞检测，防止节点重叠

        // 绘制连线
        const link = mainG.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", d => d.value > 10 ? "#f97316" : "#10b981")
            .attr("stroke-width", d => Math.sqrt(d.value) * 1.2);

        // 绘制节点
        const node = mainG.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", d => Math.sqrt(d.size) + 7)
            .attr("fill", d => ["#10b981", "#38bdf8", "#818cf8", "#f59e0b", "#f43f5e"][d.group])
            .call(d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = Math.max(40, Math.min(width - 40, event.x));
                    d.fy = Math.max(40, Math.min(height - 40, event.y));
                })
                .on("end", (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );

        // 绘制节点标签（截断过长名称）
        const label = mainG.append("g")
            .selectAll("text")
            .data(nodes)
            .enter().append("text")
            .text(d => d.id.length > 6 ? d.id.substring(0, 6) + "..." : d.id)
            .attr("font-size", 11)
            .attr("fill", "#e2e8f0")
            .attr("dx", 15)
            .attr("dy", 4);

        // 力导向图更新
        this.simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x = Math.max(40, Math.min(width - 40, d.x)))
                .attr("cy", d => d.y = Math.max(40, Math.min(height - 40, d.y)));

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        });

        // 节点交互
        node.on("mouseover", function (event, d) {
            const topTech = Object.keys(assigneeTechFocus[d.id] || {})
                .sort((a, b) => assigneeTechFocus[d.id][b] - assigneeTechFocus[d.id][a])[0] || "无";

            tooltip.style("opacity", 1)
                .html(`<strong>竞争主体</strong><br/>${d.id}<br/>专利数：${d.size} 件<br/>核心技术：${topTech}`);
            d3.select(this).attr("stroke", "#fbbf24").attr("stroke-width", 3);
        })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseleave", function () {
                tooltip.style("opacity", 0);
                d3.select(this).attr("stroke", null).attr("stroke-width", 0);
            });
    }
};