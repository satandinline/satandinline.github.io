"""
从 patent_exploded_split.csv 生成第三幕（申请人协作网络）所需的 JSON 数据
- applicantNetwork: 所有申请人节点（含专利数量）
- applicantCoMatrix: 申请人之间基于相同 IPC 子分类的共现边
输出: data/act3_applicant_network.json
"""

import csv
import json
import os
from collections import defaultdict

BASE   = os.path.dirname(__file__)
CSV    = os.path.join(BASE, 'patent_exploded_split.csv')
OUTDIR = os.path.join(BASE, 'data')
OUT    = os.path.join(OUTDIR, 'act3_applicant_network.json')

# ── 读取 CSV ───────────────────────────────────────────
def read_csv(path):
    for enc in ('utf-8-sig', 'utf-8', 'gbk', 'gb18030'):
        try:
            with open(path, encoding=enc, newline='') as f:
                return list(csv.DictReader(f))
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise RuntimeError(f"无法识别编码：{path}")

print("读取 CSV ...")
rows = read_csv(CSV)
print(f"  共 {len(rows)} 条记录")

# ── 提取 IPC 子分类（前4位，如 B25J）─────────────────
def ipc_label(code: str) -> str:
    code = code.strip()
    return code[:4].upper() if len(code) >= 4 else code.upper()

# ── 统计申请人专利数 & 申请人→IPC 映射 ───────────────
applicant_freq   = defaultdict(int)
applicant_ipcs   = defaultdict(set)

for row in rows:
    applicant = row.get('当前申请(专利权)人', '').strip()
    code      = row.get('IPC主分类号(小组)', '').strip()
    if not applicant or applicant == '-':
        continue
    applicant_freq[applicant] += 1
    if code and code != '-':
        applicant_ipcs[applicant].add(ipc_label(code))

print(f"  唯一申请人数：{len(applicant_freq)}")

# ── 计算共现矩阵（两个申请人共享相同 IPC 子分类即产生连边）──
ipc_to_applicants = defaultdict(list)
for applicant, ipcs in applicant_ipcs.items():
    for ipc in ipcs:
        ipc_to_applicants[ipc].append(applicant)

co_matrix = defaultdict(int)
for ipc, applicants in ipc_to_applicants.items():
    applicants_sorted = sorted(set(applicants))
    for i in range(len(applicants_sorted)):
        for j in range(i + 1, len(applicants_sorted)):
            a, b = applicants_sorted[i], applicants_sorted[j]
            key = f"{a}|{b}" if a < b else f"{b}|{a}"
            co_matrix[key] += 1

print(f"  共现边总数（原始）：{len(co_matrix)}")

# ── 智能过滤：保留共现 ≥ 5 的强关联边 ────────────────
MIN_CO = 5
filtered_co = {k: v for k, v in co_matrix.items() if v >= MIN_CO}
print(f"  共现边（权重≥{MIN_CO}）：{len(filtered_co)}")

# ── 收集有强连边的申请人 ─────────────────────────────
linked_applicants = set()
for key in filtered_co:
    a, b = key.split('|')
    linked_applicants.add(a)
    linked_applicants.add(b)

# 也保留专利数 Top 50 的申请人（即使无强连边也显示）
top_by_freq = sorted(applicant_freq.items(), key=lambda x: -x[1])
top_50 = {name for name, _ in top_by_freq[:50]}

shown_applicants = linked_applicants | top_50
nodes_data = {name: applicant_freq[name] for name in shown_applicants}

# 只保留与 shown_applicants 相关的边
final_co = {}
for key, val in sorted(filtered_co.items(), key=lambda x: -x[1]):
    a, b = key.split('|')
    if a in shown_applicants and b in shown_applicants:
        final_co[key] = val

output = {
    'applicantNetwork':    nodes_data,
    'applicantCoMatrix':   final_co,
    'stats': {
        'total_applicants':  len(applicant_freq),
        'shown_applicants':  len(nodes_data),
        'total_edges_raw':   len(co_matrix),
        'shown_edges':       len(final_co),
    }
}

os.makedirs(OUTDIR, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n输出：{OUT}")
print(f"  显示节点：{len(nodes_data)} / {len(applicant_freq)}")
print(f"  显示连边：{len(final_co)}")
print("Top 5 申请人：", list(top_by_freq[:5]))
print("Top 5 共现边：", list(final_co.items())[:5])
print("Done.")
