"""
将 patent_exploded.csv 按"当前申请(专利权)人"拆分
多个申请人以 " | " 分隔，拆成多行，其余字段保持不变
"""

import csv
import os

INPUT_FILE  = os.path.join(os.path.dirname(__file__), 'patent_exploded.csv')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'patent_exploded_split.csv')

# 尝试多种编码读取（中文 CSV 常见 GBK / UTF-8）
def read_csv(path):
    for enc in ('utf-8-sig', 'utf-8', 'gbk', 'gb18030'):
        try:
            with open(path, encoding=enc, newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                fieldnames = reader.fieldnames
            return rows, fieldnames, enc
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise RuntimeError(f"无法识别文件编码：{path}")

rows, fieldnames, enc = read_csv(INPUT_FILE)
print(f"读取成功（编码：{enc}），共 {len(rows)} 条原始记录")

APPLICANT_FIELD = '当前申请(专利权)人'
SEQ_FIELD       = '序号'

new_rows = []
new_seq  = 1

for row in rows:
    raw_applicant = row.get(APPLICANT_FIELD, '').strip()
    # 按 " | " 或 "|" 拆分，并去除两侧空格
    applicants = [a.strip() for a in raw_applicant.replace('|', '|').split('|') if a.strip()]

    if not applicants:
        # 申请人为空，保留原行
        new_row = row.copy()
        new_row[SEQ_FIELD] = str(new_seq)
        new_rows.append(new_row)
        new_seq += 1
    else:
        for applicant in applicants:
            new_row = row.copy()
            new_row[SEQ_FIELD]       = str(new_seq)
            new_row[APPLICANT_FIELD] = applicant
            new_rows.append(new_row)
            new_seq += 1

# 写出结果（UTF-8 with BOM，Excel 直接打开不乱码）
with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(new_rows)

print(f"拆分完成！共 {len(new_rows)} 条记录（新增 {len(new_rows) - len(rows)} 条）")
print(f"输出文件：{OUTPUT_FILE}")
