"""
创建 MySQL 数据库 patent，建表并从 CSV 导入数据
表1: patent_explode  —— 专利明细（从 patent_exploded_split.csv 导入）
表2: type             —— 专利分类标签（主键：id + publication_no）
"""

import csv
import os
import re
import pymysql
from dotenv import load_dotenv

# ── 读取 .env ──────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
HOST     = os.getenv('HOST', '127.0.0.1')
USER     = os.getenv('USER', 'root')
PASSWORD = os.getenv('PASSWORD', '')
PORT     = int(os.getenv('PORT', 3306))
DB_NAME  = os.getenv('DATABASE', 'patent')

CSV_PATH = os.path.join(os.path.dirname(__file__), 'patent_exploded_split.csv')

# ── CSV 字段名 → 英文列名映射 ──────────────────────────
COL_MAP = {
    '序号':                    'id',
    '公开(公告)号':             'publication_no',
    '标题':                    'title',
    '摘要':                    'abstract',
    '当前申请(专利权)人':       'applicant',
    'IPC主分类号(小组)':        'ipc_code',
    'IPC主分类号(小组)释义':    'ipc_description',
}

# ── 从 IPC 分类号提取子分类标签（前4位，如 B25J）────────
def extract_ipc_label(ipc_code: str) -> str:
    ipc_code = ipc_code.strip()
    m = re.match(r'^([A-H]\d[A-Z]\d)', ipc_code, re.IGNORECASE)
    return m.group(1).upper() if m else ipc_code[:4] if ipc_code else ''

# ── 读取 CSV ──────────────────────────────────────────
def read_csv(path):
    for enc in ('utf-8-sig', 'utf-8', 'gbk', 'gb18030'):
        try:
            with open(path, encoding=enc, newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            return rows
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise RuntimeError(f"无法识别编码：{path}")

print("读取 CSV ...")
rows = read_csv(CSV_PATH)
print(f"  共 {len(rows)} 条记录")

# ── 连接 MySQL（先连默认库，再创建目标库）────────────────
print(f"连接 MySQL {HOST}:{PORT} ...")
conn = pymysql.connect(host=HOST, user=USER, password=PASSWORD, port=PORT,
                       charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
conn.autocommit(True)

with conn.cursor() as cur:
    cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                f"DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    print(f"  数据库 `{DB_NAME}` 已就绪")

conn.select_db(DB_NAME)

# ── 建表 1: patent_explode ─────────────────────────────
with conn.cursor() as cur:
    cur.execute("DROP TABLE IF EXISTS `patent_explode`")
    cur.execute("""
        CREATE TABLE `patent_explode` (
            `id`               INT          NOT NULL          COMMENT '序号',
            `publication_no`   VARCHAR(50)  NOT NULL          COMMENT '公开(公告)号',
            `title`            VARCHAR(500) DEFAULT NULL      COMMENT '标题',
            `abstract`         TEXT         DEFAULT NULL      COMMENT '摘要',
            `applicant`        VARCHAR(200) DEFAULT NULL      COMMENT '当前申请(专利权)人',
            `ipc_code`         VARCHAR(50)  DEFAULT NULL      COMMENT 'IPC主分类号(小组)',
            `ipc_description`  VARCHAR(500) DEFAULT NULL      COMMENT 'IPC主分类号(小组)释义',
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专利明细表'
    """)
    print("  表 `patent_explode` 已创建")

# ── 建表 2: type ────────────────────────────────────────
with conn.cursor() as cur:
    cur.execute("DROP TABLE IF EXISTS `type`")
    cur.execute("""
        CREATE TABLE `type` (
            `id`              INT          NOT NULL          COMMENT '序号',
            `publication_no`  VARCHAR(50)  NOT NULL          COMMENT '公开(公告)号',
            `category_label`  VARCHAR(50)  DEFAULT NULL      COMMENT '分类标签(IPC子分类)',
            PRIMARY KEY (`id`, `publication_no`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专利分类标签表'
    """)
    print("  表 `type` 已创建")

# ── 批量插入 patent_explode ─────────────────────────────
print("导入 patent_explode ...")
INSERT_EXPLODE = """
    INSERT INTO `patent_explode`
        (`id`, `publication_no`, `title`, `abstract`, `applicant`, `ipc_code`, `ipc_description`)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
"""
BATCH = 500
with conn.cursor() as cur:
    batch = []
    for i, row in enumerate(rows, 1):
        batch.append((
            int(row['序号']),
            row['公开(公告)号'],
            row['标题'],
            row['摘要'],
            row['当前申请(专利权)人'],
            row['IPC主分类号(小组)'],
            row['IPC主分类号(小组)释义'],
        ))
        if len(batch) >= BATCH:
            cur.executemany(INSERT_EXPLODE, batch)
            batch.clear()
            if i % 2000 == 0:
                print(f"  已写入 {i}/{len(rows)} ...")
    if batch:
        cur.executemany(INSERT_EXPLODE, batch)
print(f"  patent_explode 导入完成，共 {len(rows)} 条")

# ── 批量插入 type ────────────────────────────────────────
print("导入 type ...")
INSERT_TYPE = """
    INSERT INTO `type` (`id`, `publication_no`, `category_label`)
    VALUES (%s, %s, %s)
"""
with conn.cursor() as cur:
    batch = []
    type_count = 0
    for row in rows:
        label = extract_ipc_label(row['IPC主分类号(小组)'])
        batch.append((int(row['序号']), row['公开(公告)号'], label))
        type_count += 1
        if len(batch) >= BATCH:
            cur.executemany(INSERT_TYPE, batch)
            batch.clear()
    if batch:
        cur.executemany(INSERT_TYPE, batch)
print(f"  type 导入完成，共 {type_count} 条")

# ── 验证 ─────────────────────────────────────────────────
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) AS cnt FROM `patent_explode`")
    c1 = cur.fetchone()['cnt']
    cur.execute("SELECT COUNT(*) AS cnt FROM `type`")
    c2 = cur.fetchone()['cnt']
    cur.execute("SELECT * FROM `patent_explode` LIMIT 2")
    sample = cur.fetchall()
    cur.execute("SELECT * FROM `type` LIMIT 3")
    type_sample = cur.fetchall()

print()
print("═" * 50)
print(f"验证结果：patent_explode = {c1} 行 | type = {c2} 行")
print("patent_explode 示例：")
for r in sample:
    print(f"  id={r['id']}  pub={r['publication_no']}  applicant={r['applicant'][:15]}...")
print("type 示例：")
for r in type_sample:
    print(f"  id={r['id']}  pub={r['publication_no']}  label={r['category_label']}")
print("═" * 50)

conn.close()
print("Done.")
