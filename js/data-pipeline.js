// 数据管道：从 patent.csv 原始数据提取各类统计指标

function executeCoreDataPipeline() {
    try {
        globalProcessedMetrics = {
            totalCount: 0, minYear: 2050, maxYear: 1900,
            legalStatusStats: { '授权': 0, '审查': 0, '驳回/撤回': 0, '失效/放弃': 0 },
            highValueCount: 0, cityRanking: {}, provinceRanking: {}, globalRanking: {},
            techThemeClustering: {}, assigneeRanking: {},
            techCoOccurrenceMatrix: {}, assigneeCoMatrix: {},
            valueScoreDistribution: { high: 0, mid: 0, low: 0 },
            riskDistribution: { expired: 0, critical: 0, normal: 0 },
            // 桑基图流转数据：申请年份 → 专利类型 → 法律状态
            sankeyYearType: {},   // { "2015|发明": 42, ... }
            sankeyTypeStatus: {}  // { "发明|授权": 30, ... }
        };
        assigneeTechFocus = {};

        rawGlobalPatentDataset.forEach(row => {
            let pubNum = row['公开(公告)号'] || row['专利号'] || '';
            let title = row['标题'] || '';
            if (!pubNum && !title) return;
            globalProcessedMetrics.totalCount++;

            // 1. 周期年限计算
            let appDateStr = row['申请日'] || '';
            if (appDateStr && appDateStr.length >= 4) {
                let year = parseInt(appDateStr.substring(0, 4));
                if (year < globalProcessedMetrics.minYear && year > 1980) globalProcessedMetrics.minYear = year;
                if (year > globalProcessedMetrics.maxYear && year <= 2026) globalProcessedMetrics.maxYear = year;
            }

            // 2. 法律状态归类
            let cleanStatus = '审查';
            let rawStatus = row['法律状态/事件'] || '';
            let pType = row['专利类型'] || '';
            if (rawStatus.includes('授权') || pType.includes('授权') || pType.includes('B') || pType.includes('C')) cleanStatus = '授权';
            else if (rawStatus.includes('驳回') || rawStatus.includes('撤回')) cleanStatus = '驳回/撤回';
            else if (rawStatus.includes('失效') || rawStatus.includes('放弃') || rawStatus.includes('到期')) cleanStatus = '失效/放弃';
            globalProcessedMetrics.legalStatusStats[cleanStatus]++;

            // 3. 受理局统计
            let auth = (row['受理局'] || 'CN').substring(0, 2).toUpperCase();
            globalProcessedMetrics.globalRanking[auth] = (globalProcessedMetrics.globalRanking[auth] || 0) + 1;

            // 4. 地理区域映射
            // 中国港澳台地区缩写映射（CSV中台湾和香港使用英文缩写代码）
            const CN_REGION_ABBR = { 'TW': '台湾', 'HK': '香港' };
            // 已知的境外省份/州代码（美国州代码、外国国家代码等），不计入中国省份排名
            const FOREIGN_CODES = new Set([
                'CA', 'MA', 'TX', 'MI', 'VA', 'GA', 'NY', 'IL', 'WA', 'NJ', 'NV',
                'OR', 'FL', 'CT', 'PA', 'KY', 'DE', 'BY', 'HE', 'JE',
                'Kanagawa-ken', 'Iwate Prefecture', 'Daegu', 'Gyeongsangbuk-do', 'Seoul',
                'Occitanie'
            ]);
            let rawProv = row['当前申请(专利权)人州/省'] || '';
            if (rawProv && rawProv !== '-' && rawProv !== '未知' && rawProv !== '境外') {
                let rawTrim = rawProv.trim();
                // 优先尝试港澳台缩写映射
                if (CN_REGION_ABBR[rawTrim]) {
                    globalProcessedMetrics.provinceRanking[CN_REGION_ABBR[rawTrim]] = (globalProcessedMetrics.provinceRanking[CN_REGION_ABBR[rawTrim]] || 0) + 1;
                } else if (!FOREIGN_CODES.has(rawTrim)) {
                    // 排除境外代码，只统计中国省份
                    let cleanProv = rawProv.replace(/省|市|自治区|回族|壮族|维吾尔|特别行政区|蒙古族/g, '').trim();
                    if (cleanProv) globalProcessedMetrics.provinceRanking[cleanProv] = (globalProcessedMetrics.provinceRanking[cleanProv] || 0) + 1;
                }
            }
            let rawCity = row['当前申请(专利权)人地市'] || '';
            if (rawCity && rawCity !== '-') {
                let cleanCity = rawCity.replace('市', '').trim();
                if (cleanCity) globalProcessedMetrics.cityRanking[cleanCity] = (globalProcessedMetrics.cityRanking[cleanCity] || 0) + 1;
            }

            // 5. IPC 提取逻辑
            let ipcs = [];
            let ipcField = row['IPC主分类号(小组)释义'] || row['IPC主分类号(小类)释义'] || row['IPC主分类号(大组)释义'] || '';
            if (ipcField && ipcField !== '-') {
                let singleIpc = ipcField.split('（')[0].split('(')[0].trim().substring(0, 10);
                if (singleIpc) ipcs.push(singleIpc);
            }
            if (ipcs.length === 0) {
                let codeField = row['IPC主分类号(小组)'] || row['IPC主分类号(大组)'] || row['IPC主分类号(小类)'] || '';
                if (codeField && codeField !== '-') ipcs.push(codeField.substring(0, 4));
            }
            if (ipcs.length === 0) ipcs.push('智能机器人控制');

            ipcs.forEach(ipc => {
                globalProcessedMetrics.techThemeClustering[ipc] = (globalProcessedMetrics.techThemeClustering[ipc] || 0) + 1;
            });

            // 计算跨技术共现连边
            for (let i = 0; i < ipcs.length; i++) {
                for (let j = i + 1; j < ipcs.length; j++) {
                    let edgeKey = ipcs[i] < ipcs[j] ? ipcs[i] + "|" + ipcs[j] : ipcs[j] + "|" + ipcs[i];
                    globalProcessedMetrics.techCoOccurrenceMatrix[edgeKey] = (globalProcessedMetrics.techCoOccurrenceMatrix[edgeKey] || 0) + 1;
                }
            }

            // 6. 申请人排名统计
            let rawAssignee = row['当前申请(专利权)人'] || row['原始申请(专利权)人'] || '';
            if (rawAssignee && rawAssignee !== '-') {
                let firstAssignee = rawAssignee.split('|')[0].split(';')[0].trim();
                if (firstAssignee.length > 2 && !firstAssignee.includes('无')) {
                    globalProcessedMetrics.assigneeRanking[firstAssignee] = (globalProcessedMetrics.assigneeRanking[firstAssignee] || 0) + 1;
                    if (!assigneeTechFocus[firstAssignee]) assigneeTechFocus[firstAssignee] = {};
                    assigneeTechFocus[firstAssignee][ipcs[0]] = (assigneeTechFocus[firstAssignee][ipcs[0]] || 0) + 1;
                }
            }

            // 7. 高价值分数指标计算
            let citeCount = parseInt(row['被引用专利']) || parseInt(row['引用次数']) || 0;
            let familyCount = parseInt(row['Patsnap同族专利申请数量']) || 0;

            let valueScore = 12;
            if (cleanStatus === '授权') valueScore += 30;
            valueScore += Math.min(citeCount * 8, 40);
            valueScore += Math.min(familyCount * 4, 18);

            if (cleanStatus === '授权' && valueScore >= 45) {
                globalProcessedMetrics.highValueCount++;
                globalProcessedMetrics.valueScoreDistribution.high++;
            } else if (valueScore >= 20) {
                globalProcessedMetrics.valueScoreDistribution.mid++;
            } else {
                globalProcessedMetrics.valueScoreDistribution.low++;
            }

            // 8. 到期风险分布
            let expiryStr = row['预估到期日'] || '';
            if (expiryStr && expiryStr.length >= 4) {
                let expYear = parseInt(expiryStr.substring(0, 4));
                if (expYear <= 2026) globalProcessedMetrics.riskDistribution.expired++;
                else if (expYear - 2026 <= 3) globalProcessedMetrics.riskDistribution.critical++;
                else globalProcessedMetrics.riskDistribution.normal++;
            } else {
                if (cleanStatus === '失效/放弃' || cleanStatus === '驳回/撤回') globalProcessedMetrics.riskDistribution.expired++;
                else globalProcessedMetrics.riskDistribution.normal++;
            }

            // 9. 桑基图流转统计（申请年份 → 专利类型 → 法律状态）
            let sankeyYear = appDateStr ? parseInt(appDateStr.substring(0, 4)) : 0;
            let sankeyType = (row['专利类型'] || '未知').trim() || '未知';
            if (sankeyYear > 1980 && sankeyYear <= 2026 && sankeyType !== '-') {
                let ytKey = sankeyYear + '|' + sankeyType;
                globalProcessedMetrics.sankeyYearType[ytKey] = (globalProcessedMetrics.sankeyYearType[ytKey] || 0) + 1;
                let tsKey = sankeyType + '|' + cleanStatus;
                globalProcessedMetrics.sankeyTypeStatus[tsKey] = (globalProcessedMetrics.sankeyTypeStatus[tsKey] || 0) + 1;
            }
        });

        // 计算头部企业之间的竞争连线
        let topCompanies = Object.entries(globalProcessedMetrics.assigneeRanking).sort((a, b) => b[1] - a[1]).slice(0, 20).map(x => x[0]);
        for (let i = 0; i < topCompanies.length; i++) {
            for (let j = i + 1; j < topCompanies.length; j++) {
                let c1 = topCompanies[i], c2 = topCompanies[j];
                let tech1 = Object.keys(assigneeTechFocus[c1] || {}).sort((a, b) => assigneeTechFocus[c1][b] - assigneeTechFocus[c1][a])[0];
                let tech2 = Object.keys(assigneeTechFocus[c2] || {}).sort((a, b) => assigneeTechFocus[c2][b] - assigneeTechFocus[c2][a])[0];
                if (tech1 && tech1 === tech2) {
                    globalProcessedMetrics.assigneeCoMatrix[c1 + "|" + c2] = 20;
                }
            }
        }

        // 隐藏加载提示
        document.getElementById('globalLoadingNotice').style.display = 'none';

        console.log(`数据管道执行完成：共处理 ${globalProcessedMetrics.totalCount} 条专利记录`);

        // 所有幕始终可见，直接渲染
        if (typeof renderAct1 === 'function') renderAct1();
        if (typeof renderAct2 === 'function') renderAct2();
        if (typeof renderAct3 === 'function') renderAct3();
        if (typeof renderAct4 === 'function') renderAct4();
        if (typeof renderAct5 === 'function') renderAct5();
        if (typeof renderAct6 === 'function') renderAct6();

        // 初始化滚动监听，高亮当前幕的标签
        initScrollSpy();
    } catch (err) {
        console.error(err);
        alert("执行矩阵解析时发生内部错误: " + err.message);
        document.getElementById('globalLoadingNotice').style.display = 'none';
    }
}
