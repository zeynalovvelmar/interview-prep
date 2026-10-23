---
id: "06-lakehouse-table-formats"
slug: "lakehouse-ve-table-formatlari"
order: 6
title: "Data Lakehouse və Müasir Cədvəl Formatları (Delta Lake, Apache Iceberg)"
category: "Lakehouse"
priority: "high"
readiness: "orta"
vacancyLink: "Amazon S3 üzərində Apache Iceberg və ya Delta Lake istifadə edərək miqyaslana bilən Lakehouse arxitekturasının layihələndirilməsi və tətbiqi"
tags: ["Lakehouse", "Delta Lake", "Apache Iceberg", "Apache Hudi", "Amazon S3", "Parquet", "Medallion", "ACID", "Time Travel", "Small Files", "Compaction"]
summary: "Lake vs Warehouse vs Lakehouse, S3 əsasları, Parquet, Medallion arxitekturası, Delta Lake tranzaksiya loqu, Iceberg metadata qatları, müqayisə cədvəli və diaqramlar."
---

# Data Lakehouse və Müasir Cədvəl Formatları (Delta Lake, Apache Iceberg)

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Məlumat anbarlarının təkamülünü **şəhər arxivinin inkişaf tarixi** kimi təsəvvür edin:
- **Data Warehouse (DWH - Klassik Qapalı Kitabxana)**: Çox səliqəli, hər kitabın yeri nömrələnib, təhlükəsizdir (ACID, tranzaksiya etibarlılığı). Lakin ora yalnız müəyyən formatda və ölçüdə kitablar qoyula bilər (yalnız strukturlaşdırılmış SQL cədvəlləri). Kitabxananı böyütmək həddən artıq baha başa gəlir (bahalı disklər və lisenziyalar).
- **Data Lake (Açıq və Nəhəng Anbar Zirzəmisi - S3 / Obyekt Yaddaşı)**: Şəhərin kənarında nəhəng və ucuz bir anbardır. Bura hər şeyi tökmək olar: CSV, JSON, loqlar, PDF sənədlər, şəkillər. Lakin bir müddət sonra bura zibilliyə çevrilir (**Data Swamp**): heç kim bilmir hansı fayl yarımçıq qalıb, eyni anda iki nəfər yazanda fayllar korlanır, tranzaksiya anlayışı (ACID) yoxdur.
- **Data Lakehouse (Müasir Ağıllı Arxiv)**: Obyekt yaddaşının (Amazon S3 / MinIO) ucuz, sonsuz genişlənə bilən tutumu üzərinə **Ağıllı Cədvəl Formatlarının (Delta Lake və Apache Iceberg)** gətirilməsidir. Fayllar yenə ucuz Parquet kimi qalır, lakin onların üzərində güclü **Tranzaksiya Loqu və Metadata Qatları** oturur. Nəticədə həm S3-ün ucuzluğundan istifadə edirik, həm də DWH-ın ACID etibarlılığını, Time Travel (tarixə qayıtmaq) və sürətli sorğu imkanlarını əldə edirik!

> [!TIP]
> **Müsahibədə belə de:**
> "Mənim birinci layihəmdə MinIO (S3-compatible) üzərində PySpark və Delta Lake ilə 3-qatlı Medallion Lakehouse qurulub. Real Amazon S3 və ya Apache Iceberg-i canlı istehsalatda idarə etməmişəm, lakin prinsiplərə dərindən bələdəm: Delta Lake `_delta_log/` qovluğunda JSON və checkpoint Parquet faylları ilə tranzaksiyaları qeyd edir; Apache Iceberg isə kataloq, metadata faylı, manifest list və manifest fayllarından ibarət 3-qatlı iyerarxiya ilə işləyir. Iceberg-in Hidden Partitioning və Partition Evolution imkanları böyük sığorta hadisələri cədvəllərində sxem dəyişəndə bütün cədvəli yenidən yazmaq məcburiyyətini aradan qaldırır."

---

## 2. Əsas anlayışlar və Memarlıq Təhlili

### 2.1. Lakehouse vs Warehouse vs Lake Müqayisəsi

| Xüsusiyyət | Data Warehouse (DWH) | Data Lake | Data Lakehouse |
| :--- | :--- | :--- | :--- |
| **Məlumat Növləri** | Yalnız Strukturlaşdırılmış (Relational) | Strukturlaşdırılmış, yarı- və struktursuz | Bütün növlər (SQL, JSON, Media, Parquet) |
| **Saxlama Xərci** | Çox Yüksək (xüsusi saxlayıcılar) | Çox Ucuz (Amazon S3, Azure ADLS, MinIO) | Çox Ucuz (S3 obyekt yaddaşı) |
| **ACID Dəstəyi** | Tam Təbii Dəstək | Yoxdur (yalnız fayl səviyyəsində) | Tam Dəstək (Delta Lake / Iceberg ilə) |
| **Hesablama və Yaddaş** | Sıx bağlıdır (Coupled) | Tamamilə ayrılıb (Decoupled) | Tamamilə ayrılıb (Compute/Storage decoupled) |
| **İstifadə Sahəsi** | BI, Dashboards, SQL Hesabatları | Data Science, Machine Learning, Raw Data | BI, Qabaqcıl Analitika, Real-time Axın və ML |

---

### 2.2. Amazon S3 Əsasları (Storage Foundation)
- **Buckets və Object Keys**:
  - `Bucket`: Qlobal miqyasda unikal adlı əsas konteyner (məsələn: `s3://atashgah-insurance-lakehouse`).
  - `Object Key / Prefix`: S3-də ənənəvi qovluq iyerarxiyası yoxdur; `prefix` sadəcə obyekt açarının adıdır (məsələn: `bronze/policies/year=2026/file.parquet`). S3 hər bir unikal prefiks üzrə paralel saniyədə 3,500 PUT/POST və 5,500 GET sorğusuna xidmət edir.
- **Storage Classes (Saxlama Sinifləri)**:
  - `S3 Standard`: Tez-tez oxunan canlı analitik məlumatlar üçün (Gold/Silver).
  - `S3 Standard-IA (Infrequent Access)`: Ayda 1-2 dəfə oxunan, lakin dərhal əlçatan olması tələb olunan arxivlər (Bronze).
  - `S3 Glacier Flexible / Deep Archive`: Qanuni audit üçün 5–10 il saxlanılan, açılması bir neçə dəqiqə və ya saat çəkən ən ucuz arxivlər.
- **S3 Lifecycle Policies**: Məlumatın yaşlandıqca avtomatik olaraq Standard $\rightarrow$ IA $\rightarrow$ Glacier keçidini və ya 7 ildən sonra silinməsini təmin edən avtomatlaşdırma qaydaları.
- **IAM (Identity & Access Management)**: S3 bucket-lərinə və prefikslərinə ən kiçik səlahiyyət prinsipi (Least Privilege) ilə giriş nəzarəti (Insurance PII məlumatlarının qorunması).

---

### 2.3. Fayl Formatları: Sətir vs Sütun Əsaslı (Row vs Columnar)
- **Sətir Əsaslı (Row-Oriented: CSV, JSON, Avro)**:
  - Bütün sətrin atributları diskdə ardıcıl saxlanılır.
  - Sürətli tək sətir yazma və Kafka axınları üçün idealdır (xüsusilə `Avro` şema dəstəyi ilə kəfkir axınlarında liderdir).
  - Analitik sorğularda (məsələn: 100 milyon sətirdən yalnız `premium` sütununun cəmi) bütün cədvəli diskdən oxumağa məcbur edir (çox ləngdir).
- **Sütun Əsaslı (Columnar: Apache Parquet, ORC)**:
  - Eyni sütunun məlumatları diskdə yanaşı saxlanılır.
  - **Sıxılma (Compression)**: Eyni tipli dəyərlər ardıcıl gəldiyi üçün `Snappy`, `Gzip` və `ZSTD` alqoritmləri ilə 70–85% sıxılma təmin olunur.
  - **Column Pruning (Sütun Kəsmə)**: Sorğu yalnız `SELECT premium` edirsə, digər 50 sütun diskdən heç oxunmur!
  - **Predicate Pushdown (Statistika Kəsmə)**: Parquet faylının metadata hissəsində hər blok üçün `min/max` dəyərlər saxlanılır. Əgər `WHERE year = 2026` yazılıbsa və faylın max dəyəri 2025-dirsə, fayl bütövlükdə ötürülür (**File Skipping**).

---

### 2.4. Medallion Memarlığı (Bürünc, Gümüş, Qızıl Qatlar)

Aşağıdakı diaqram Lakehouse-da məlumatın keyfiyyət süzgəcindən keçərək zənginləşmə yolunu göstərir:

```
+---------------------------------------------------------------------------------------+
|                               MEDALLION LAKEHOUSE ARCHITECTURE                        |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  [Xarici Mənbələr]                                                                    |
|  - SQL Server / Postgres                                                              |
|  - Kafka Streams (IoT/Web)                                                            |
|  - External APIs / JSON                                                               |
|        |                                                                              |
|        v Ingestion (Raw Append)                                                       |
|  +---------------------------------------------------------------------------------+  |
|  |  BRONZE LAYER (Xam Məlumat)                                                      |  |
|  |  - Format: Raw JSON / Parquet / Delta                                           |  |
|  |  - Prinsiplər: Append-only, dəyişdirilməz tarixi həqiqət, sıfır təmizləmə        |  |
|  +---------------------------------------------------------------------------------+  |
|        |                                                                              |
|        v Data Quality Gates (Deduplication, Quarantine, Type Casting)                  |
|  +---------------------------------------------------------------------------------+  |
|  |  SILVER LAYER (Təmizlənmiş və İnteqrasiya Olunmuş)                               |  |
|  |  - Format: Delta Lake / Apache Iceberg Tables                                    |  |
|  |  - Prinsiplər: Şema təsdiqi, null və yetim sətirlərin təmizlənməsi, Conformed Dims| |
|  +---------------------------------------------------------------------------------+  |
|        |                                                                              |
|        v Business Aggregations & Dimensional Modeling (Star Schema)                   |
|  +---------------------------------------------------------------------------------+  |
|  |  GOLD LAYER (Biznes Analitik Vitrinləri - Data Marts)                           |  |
|  |  - Format: Optimallaşdırılmış Delta / Iceberg Cədvəlləri                         |  |
|  |  - Prinsiplər: Star Schema (FactPolicies, FactClaims), KPI-lar, Power BI / Trino |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

### 2.5. Delta Lake Dərinliyi (Databricks / Linux Foundation)
- **`_delta_log/` Mexanizmi**:
  - Delta cədvəli Parquet faylları və həmin qovluq daxilindəki `_delta_log/` alt-qovluğundan ibarətdir.
  - Hər bir tranzaksiya (INSERT, DELETE, UPDATE) ardıcıl JSON faylı kimi qeyd olunur: `000000.json`, `000001.json`...
  - Hər 10 tranzaksiyadan bir bütün JSON-lar birləşdirilərək kompakt Parquet formatında checkpoint yaradılır: `000010.checkpoint.parquet`.
  - Sorğu mühərriki cədvəli oxuyanda diski skan etmir; son checkpoint-i və ondan sonrakı JSON-ları oxuyaraq hansı Parquet fayllarının aktiv olduğunu dəqiq müəyyənləşdirir (**Atomic Commit**).
- **Time Travel (Zaman Səyahəti)**:
  - Cədvəlin istənilən keçmiş vəziyyətini oxumaq imkanı: `SELECT * FROM table VERSION AS OF 5` və ya `TIMESTAMP AS OF '2026-10-20'`.
- **Şema Təhlükəsizliyi**:
  - `Schema Enforcement`: Uyğun gəlməyən yeni sütun gələrsə yazma xəta verir və bazanı qoruyur.
  - `Schema Evolution`: `option('mergeSchema', 'true')` ilə yeni sütunlar təhlükəsiz şəkildə qəbul edilir.
- **Fayl Baxımı (File Maintenance)**:
  - `OPTIMIZE`: Çoxlu xırda faylları birləşdirib 1 GB-lıq optimal fayllara yığır (**Bin-packing**). `Z-ORDER BY (customer_id)` ilə eyni dəyərlər eyni fayllara qruplaşdırılır və axtarış sürəti 100x artır.
  - `VACUUM`: Köhnə, artıq istifadə olunmayan silinmiş Parquet fayllarını diskdən fiziki silir (standart saxlama müddəti: 7 gün).

---

### 2.6. Apache Iceberg Dərinliyi (Apache Software Foundation)
- **Iceberg 3-Qatlı Metadata Memarlığı**:
  1. **Iceberg Catalog**: Cədvəlin cari ən son `Metadata File` ünvanını saxlayan mərkəz (AWS Glue, Nessie, REST Catalog).
  2. **Metadata File (`vN.metadata.json`)**: Cədvəlin tam şeması, partisiya qaydaları, snapshot tarixçəsi və cari snapshot göstəricisi.
  3. **Manifest List (`snap-ID.avro`)**: Həmin snapshot-a aid olan Manifest fayllarının siyahısı və hər manifestin əhatə etdiyi partisiya aralıqları.
  4. **Manifest File (`manifest-ID.avro`)**: Hər bir fərdi Parquet faylının fiziki ünvanı və sütunlar üzrə `min/max`, `null_count` statistikaları.
  5. **Data Files (`.parquet`)**: Faktiki məlumat faylları.
- **Hidden Partitioning (Gizli Partisiya)**:
  - Digər sistemlərdə istifadəçi cədvələ müraciət edərkən partisiya sütununu bilməli idi (`WHERE date = '2026-10-23'`).
  - Iceberg-də partisiya funksiyası gizlidir: `timestamp` sütunu üzərindən `days(event_time)` partisiya təyin edilir. İstifadəçi sadəcə `WHERE event_time >= '2026-10-23 10:00'` yazdıqda Iceberg avtomatik yalnız lazımi günün partisiya qovluqlarını oxuyur!
- **Partition Evolution (Partisiyanın Yenilənməsi)**:
  - Əgər cədvəl əvvəllər `month(event_time)` üzrə partisiya olunubsa, lakin məlumat artıb və `day(event_time)`-a keçmək istəyiriksə, **köhnə məlumatları yenidən yazmağa ehtiyac yoxdur**! Köhnə fayllar ay üzrə qalır, yeni yazılanlar gün üzrə partisiya olunur; Iceberg hər iki qaydanı eyni cədvəldə şəffaf idarə edir.
- **Field ID-based Schema Evolution**:
  - Sütunlar adla deyil, unikal `Field ID` ilə izlənir. Sütunun adını dəyişmək, yerini dəyişmək və ya silmək heç vaxt tarixi Parquet fayllarını korlamır və data köçürülməsi tələb etmir.

---

### 2.7. Delta Lake vs Apache Iceberg vs Apache Hudi Müqayisəsi

| Xüsusiyyət | Delta Lake | Apache Iceberg | Apache Hudi |
| :--- | :--- | :--- | :--- |
| **Yaradan / Hamisi** | Databricks / Linux Foundation | Netflix, Apple / Apache Foundation | Uber / Apache Foundation |
| **Metadata Mexanizmi** | `_delta_log/` (JSON + Checkpoint Parquet) | 3-qatlı iyerarxiya (Catalog $\rightarrow$ Metadata $\rightarrow$ Manifest) | Hər fayl daxilində və `.hoodie/` loqu |
| **Kataloq Asılılığı** | Zəif (Fayl qovluğu özü cədvəldir) | Güclü (Mərkəzi Kataloq şərtdir: Glue, REST) | Orta |
| **Partisiya Dəyişimi**| Cədvəl yenidən yazılmalıdır | **Partition Evolution (Yenidən yazılmır)** | Cədvəl yenidən yazılmalıdır |
| **Mühərrik Dəstəyi** | Ən güclü: Spark; Trino/Presto yaxşı | Geniş və bərabər: Spark, Trino, Athena, Flink | Əsasən Spark və Flink |
| **Əsas Üstünlük** | Sadəlik, Databricks ekosistemi, Z-Order | Neytral standart, Hidden partitioning, Multi-engine | Real-time streaming upserts (Merge-On-Read) |

---

### 2.8. Small Files Problemi və Həll Yolları
- **Problem**: Streaming axınlarında və ya hər 5 dəqiqədən bir işləyən mikro-batch ETL-lərdə S3-ə minlərlə 50–100 KB-lıq xırda Parquet faylları yazılır. Nəticədə metadata ölçüsü şişir, S3 API çağırışları çoxalır və Trino/Spark sorğu göndərəndə vaxtının 90%-ni faylları açmağa sərf edir.
- **Həll Yolları**:
  1. *Yazma anında*: Spark-da `coalesce()` və ya `repartition()` ilə fayl sayını nizamlamaq.
  2. *Dövri baxım (Compaction)*:
     - Delta Lake: `OPTIMIZE table_name` əmri ilə xırda faylları birləşdirmək.
     - Iceberg: `rewrite_data_files` proseduru ilə arxa planda faylları birləşdirmək.
  3. *Partisiya Strategiyası*: Yüksək kardinallı sütunlara (məsələn, `customer_id` və ya `hour`) görə partisiya açmamaq; hər partisiya ən azı **256 MB – 1 GB** məlumat saxlamalıdır.

---

## 3. Kod nümunələri

### Nümunə 1: PySpark ilə Delta Lake-də ACID Yazma, Time Travel və Schema Evolution

```python
# Dialect: Python (PySpark & Delta Lake)
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, current_timestamp

spark = SparkSession.builder \
    .appName("InsuranceLakehouseDelta") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# 1. Silver qatına məlumatı Delta formatında yazmaq
df_cleaned_policies.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .partitionBy("issue_year") \
    .save("s3a://atashgah-lakehouse/silver/policies")

# 2. Time Travel: Keçmiş 3-cü versiyanın vəziyyətini oxumaq
df_v3 = spark.read \
    .format("delta") \
    .option("versionAsOf", 3) \
    .load("s3a://atashgah-lakehouse/silver/policies")

# 3. İdempotent UPSERT (Merge) Əməliyyatı
from delta.tables import DeltaTable

delta_table = DeltaTable.forPath(spark, "s3a://atashgah-lakehouse/silver/policies")

delta_table.alias("target").merge(
    df_incoming_updates.alias("source"),
    "target.policy_id = source.policy_id"
).whenMatchedUpdate(set={
    "premium": col("source.premium"),
    "status": col("source.status"),
    "updated_at": current_timestamp()
}).whenNotMatchedInsert(values={
    "policy_id": col("source.policy_id"),
    "policy_number": col("source.policy_number"),
    "premium": col("source.premium"),
    "status": col("source.status"),
    "issue_year": col("source.issue_year"),
    "updated_at": current_timestamp()
}).execute()
```

---

### Nümunə 2: Spark SQL ilə Apache Iceberg Cədvəli və Hidden Partitioning

```sql
-- Dialect: SQL (Spark SQL / Apache Iceberg)
-- AWS Glue Kataloqu üzərində Iceberg cədvəlinin yaradılması
CREATE TABLE glue_catalog.insurance_lakehouse.claims (
    claim_id BIGINT,
    policy_id BIGINT,
    claim_number STRING,
    claim_amount DECIMAL(18,2),
    claim_timestamp TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(claim_timestamp)) -- Hidden Partitioning (Günlük avtomatik)
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.parquet.compression-codec' = 'zstd',
    'history.expire.max-snapshot-age-ms' = '604800000' -- 7 günlük snapshot saxlama
);

-- Xırda faylların arxa planda birləşdirilməsi (Compaction)
CALL glue_catalog.system.rewrite_data_files(
    table => 'insurance_lakehouse.claims',
    strategy => 'binpack',
    options => map('target-file-size-bytes', '536870912') -- 512 MB hədəf fayl ölçüsü
);
```

---

### Nümunə 3: Delta Lake-də `OPTIMIZE`, `Z-ORDER` və `VACUUM` İcrası

```sql
-- Dialect: SQL (Databricks / Delta Lake SQL)
-- 1. Sığorta polisləri cədvəlində xırda faylları birləşdirmək və müştəri üzrə Z-Order klasterləmək
OPTIMIZE delta.`s3a://atashgah-lakehouse/silver/policies`
ZORDER BY (customer_id, policy_number);

-- 2. 7 gündən köhnə lazımsız faylları diskdən təmizləmək
SET spark.databricks.delta.vacuum.parallelDelete.enabled = true;
VACUUM delta.`s3a://atashgah-lakehouse/silver/policies` RETAIN 168 HOURS;
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: `VACUUM RETAIN 0 HOURS` Təhlükəsi**
> Əgər Delta Lake və ya Iceberg-də retensiya müddətini 0 qoysanız və dərhal `VACUUM` etsəniz, həmin anda arxa planda aktiv işləyən uzunmüddətli Spark oxuma sorğuları çökəcək (`FileNotFoundException`), çünki oxuduqları Parquet faylı altlarından silinəcək! Rəsmi təhlükəsizlik qaydası: heç vaxt `VACUUM`-u 7 gündən (168 saat) aşağı təyin etməyin.

> [!NOTE]
> **Qeyd: Həddindən artıq xırda partisiya açmaq (Over-Partitioning)**
> Cədvəli həm ilə, həm aya, həm günə, həm də sığorta filialına görə partisiya etdikdə hər qovluqda cəmi 50 KB fayl qalır. Nəticədə 1 milyon fayl yaranır və metadata oxunması sorğunu 10 dəfə ləngidir. Qızıl qayda: Partisiyadakı data ən azı 500 MB – 1 GB həcmə çatdıqda partisiya açılmalıdır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Amazon S3 üzərində Apache Iceberg və ya Delta Lake istifadə edərək miqyaslana bilən Lakehouse memarlığının layihələndirilməsi və tətbiqi... Məlumatın saxlanması və inteqrasiyası prinsipləri."*
- **Sənin rolun**: Sığorta şirkətinin tarixi polislərini və hadisələrini bahalı disklərdən S3 üzərinə çıxarmaq; Medallion memarlığını qurmaq; Delta/Iceberg formatları ilə ACID etibarlılığını təmin etmək; Z-Order və Compaction ilə analitik sorğuların sürətini DWH səviyyəsində saxlamaq.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: Delta Lake-də `_delta_log` qovluğunun daxili iş prinsipi necədir və ACID-i necə təmin edir?
<!-- answer-start -->
**Cavab:** Hər bir tranzaksiya (məsələn, fayl əlavə olunması və ya silinməsi) `_delta_log/` qovluğunda ardıcıl JSON faylı kimi (`000000.json`, `000001.json`) saxlanılır. Hər 10 tranzaksiyadan bir kompakt Parquet checkpoint faylı yaradılır. Sorğu mühərriki cədvəli oxuyarkən bütün diski gəzmir; checkpoint və sonrakı JSON-ları oxuyaraq hansı Parquet fayllarının hazırda aktiv olduğunu öyrənir. Bu, eyni anda yazma və oxuma zamanı toqquşmaları aradan qaldırır və tam Atomar, Konsistent (ACID) nəticə verir.
<!-- answer-end -->

### Sual 2: Apache Iceberg-də "Hidden Partitioning" (Gizli Partisiya) nədir və ənənəvi Hive partisiyasından nə ilə fərqlənir?
<!-- answer-start -->
**Cavab:** Ənənəvi Hive partisiyasında istifadəçi sorğu yazarkən fiziki partisiya sütununu bilməli idi (məsələn: `WHERE date_col = '2026-10-20'`). Əgər istifadəçi yalnız timestamp sütununu yazsaydı, bütün cədvəl skan olunurdu. Iceberg-də isə partisiya funksiyası gizlidir: cədvəl `days(event_time)` ilə partisiya olunubsa, istifadəçi sadəcə `WHERE event_time >= '2026-10-20'` yazdıqda Iceberg arxa planda yalnız həmin günün fayllarını açır və digər partisiya fayllarını dərhal ixtisar edir.
<!-- answer-end -->

### Sual 3: Lakehouse-da "Small Files Problemi" nədir və `OPTIMIZE / Compaction` onu necə aradan qaldırır?
<!-- answer-start -->
**Cavab:** Streaming və tez-tez icra olunan batch ETL-lərdə S3-ə minlərlə xırda (bir neçə kilobaytlıq) Parquet faylı yazılır. Sorğu mühərrikləri (Trino, Athena, Spark) minlərlə fayl üçün ayrı-ayrı şəbəkə API bağlantısı açmağa məcbur qalır və sorğu ləngiyir. `OPTIMIZE` (Delta) və `rewrite_data_files` (Iceberg) arxa planda bu xırda faylları oxuyub 500 MB – 1 GB-lıq optimal böyük Parquet fayllarına birləşdirir (**Bin-packing**) və köhnə xırda faylları metadatadan xaric edir.
<!-- answer-end -->
