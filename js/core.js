// 全局变量定义
let rawGlobalPatentDataset = [];
let globalProcessedMetrics = {};
let assigneeTechFocus = {};
let rawTypeCsvData = [];  // type.csv 解析结果

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

// 导航栏交互隐藏：用户与图表交互时自动隐藏，滚回顶部或点击导航区时恢复
function initNavbarAutoHide() {
    const navbar = document.querySelector('.top-navbar');
    const tabbar = document.querySelector('.narrative-tabs');
    if (!navbar || !tabbar) return;

    let hidden = false;

    // 图表交互时需要同步淡出的场景文字元素
    const sceneTextSelectors = '.scene-header, .act-intro, .story-text';

    function getSceneTextElements() {
        const activeSection = document.querySelector('.narrative-section.active');
        return activeSection
            ? activeSection.querySelectorAll(sceneTextSelectors)
            : [];
    }

    function hideAll() {
        if (!hidden) {
            navbar.classList.add('navbar-hidden');
            tabbar.classList.add('navbar-hidden');
            // Act 2/3/4 场景文字淡出
            getSceneTextElements().forEach(el => el.classList.add('chart-focus-hidden'));
            hidden = true;
        }
    }

    function showAll() {
        if (hidden) {
            navbar.classList.remove('navbar-hidden');
            tabbar.classList.remove('navbar-hidden');
            document.querySelectorAll('.chart-focus-hidden').forEach(el =>
                el.classList.remove('chart-focus-hidden')
            );
            hidden = false;
        }
    }

    // 点击图表区域（SVG、canvas-wrapper、图表容器）时隐藏
    const chartSelectors = [
        'svg', '.canvas-wrapper', '.network-svg-container',
        '#echartsChinaMap', '#act6SankeyContainer',
        '.score-calculator', '.act5-scoring-row'
    ];

    document.addEventListener('mousedown', (e) => {
        // 点击导航栏或标签栏：恢复显示
        if (navbar.contains(e.target) || tabbar.contains(e.target)) {
            showAll();
            return;
        }
        // 点击图表区域：隐藏所有非图表元素
        const inChart = chartSelectors.some(sel => e.target.closest(sel));
        if (inChart) {
            hideAll();
        } else {
            // 点击其他位置（如场景文字、空白处）：恢复显示
            showAll();
        }
    });

    // 滚动时恢复显示（向上滚动或滚到顶部）
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        if (currentY < 100) {
            showAll();
        }
        if (currentY < lastScrollY - 5) {
            showAll();
        }
        lastScrollY = currentY;
    }, { passive: true });
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

// 加载 type.csv 技术分类标注数据
function loadTypeCsv() {
    fetch('type.csv')
        .then(r => r.arrayBuffer())
        .then(buffer => {
            let csvText;
            try {
                csvText = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
            } catch (e) {
                csvText = new TextDecoder('gbk').decode(buffer);
            }
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsed.data && parsed.data.length > 0) {
                rawTypeCsvData = parsed.data;
                console.log(`已从 type.csv 加载 ${rawTypeCsvData.length} 条技术分类数据`);
            }
            executeCoreDataPipeline();
        })
        .catch(err => {
            console.warn('加载 type.csv 失败，将使用 IPC 回退:', err);
            executeCoreDataPipeline();
        });
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
                // 加载 type.csv 后启动数据管道
                loadTypeCsv();
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
