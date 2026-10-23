---
id: "03-postgresql-internals"
slug: "postgresql-memarligi"
order: 3
title: "PostgreSQL Daxili Memarlığı və İdarə Edilməsi"
category: "PostgreSQL"
priority: "high"
readiness: "orta"
vacancyLink: "Microsoft SQL Server-dən PostgreSQL-ə miqrasiya olunmuş mühitin optimal performansı və arxitektura standartlarının tətbiqi"
tags: ["PostgreSQL", "MVCC", "VACUUM", "Autovacuum", "GIN", "BRIN", "EXPLAIN ANALYZE", "Partitioning", "PL/pgSQL", "JSONB", "Logical Replication"]
summary: "Proses modeli, yaddaş strukturu (shared_buffers, work_mem), MVCC mexanizmi, autovacuum tənzimlənməsi, indeks növləri (B-tree, GIN, BRIN), partisiya və JSONB."
---

# PostgreSQL Daxili Memarlığı və İdarə Edilməsi

## 1. Qısa izah (Sadə dildə və analogiya ilə)

PostgreSQL-i SQL Server-dən fərqləndirən əsas xüsusiyyət onun **avtonom proses modeli** və **sənədlərin təkrar yazılmaması (Append-Only / MVCC)** fəlsəfəsidir:
- **Proses Modeli (İşçilər və Ofislər)**: SQL Server tək bir böyük proses daxilində çoxlu yüngül axınlarla (Threads) işləyir. PostgreSQL isə hər bir müştəri qoşulması (Client Connection) üçün əməliyyat sistemi səviyyəsində ayrıca bir müstəqil proses (**Backend Process**) açır. Bu proseslər bir-biri ilə mərkəzi ortaq yaddaş (**Shared Memory / shared_buffers**) vasitəsilə ünsiyyət qurur.
- **MVCC (Multi-Version Concurrency Control - Karandaşla deyil, yeni vərəqlə işləmək)**: PostgreSQL-də bir sətri `UPDATE` etdikdə, köhnə sətrin üzəri pozulmur! Köhnə sətrə "ləğv edildi" möhürü vurulur (`xmax` təyin olunur) və cədvəlin sonuna yeni sətir əlavə olunur (`xmin` yeni tranzaksiya olur). Nəticədə **oxuyanlar yazanları, yazanlar isə oxuyanları heç vaxt bloklamır**!
- **VACUUM (Təmizlikçi Briqadası)**: Köhnə ləğv edilmiş sətirlər (**Dead Tuples**) diskdə qalır və cədvəl şişir (**Table Bloat**). `Autovacuum` arxa planda gəzərək bu ölü sətirlərin yerini növbəti yazmalar üçün azad edir.

> [!TIP]
> **Müsahibədə belə de:**
> "PostgreSQL-in ən böyük gücü onun MVCC arxitekturasındadır: `SELECT` sorğuları heç vaxt `UPDATE` və `INSERT`-ləri bloklamır (və əksinə). Lakin Data Mühəndisi olaraq bilməliyəm ki, intensiv ETL və batch yeniləmələrdə bu xüsusiyyət Dead Tuples və Table Bloat yaradır. Buna görə də `autovacuum_vacuum_scale_factor` və `work_mem` parametrlərini düzgün tənzimləmək, analitik partisiya cədvəllərində isə kiçik həcmli və sürətli `BRIN` indekslərindən istifadə etmək vacibdir."

---

## 2. Əsas anlayışlar

### 2.1. Proses və Yaddaş Memarlığı
- **Postmaster (Əsas Proses)**: Server işə düşəndə başlayan ana prosesdir. Şəbəkə portunu (5432) dinləyir və hər yeni qoşulma üçün yeni `postgres` prosesi (Backend Worker) yaradır (`fork`).
- **Yaddaş Sahələri**:
  - `shared_buffers`: Verilənlər bazasının əsas RAM keşidir (SQL Server-dəki Buffer Pool kimi). Adətən server RAM-ının 25%-i qədər təyin olunur (çünki PostgreSQL həm də əməliyyat sisteminin OS File Cache-indən istifadə edir).
  - `wal_buffers`: Dəyişikliklərin WAL fayllarına yazılmazdan əvvəl saxlandığı kiçik bufer.
  - `work_mem`: **Çox kritik parametr!** Hər bir çeşidləmə (`ORDER BY`, `DISTINCT`) və `Hash Join` əməliyyatı üçün ayrılan yaddaşdır. Bu parametr hər bir sorğu üçün deyil, **sorğu daxilindəki hər bir çeşidləmə/hesablama operatoru üçün** ayrıca ayrılır! Əgər 100 paralel qoşulma varsa və `work_mem = 64MB` qoyulubsa, server bir anda $100 \times 64\text{MB} = 6.4\text{GB}$ RAM tələb edə bilər.
  - `maintenance_work_mem`: `VACUUM`, `CREATE INDEX` və `ALTER TABLE` kimi texniki xidmət əməliyyatları üçün ayrılan geniş yaddaş sahəsi.

---

### 2.2. MVCC, Dead Tuples və Autovacuum
- **`xmin` və `xmax`**: Hər bir cədvəl sətrinin (Tuple) gizli başlıq sahəsidir.
  - `xmin`: Bu sətri yaradan tranzaksiyanın ID-si.
  - `xmax`: Bu sətri silən və ya yeniləyən tranzaksiyanın ID-si (əgər hələ silinməyibsə 0 olur).
- **Dead Tuples (Ölü Sətirlər)**: `DELETE` və ya `UPDATE` nəticəsində artıq heç bir aktiv tranzaksiyanın görmədiyi köhnə versiyalar.
- **Table Bloat (Cədvəlin Şişməsi)**: Əgər ölü sətirlər vaxtında təmizlənməsə, cədvəl faylları diskdə süni şəkildə böyüyür və `Seq Scan` sorğuları ləngiyir.
- **`VACUUM` növləri**:
  - Standart `VACUUM`: Cədvəli kilidləmir. Ölü sətirlərin yerini "boş" kimi qeyd edir (Free Space Map - FSM) ki, gələcək `INSERT`-lər həmin yerə yazılsın. Lakin diski əməliyyat sisteminə qaytarmır.
  - `VACUUM FULL`: Cədvəli tam oxuyub yeni fayla yazır, diski ƏS-yə qaytarır. **Lakin cədvəli `Exclusive Lock` ilə tam bağlayır!** Production mühitində kəsilməsiz işləyən sığorta sistemlərində `VACUUM FULL` əvəzinə `pg_repack` aləti istifadə olunur.
- **Autovacuum Tuning**:
  - `autovacuum_vacuum_threshold` (baza sətir sayı, standart 50).
  - `autovacuum_vacuum_scale_factor` (cədvəl faizi, standart 0.2 və ya 20%).
  - Milyonlarla sətir olan sığorta cədvəllərində 20% dəyişikliyi gözləmək autovacuum-un gecikməsinə səbəb olur. Həll: iri cədvəllər üçün xüsusi olaraq scale factor-u 0.05 (5%)-ə endirmək.
- **Transaction ID Wraparound**: 32-bit tranzaksiya sayğacı ~2 milyarddan sonra sıfırlana bilər. Bunun qarşısını almaq üçün PostgreSQL köhnə tranzaksiyaları "Dondurur" (**Freeze**).

---

### 2.3. İndeks Növləri: B-tree, GIN, GiST, BRIN
- **B-tree (Balanced Tree)**: Standart indeks növü. `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN` əməliyyatları üçün ən sürətlidir.
- **GIN (Generalized Inverted Index - Tərsinə Çevrilmiş İndeks)**:
  - Tək bir sahə daxilində çoxlu elementlər saxlandıqda istifadə olunur (məsələn: Massivlər `INTEGER[]`, `JSONB` sənədləri, tam mətn axtarışı `tsvector`).
  - Kitabın sonundakı sözlər göstəricisi kimidir: Hər bir daxili açar üçün sətirlərin siyahısını saxlayır.
- **BRIN (Block Range Index - Blok Aralığı İndeksi)**:
  - **Data Engineering üçün super silah!**
  - Hər 128 səhifəlik (Pages) blok üçün yalnız `Minimum` və `Maximum` dəyərləri saxlayır.
  - Təbii olaraq ardıcıl artan böyük cədvəllərdə (Audit loqları, sığorta hadisələri tarixi, zaman sıraları - Time Series) nəhəng 50 GB-lıq B-tree indeksi əvəzinə cəmi **10–50 MB** yer tutur və Buffer Pool-u qoruyur.
- **Partial Index (Qismən İndeks)**: `CREATE INDEX ... WHERE is_active = TRUE;` — Yalnız aktiv polisləri indeksləyir, indeksin ölçüsünü 90% kiçildir.

---

### 2.4. `EXPLAIN ANALYZE` və Performans Diaqnostikası
- `EXPLAIN`: Sorğunun icra olunmadan təxmini planını göstərir (Cost, Rows, Width).
- `EXPLAIN (ANALYZE, BUFFERS)`: Sorğunu **həqiqətən icra edir**, real vaxtı (`actual time`), real sətir sayını və operativ yaddaş buferlərini göstərir:
  - `shared hit`: Məlumat RAM-dan (shared_buffers) oxundu (çox sürətli).
  - `shared read`: Məlumat birbaşa diskdən oxundu (I/O xərci).
- **Əsas Skan Metodları**:
  - `Seq Scan`: Bütün cədvəlin ardıcıl oxunması.
  - `Index Scan`: İndeksdən tapıb əsas cədvələ müraciət etmək.
  - `Index Only Scan`: Bütün lazım olan sütunlar indeksdədir və Visibility Map-ə əsasən cədvələ getməyə ehtiyac yoxdur.
  - `Bitmap Index Scan + Bitmap Heap Scan`: Şərtə uyğun gələn səhifələrin xəritəsini çıxarıb cədvələ toplu müraciət etmək (çoxlu indeks şərtlərini `AND/OR` ilə birləşdirəndə əladır).

---

### 2.5. Partisiya, JSONB, PL/pgSQL və Məntiqi Replikasiya
- **Declarative Partitioning (Bəyannaməli Partisiya)**: `PARTITION BY RANGE (issue_date)`, `PARTITION BY LIST (region_code)`, `PARTITION BY HASH (customer_id)`. Optimizer yalnız lazım olan partisiyanı oxuyur (**Partition Pruning**).
- **JSONB**: İkili (Binary) formatda saxlanılan JSON. Məlumat daxil edilərkən parse olunur, boşluqlar təmizlənir, açarlar sıralanır. GIN indeksləri ilə tam inteqrasiya olunur (`@>` operatoru).
- **Identity vs Sequences**: Köhnə `SERIAL` yerinə müasir SQL standartı olan `GENERATED ALWAYS AS IDENTITY` istifadə olunmalıdır.
- **Məntiqi Replikasiya (Logical Replication)**: WAL loqlarını məntiqi dəyişikliklərə (INSERT/UPDATE/DELETE) çevirərək `PUBLICATION` və `SUBSCRIPTION` modeli ilə digər bazalara və ya Debezium vasitəsilə Kafka-ya axıdır. Kəsilməsiz miqrasiyaların əsas sütunudur.

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: Partisiya Cədvəllərinin Yaradılması (Range Partitioning)

Böyük sığorta polisləri cədvəlinin illər üzrə partisiya edilməsi:

:::tabs
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL (Declarative Range Partitioning)
CREATE TABLE public.policies_partitioned (
    policy_id INT GENERATED ALWAYS AS IDENTITY,
    customer_id INT NOT NULL,
    policy_number VARCHAR(50) NOT NULL,
    premium NUMERIC(18,2) NOT NULL,
    issue_date DATE NOT NULL,
    PRIMARY KEY (policy_id, issue_date) -- Partisiya açarı PK daxilində olmalıdır
) PARTITION BY RANGE (issue_date);

-- 2025-ci il üçün partisiya
CREATE TABLE public.policies_y2025 PARTITION OF public.policies_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 2026-cı il üçün partisiya
CREATE TABLE public.policies_y2026 PARTITION OF public.policies_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Tarix üzrə ultra-kompakt BRIN indeksi
CREATE INDEX idx_policies_y2026_brin ON public.policies_y2026 USING BRIN (issue_date);
```
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server: Partition Function & Scheme)
-- 1. Partisiya funksiyası
CREATE PARTITION FUNCTION pf_PolicyYears (DATE)
AS RANGE RIGHT FOR VALUES ('2025-01-01', '2026-01-01', '2027-01-01');

-- 2. Partisiya sxemi
CREATE PARTITION SCHEME ps_PolicyYears
AS PARTITION pf_PolicyYears TO ([PRIMARY], [PRIMARY], [PRIMARY], [PRIMARY]);

-- 3. Cədvəlin sxem üzərində yaradılması
CREATE TABLE dbo.Policies_Partitioned (
    PolicyID INT IDENTITY(1,1),
    CustomerID INT NOT NULL,
    PolicyNumber VARCHAR(50) NOT NULL,
    Premium DECIMAL(18,2) NOT NULL,
    IssueDate DATE NOT NULL,
    CONSTRAINT PK_Policies PRIMARY KEY CLUSTERED (PolicyID, IssueDate)
) ON ps_PolicyYears (IssueDate);
```
:::

---

### Nümunə 2: JSONB İdarə Edilməsi və GIN İndeksi

Sığorta müqaviləsinin dinamik risk parametrlərinin JSONB daxilində axtarışı:

:::tabs
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL
CREATE TABLE public.claims_audit (
    claim_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    claim_number VARCHAR(50) NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- JSONB üzərində GIN indeksi (Bütün daxili açar və dəyərlər indekslənir)
CREATE INDEX idx_claims_details_gin ON public.claims_audit USING GIN (details);

-- Sürətli indeksli axtarış (@> operatoru)
SELECT claim_number, details->>'hospital_name' AS hospital
FROM public.claims_audit
WHERE details @> '{"medical_claim": true, "approved": true}';
```
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server: OPENJSON və JSON_VALUE)
CREATE TABLE dbo.ClaimsAudit (
    ClaimID INT IDENTITY(1,1) PRIMARY KEY,
    ClaimNumber VARCHAR(50) NOT NULL,
    Details NVARCHAR(MAX) NOT NULL, -- SQL Server-də JSON xüsusi tip deyil, NVARCHAR-dir
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- JSON axtarışı üçün hesablanmış sütun (Computed Column) və indeks
ALTER TABLE dbo.ClaimsAudit 
ADD IsApproved AS JSON_VALUE(Details, '$.approved');

CREATE INDEX IX_ClaimsAudit_Approved ON dbo.ClaimsAudit(IsApproved);

-- JSON daxilindən oxuma
SELECT 
    ClaimNumber, 
    JSON_VALUE(Details, '$.hospital_name') AS Hospital
FROM dbo.ClaimsAudit
WHERE JSON_VALUE(Details, '$.approved') = 'true';
```
:::

---

### Nümunə 3: `EXPLAIN (ANALYZE, BUFFERS)` Diaqnostikası

```sql
-- Dialect: PostgreSQL
-- Sorğunun icra planı və RAM bufer istifadəsi
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    p.policy_number,
    p.premium,
    c.claim_amount
FROM public.policies p
LEFT JOIN public.claims c ON p.policy_id = c.policy_id
WHERE p.issue_date >= '2026-01-01'
ORDER BY p.premium DESC
LIMIT 10;
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: `VACUUM FULL`-u Canlı İstehsalatda (Production) İşə Salmaq**
> Diskin dolduğunu görən təcrübəsiz mühəndis dərhal `VACUUM FULL` işə salır. Bu zaman PostgreSQL həmin cədvəli `ACCESS EXCLUSIVE` kilidinə alır; saytda və mobil tətbiqdə polisin yaradılması və ödənişlər tamamilə dayanır və sistem çökür. **Düzgün həll:** Müntəzəm kiçik `VACUUM` işlətmək və ya kəsilməsiz disk boşaldılması üçün rəsmi `pg_repack` uzantısından (extension) istifadə etmək.

> [!NOTE]
> **Qeyd: `work_mem` parametrini server səviyyəsində həddən artıq böyütmək**
> `postgresql.conf`-da `work_mem = 1GB` təyin etmək serverin qəfil OOM (Out of Memory) xətası ilə çökməsinə səbəb ola bilər. Çünki 50 nəfər analitik eyni anda mürəkkəb çoxqatlı sorğu göndərsə, hər bir `Hash/Sort` nodu üçün ayrıca 1 GB ayrılacaq. `work_mem`-i qlobal olaraq 32–64 MB saxlamaq, yalnız xüsusi ağır gecə ETL sessiyalarında `SET work_mem = '512MB';` əmri ilə yerli artırmaq lazımdır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi... Optimal performans, biznesin davamlılığı, data bütövlüyü."*
- **Sənin rolun**: Köhnə SQL Server-dəki T-SQL obyektlərini PostgreSQL PL/pgSQL formatına uyğunlaşdırmaq; yeni qurulan PostgreSQL bazasında `autovacuum` tənzimləmələrini sığorta hadisələrinin tezliyinə uyğun nizamlamaq; böyük tarixi cədvəllər üçün BRIN və partisiya strategiyasını tətbiq etmək; `pg_stat_statements` ilə ən ağır sorğuları davamlı monitorinq etmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: PostgreSQL-də BRIN indeksi nədir və B-tree indeksindən hansı üstünlüyü var?
<!-- answer-start -->
**Cavab:** BRIN (Block Range Index) cədvəlin hər bir sətrini deyil, ardıcıl fiziki səhifələr blokunu (məsələn 128 səhifəni) əhatə edir və həmin blok üçün yalnız Minimum və Maximum dəyərləri saxlayır. Əgər məlumat diskdə təbii olaraq ardıcıl düzülübsə (məsələn, hər gün əlavə olunan sığorta hadisələri və tarixlər), BRIN indeksi B-tree ilə müqayisədə **99% daha az disk və RAM sahəsi tutur** (məsələn, 10 GB cədvəl üçün cəmi 50 KB indeks!) və axtarış zamanı kənar blokları dərhal ixtisar edir.
<!-- answer-end -->

### Sual 2: MVCC arxitekturasında bir sətri `UPDATE` etdikdə fiziki olaraq nə baş verir?
<!-- answer-start -->
**Cavab:** Köhnə sətir silinmir və ya yerində dəyişdirilmir. Həmin sətrin `xmax` sahəsinə cari tranzaksiyanın ID-si yazılır (yəni ləğv edilmiş kimi qeyd olunur). Cədvəlin sonuna isə yeni dəyərlərlə təzə bir sətir əlavə olunur və onun `xmin`-i cari tranzaksiya ID-si olur. Aktiv tranzaksiyalar bitdikdən sonra köhnə sətir "Dead Tuple" (ölü sətir) halına gəlir və yalnız `VACUUM` keçdikdən sonra onun yeri təkrar istifadəyə yararlı olur.
<!-- answer-end -->

### Sual 3: `work_mem` parametri ilə `shared_buffers` arasındakı əsas fərq nədir?
<!-- answer-start -->
**Cavab:** `shared_buffers` server səviyyəsində bütün proseslər tərəfindən ortaq istifadə olunan qlobal RAM keşidir (disk səhifələrini saxlayır). `work_mem` isə qlobal deyil; hər bir sorğu daxilindəki hər bir çeşidləmə (`ORDER BY`, `DISTINCT`) və ya `Hash Join` əməliyyatı üçün ayrılan fərdi işçi yaddaşdır. Buna görə də `work_mem` çox ehtiyatla təyin olunmalıdır, əks halda çoxlu paralel qoşulmada RAM tam tükənə bilər.
<!-- answer-end -->
