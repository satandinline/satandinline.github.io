// Act 6: 技术演进桑基图（年份区间 → 研究主题 → IPC 赛道）
// 使用 D3.js 自定义布局绘制

function renderAct6() {
    var m = globalProcessedMetrics;
    if (!m.sankeyPeriodTopic || !m.sankeyTopicIpc) return;

    // ── 1. 汇总各层节点总量，筛选 Top N ──────────────────
    var periodOrder = ['2000-2010', '2011-2015', '2016-2019', '2020-2024'];
    var periodSet = new Set(periodOrder);

    var topicTotals = {};
    Object.entries(m.sankeyPeriodTopic).forEach(function(e) {
        var parts = e[0].split('|');
        if (!periodSet.has(parts[0])) return;
        topicTotals[parts[1]] = (topicTotals[parts[1]] || 0) + e[1];
    });

    var ipcTotals = {};
    Object.entries(m.sankeyTopicIpc).forEach(function(e) {
        var parts = e[0].split('|');
        ipcTotals[parts[1]] = (ipcTotals[parts[1]] || 0) + e[1];
    });

    // 只保留有流量的年份区间
    var usedPeriods = [];
    periodOrder.forEach(function(p) {
        var hasData = Object.keys(m.sankeyPeriodTopic).some(function(k) {
            return k.startsWith(p + '|');
        });
        if (hasData) usedPeriods.push(p);
    });

    var topTopics = Object.entries(topicTotals).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 14).map(function(e) { return e[0]; });
    var topIpcs = Object.entries(ipcTotals).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10).map(function(e) { return e[0]; });

    var topicSet = new Set(topTopics);
    var ipcSet = new Set(topIpcs);

    if (usedPeriods.length === 0 || topicSet.size === 0 || ipcSet.size === 0) return;

    // ── 2. 构建节点和链路 ────────────────────────────
    var nodes = [];
    var nodeMap = {};

    usedPeriods.forEach(function(p) {
        var n = { id: 'P_' + p, name: p, layer: 0, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });
    topTopics.forEach(function(t) {
        var n = { id: 'T_' + t, name: t, layer: 1, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });
    topIpcs.forEach(function(c) {
        var n = { id: 'I_' + c, name: c, layer: 2, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });

    var links = [];
    var MIN_LINK = 3;

    // Layer 0→1: 年份区间 → 研究主题
    Object.entries(m.sankeyPeriodTopic).forEach(function(e) {
        var parts = e[0].split('|');
        var period = parts[0], topic = parts[1];
        if (!periodSet.has(period) || !topicSet.has(topic) || e[1] < MIN_LINK) return;
        links.push({ source: 'P_' + period, target: 'T_' + topic, value: e[1] });
    });

    // Layer 1→2: 研究主题 → IPC赛道
    Object.entries(m.sankeyTopicIpc).forEach(function(e) {
        var parts = e[0].split('|');
        var topic = parts[0], ipc = parts[1];
        if (!topicSet.has(topic) || !ipcSet.has(ipc) || e[1] < MIN_LINK) return;
        links.push({ source: 'T_' + topic, target: 'I_' + ipc, value: e[1] });
    });

    // 计算节点总值
    links.forEach(function(lk) {
        if (nodeMap[lk.source]) nodeMap[lk.source].value += lk.value;
        if (nodeMap[lk.target]) nodeMap[lk.target].value += lk.value;
    });

    // 移除孤立节点
    var connectedIds = new Set();
    links.forEach(function(lk) { connectedIds.add(lk.source); connectedIds.add(lk.target); });
    nodes = nodes.filter(function(n) { return connectedIds.has(n.id); });

    // 分层
    var layers = [
        nodes.filter(function(n) { return n.layer === 0; }),
        nodes.filter(function(n) { return n.layer === 1; }),
        nodes.filter(function(n) { return n.layer === 2; })
    ];

    if (layers[0].length === 0 || layers[1].length === 0 || layers[2].length === 0) return;

    // ── 3. 桑基图布局计算 ────────────────────────────
    var container = document.getElementById('act6SankeyContainer');
    var W = container.clientWidth || 900;
    var H = container.clientHeight || 620;
    var margin = { top: 45, bottom: 20, left: 80, right: 80 };
    var nodeW = 16;
    var nodePad = 5;

    var xPositions = [
        margin.left,
        (W - margin.left - margin.right) / 2 + margin.left - nodeW / 2,
        W - margin.right - nodeW
    ];

    layers.forEach(function(layer, li) {
        // layer 0 按年份升序，layer 1/2 按 value 降序
        if (li === 0) layer.sort(function(a, b) { return a.name.localeCompare(b.name); });
        else layer.sort(function(a, b) { return b.value - a.value; });

        var totalVal = layer.reduce(function(s, n) { return s + n.value; }, 0);
        var availH = H - margin.top - margin.bottom - (layer.length - 1) * nodePad;
        if (availH < 1) availH = 1;
        var y = margin.top;
        layer.forEach(function(node) {
            var h = totalVal > 0 ? Math.max(4, (node.value / totalVal) * availH) : 4;
            node.x0 = xPositions[li];
            node.x1 = node.x0 + nodeW;
            node.y0 = y;
            node.y1 = y + h;
            y += h + nodePad;
        });
    });

    // 计算链路 y 位置
    var srcOff = {};
    var tgtOff = {};
    nodes.forEach(function(n) { srcOff[n.id] = 0; tgtOff[n.id] = 0; });

    var links01 = links.filter(function(l) { return nodeMap[l.source] && nodeMap[l.source].layer === 0; })
        .sort(function(a, b) {
            var sa = nodeMap[a.source], sb = nodeMap[b.source];
            var ta = nodeMap[a.target], tb = nodeMap[b.target];
            return (sa.y0 - sb.y0) || (ta.y0 - tb.y0);
        });
    var links12 = links.filter(function(l) { return nodeMap[l.source] && nodeMap[l.source].layer === 1; })
        .sort(function(a, b) {
            var sa = nodeMap[a.source], sb = nodeMap[b.source];
            var ta = nodeMap[a.target], tb = nodeMap[b.target];
            return (sa.y0 - sb.y0) || (ta.y0 - tb.y0);
        });

    var orderedLinks = links01.concat(links12);
    orderedLinks.forEach(function(link) {
        var sn = nodeMap[link.source];
        var tn = nodeMap[link.target];
        var sh = sn.y1 - sn.y0;
        var th = tn.y1 - tn.y0;
        var sw = sh > 0 ? (link.value / sn.value) * sh : 1;
        var tw = th > 0 ? (link.value / tn.value) * th : 1;
        link.y0 = sn.y0 + srcOff[link.source] + sw / 2;
        link.y1 = tn.y0 + tgtOff[link.target] + tw / 2;
        link.w0 = sw;
        link.w1 = tw;
        link.sourceNode = sn;
        link.targetNode = tn;
        srcOff[link.source] += sw;
        tgtOff[link.target] += tw;
    });

    // ── 4. D3 渲染 ────────────────────────────────────
    var svg = d3.select('#act6SankeySvg');
    svg.selectAll('*').remove();
    var tooltip = d3.select('#globalTooltip');

    // 年份区间颜色：从浅到深的蓝绿梯度
    var periodColors = {
        '2000-2010': '#64748b',
        '2011-2015': '#0891b2',
        '2016-2019': '#0284c7',
        '2020-2024': '#1e40af'
    };

    var topicColor = '#64748b';
    var ipcColors = d3.scaleOrdinal()
        .domain(topIpcs)
        .range(['#059669', '#0284c7', '#d97706', '#e11d48', '#7c3aed', '#0891b2', '#65a30d', '#db2777', '#4f46e5', '#ea580c']);

    function nodeColor(node) {
        if (node.layer === 0) return periodColors[node.name] || '#64748b';
        if (node.layer === 1) return topicColor;
        return ipcColors(node.name);
    }

    function linkColor(link) {
        if (link.targetNode.layer === 1) return periodColors[link.sourceNode.name] || topicColor;
        return ipcColors(link.targetNode.name);
    }

    function linkPath(d) {
        var x0 = nodeMap[d.source].x1;
        var x1 = nodeMap[d.target].x0;
        var mx = (x0 + x1) / 2;
        return 'M' + x0 + ',' + (d.y0 - d.w0 / 2) +
            'C' + mx + ',' + (d.y0 - d.w0 / 2) + ' ' + mx + ',' + (d.y1 - d.w1 / 2) + ' ' + x1 + ',' + (d.y1 - d.w1 / 2) +
            'L' + x1 + ',' + (d.y1 + d.w1 / 2) +
            'C' + mx + ',' + (d.y1 + d.w1 / 2) + ' ' + mx + ',' + (d.y0 + d.w0 / 2) + ' ' + x0 + ',' + (d.y0 + d.w0 / 2) +
            'Z';
    }

    // 绘制链路
    svg.selectAll('.sankey-link')
        .data(orderedLinks)
        .join('path')
        .attr('class', 'sankey-link')
        .attr('d', linkPath)
        .attr('fill', function(d) { return linkColor(d); })
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill-opacity', 0.5);
            tooltip.style('opacity', 1)
                .html('<strong>' + d.sourceNode.name + ' → ' + d.targetNode.name + '</strong><br/>专利数：' + d.value + ' 件');
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 18) + 'px');
        })
        .on('mouseleave', function() {
            d3.select(this).attr('fill-opacity', 0.25);
            tooltip.style('opacity', 0);
        });

    // 绘制节点
    var nodeGroups = svg.selectAll('.sankey-node-group')
        .data(nodes)
        .join('g')
        .attr('class', 'sankey-node-group');

    nodeGroups.append('rect')
        .attr('class', 'sankey-node')
        .attr('x', function(d) { return d.x0; })
        .attr('y', function(d) { return d.y0; })
        .attr('width', nodeW)
        .attr('height', function(d) { return Math.max(2, d.y1 - d.y0); })
        .attr('fill', function(d) { return nodeColor(d); })
        .attr('rx', 2)
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1)
                .html('<strong>' + d.name + '</strong><br/>流量：' + d.value + ' 件');
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 18) + 'px');
        })
        .on('mouseleave', function() {
            tooltip.style('opacity', 0);
        });

    // 节点标签
    nodeGroups.each(function(d) {
        var g = d3.select(this);
        var isLeft = d.layer === 0;
        var tx, anchor;
        if (isLeft) { tx = d.x0 - 6; anchor = 'end'; }
        else { tx = d.x1 + 6; anchor = 'start'; }
        var ty = (d.y0 + d.y1) / 2;
        var minH = d.y1 - d.y0;

        g.append('text')
            .attr('class', 'sankey-node-label')
            .attr('x', tx)
            .attr('y', ty)
            .attr('dy', '0.35em')
            .attr('text-anchor', anchor)
            .text(d.name);

        if (minH > 12) {
            g.append('text')
                .attr('class', 'sankey-node-value')
                .attr('x', tx)
                .attr('y', ty + 13)
                .attr('dy', '0.35em')
                .attr('text-anchor', anchor)
                .text(d.value + '件');
        }
    });

    // 图层标题
    var layerTitles = ['申请年份', '研究主题', 'IPC 赛道'];
    var titleX = [margin.left, (W - margin.left - margin.right) / 2 + margin.left, W - margin.right];
    layerTitles.forEach(function(title, i) {
        svg.append('text')
            .attr('class', 'sankey-layer-title')
            .attr('x', titleX[i])
            .attr('y', margin.top - 16)
            .attr('text-anchor', 'middle')
            .text(title);
    });
}
