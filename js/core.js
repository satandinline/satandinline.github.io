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
            }, 100); // 延迟确保 DOM 更新完成
        }
    });
}

// 文件上传处理
document.addEventListener('DOMContentLoaded', () => {
    const uploader = document.getElementById('batchCsvFileUploader');
    if (uploader) {
        uploader.addEventListener('change', function (e) {
            const uploadedFiles = e.target.files;
            if (uploadedFiles.length === 0) return;

            document.getElementById('globalLoadingNotice').style.display = 'block';
            rawGlobalPatentDataset = [];
            let completeCount = 0;

            for (let i = 0; i < uploadedFiles.length; i++) {
                Papa.parse(uploadedFiles[i], {
                    header: true, skipEmptyLines: true, encoding: "GBK",
                    complete: function (parsedResults) {
                        let keys = Object.keys(parsedResults.data[0] || {});
                        let isGarbled = !keys.some(k => k.includes('申请') || k.includes('专利') || k.includes('号'));

                        if (isGarbled) {
                            Papa.parse(uploadedFiles[i], {
                                header: true, skipEmptyLines: true, encoding: "UTF-8",
                                complete: function (res) {
                                    rawGlobalPatentDataset = rawGlobalPatentDataset.concat(res.data);
                                    checkAndRender(++completeCount, uploadedFiles.length);
                                }
                            });
                        } else {
                            rawGlobalPatentDataset = rawGlobalPatentDataset.concat(parsedResults.data);
                            checkAndRender(++completeCount, uploadedFiles.length);
                        }
                    }
                });
            }
        });
    }
});

function checkAndRender(current, total) {
    if (current === total) {
        if (rawGlobalPatentDataset.length === 0) {
            alert("未能成功解析出任何数据，请检查CSV格式！");
            document.getElementById('globalLoadingNotice').style.display = 'none';
            return;
        }
        executeCoreDataPipeline();
    }
}
