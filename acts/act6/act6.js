// Act 6: 专利生命周期桑基图（申请年份 → 专利类型 → 法律状态）
// 使用 D3.js 自定义布局绘制

function renderAct6() {
    var m = globalProcessedMetrics;
    if (!m.sankeyYearType || !m.sankeyTypeStatus) return;

    // ── 1. 构建节点和链路 ────────────────────────────
    var yearSet = new Set();
    var typeSet = new Set();
    var statusSet = new Set();

    var rawYT = {};
    Object.entries(m.sankeyYearType).forEach(function(e) {
        var parts = e[0].split('|');
        var yr = parseInt(parts[0]);
        var tp = parts[1];
        if (yr < 2000) return; // 过滤掉太早的年份
        yearSet.add(yr);
        typeSet.add(tp);
        rawYT[yr + '|' + tp] = e[1];
    });

    var rawTS = {};
    Object.entries(m.sankeyTypeStatus).forEach(function(e) {
        var parts = e[0].split('|');
        var tp = parts[0];
        var st = parts[1];
        if (!typeSet.has(tp)) return;
        statusSet.add(st);
        rawTS[tp + '|' + st] = e[1];
    });

    // 过滤专利数太少的年份（<10件）
    var yearTotals = {};
    Object.entries(rawYT).forEach(function(e) {
        var yr = parseInt(e[0].split('|')[0]);
        yearTotals[yr] = (yearTotals[yr] || 0) + e[1];
    });
    Object.keys(yearTotals).forEach(function(yr) {
        if (yearTotals[yr] < 10) yearSet.delete(parseInt(yr));
    });

    // 重新清理 typeSet：只保留与过滤后年份有关联的类型
    typeSet = new Set();
    Object.entries(rawYT).forEach(function(e) {
        var yr = parseInt(e[0].split('|')[0]);
        if (yearSet.has(yr)) typeSet.add(e[0].split('|')[1]);
    });

    // 重新清理 statusSet
    statusSet = new Set();
    Object.entries(rawTS).forEach(function(e) {
        if (typeSet.has(e[0].split('|')[0])) statusSet.add(e[0].split('|')[1]);
    });

    var years = Array.from(yearSet).sort(function(a, b) { return a - b; });
    var types = Array.from(typeSet).sort();
    var statuses = Array.from(statusSet).sort();

    if (years.length === 0 || types.length === 0 || statuses.length === 0) return;

    // 创建节点
    var nodes = [];
    var nodeMap = {};
    years.forEach(function(y) {
        var n = { id: 'Y' + y, name: String(y), layer: 0, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });
    types.forEach(function(t) {
        var n = { id: 'T' + t, name: t, layer: 1, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });
    statuses.forEach(function(s) {
        var n = { id: 'S' + s, name: s, layer: 2, value: 0 };
        nodes.push(n);
        nodeMap[n.id] = n;
    });

    // 创建链路（过滤低流量链路）
    var links = [];
    var MIN_LINK = 5;
    Object.entries(rawYT).forEach(function(e) {
        var parts = e[0].split('|');
        var yr = parseInt(parts[0]);
        var tp = parts[1];
        if (!yearSet.has(yr) || !typeSet.has(tp) || e[1] < MIN_LINK) return;
        links.push({ source: 'Y' + yr, target: 'T' + tp, value: e[1] });
    });
    Object.entries(rawTS).forEach(function(e) {
        var parts = e[0].split('|');
        var tp = parts[0];
        var st = parts[1];
        if (!typeSet.has(tp) || !statusSet.has(st) || e[1] < MIN_LINK) return;
        links.push({ source: 'T' + tp, target: 'S' + st, value: e[1] });
    });

    // 计算节点流量总值
    links.forEach(function(lk) {
        if (nodeMap[lk.source]) nodeMap[lk.source].value += lk.value;
        if (nodeMap[lk.target]) nodeMap[lk.target].value += lk.value;
    });

    // ── 2. 桑基图布局计算 ────────────────────────────
    var container = document.getElementById('act6SankeyContainer');
    var W = container.clientWidth || 900;
    var H = container.clientHeight || 620;
    var margin = { top: 45, bottom: 20, left: 70, right: 70 };
    var nodeW = 16;
    var nodePad = 5;

    var layers = [
        nodes.filter(function(n) { return n.layer === 0; }),
        nodes.filter(function(n) { return n.layer === 1; }),
        nodes.filter(function(n) { return n.layer === 2; })
    ];

    var xPositions = [margin.left, (W - margin.left - margin.right) / 2 + margin.left - nodeW / 2, W - margin.right - nodeW];

    layers.forEach(function(layer, li) {
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

    // 节点排序：layer 0 按名称（年份）升序，layer 1/2 按 value 降序
    // 排序已在 layers 定义时通过 sort 完成

    // 计算链路 y 位置
    var srcOff = {};
    var tgtOff = {};
    nodes.forEach(function(n) { srcOff[n.id] = 0; tgtOff[n.id] = 0; });

    // layer 0→1 链路
    var links01 = links.filter(function(l) { return nodeMap[l.source].layer === 0; })
        .sort(function(a, b) {
            var sa = nodeMap[a.source], sb = nodeMap[b.source];
            var ta = nodeMap[a.target], tb = nodeMap[b.target];
            return (sa.y0 - sb.y0) || (ta.y0 - tb.y0);
        });
    // layer 1→2 链路
    var links12 = links.filter(function(l) { return nodeMap[l.source].layer === 1; })
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

    // ── 3. D3 渲染 ────────────────────────────────────
    var svg = d3.select('#act6SankeySvg');
    svg.selectAll('*').remove();
    var tooltip = d3.select('#globalTooltip');

    // 颜色方案
    var statusColors = { '授权': '#059669', '审查': '#0284c7', '驳回/撤回': '#e11d48', '失效/放弃': '#94a3b8' };
    var typeColors = ['#0284c7', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0891b2', '#65a30d'];
    var yearColorScale = d3.scaleLinear()
        .domain([years[0], years[years.length - 1]])
        .range(['#93c5fd', '#1e40af']);

    function nodeColor(node) {
        if (node.layer === 0) return yearColorScale(parseInt(node.name));
        if (node.layer === 1) return typeColors[types.indexOf(node.name) % typeColors.length];
        return statusColors[node.name] || '#94a3b8';
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
        .attr('fill', function(d) { return nodeColor(nodeMap[d.target]); })
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
                .html('<strong>' + d.name + '</strong><br/>总量：' + d.value + ' 件');
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
        var isRight = d.layer === 2;
        var tx, anchor;
        if (isLeft) {
            tx = d.x0 - 6;
            anchor = 'end';
        } else if (isRight) {
            tx = d.x1 + 6;
            anchor = 'start';
        } else {
            tx = d.x1 + 6;
            anchor = 'start';
        }
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
    var layerTitles = ['申请年份', '专利类型', '法律状态'];
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
