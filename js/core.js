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

    function hideNavbar() {
        if (!hidden) {
            navbar.classList.add('navbar-hidden');
            tabbar.classList.add('navbar-hidden');
            hidden = true;
        }
    }

    function showNavbar() {
        if (hidden) {
            navbar.classList.remove('navbar-hidden');
            tabbar.classList.remove('navbar-hidden');
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
        // 如果点击的是导航栏或标签栏区域，恢复显示
        if (navbar.contains(e.target) || tabbar.contains(e.target)) {
            showNavbar();
            return;
        }
        // 如果点击的是图表相关区域，隐藏
        const inChart = chartSelectors.some(sel => e.target.closest(sel));
        if (inChart) {
            hideNavbar();
        }
    });

    // 滚动到页面顶部时恢复显示
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        // 滚到顶部附近（100px 内）时恢复
        if (currentY < 100) {
            showNavbar();
        }
        // 向上滚动时也恢复（用户想回到导航栏）
        if (currentY < lastScrollY - 5) {
            showNavbar();
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
