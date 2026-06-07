// 全局变量定义
let rawGlobalPatentDataset = [];
let globalProcessedMetrics = {};
let loadedChartsInstances = {};
let assigneeTechFocus = {};

// 标签切换逻辑（仅负责视图切换，不再触发渲染）
function switchNarrativeAct(actId) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i + 1) === actId));

    // 隐藏所有幕，显示当前幕
    document.querySelectorAll('.narrative-section').forEach((s, i) => {
        s.classList.remove('active');
        if ((i + 1) === actId) {
            s.classList.add('active');

            // 平滑滚动到该幕内容区域的顶部
            setTimeout(() => {
                const targetSection = document.getElementById(`narrativeAct${actId}`);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        }
    });
}

// 页面加载时自动读取 patent.csv 并执行数据管道
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('globalLoadingNotice').style.display = 'block';

    fetch('patent.csv')
        .then(response => response.arrayBuffer())
        .then(buffer => {
            // 先尝试 UTF-8 解码（fatal 模式会在遇到无效字节时抛异常），失败则回退 GBK
            let csvText;
            try {
                csvText = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            } catch (e) {
                csvText = new TextDecoder('gbk').decode(buffer);
            }

            // 用已正确解码的文本交给 PapaParse 解析
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });

            if (parsed.data && parsed.data.length > 0) {
                rawGlobalPatentDataset = parsed.data;
                console.log(`已从 patent.csv 加载 ${rawGlobalPatentDataset.length} 条数据`);
                executeCoreDataPipeline();
            } else {
                console.error('patent.csv 解析结果为空');
                document.getElementById('globalLoadingNotice').style.display = 'none';
                alert('patent.csv 解析结果为空，请检查文件格式。');
            }
        })
        .catch(err => {
            console.error('加载 patent.csv 失败:', err);
            document.getElementById('globalLoadingNotice').style.display = 'none';
            alert('无法加载 patent.csv 数据文件，请确保该文件存在于项目根目录。\n错误: ' + err.message);
        });
});
