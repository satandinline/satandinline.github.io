// 全局变量定义
let rawGlobalPatentDataset = [];
let globalProcessedMetrics = {};
let assigneeTechFocus = {};

// 点击标签跳转到对应幕
function switchNarrativeAct(actId) {
    const target = document.getElementById(`narrativeAct${actId}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 滚动监听：根据当前可见位置高亮标签
function initScrollSpy() {
    const sections = document.querySelectorAll('.narrative-section');
    const tabs = document.querySelectorAll('.tab-btn');
    if (!sections.length || !tabs.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                tabs.forEach(t => {
                    t.classList.toggle('active', t.dataset.section === id);
                });
            }
        });
    }, {
        rootMargin: '-120px 0px -60% 0px',
        threshold: 0
    });

    sections.forEach(s => observer.observe(s));
}

// 数据溯源页卡片交互
function toggleDSCard(key) {
    const card = document.getElementById(`dsCard-${key}`);
    if (!card) return;
    // 移除所有卡片的激活状态
    document.querySelectorAll('.ds-card').forEach(c => c.classList.remove('ds-card-active'));
    document.querySelectorAll('.dj-step').forEach(s => s.classList.remove('dj-active'));
    // 激活目标卡片
    card.classList.add('ds-card-active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // 激活对应流程步骤
    const step = card.closest('.narrative-section')?.querySelector(`.dj-step[onclick*="'${key}'"]`);
    if (step) step.classList.add('dj-active');
}

// 页面加载后读取 patent.csv
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('globalLoadingNotice').style.display = 'block';

    fetch('patent.csv')
        .then(response => response.arrayBuffer())
        .then(buffer => {
            // 先试 UTF-8，失败则 GBK
            let csvText;
            try {
                csvText = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            } catch (e) {
                csvText = new TextDecoder('gbk').decode(buffer);
            }

            // 交给 PapaParse 解析
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
