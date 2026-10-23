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

PostgreSQL-i SQL Server-dən fərqləndirən iki ən fundamental sütun var: **müstəqil proses modeli** və **sənədlərin təkrar yazılmaması (MVCC)** fəlsəfəsi.

### Proses Modeli: İşçilər və Fərdi Otaqlar
Microsoft SQL Server tək bir böyük proses daxilində çoxlu yüngül axınlarla (threads) işləyir. PostgreSQL isə əməliyyat sistemi səviyyəsində hər bir istifadəçi qoşulması üçün tam müstəqil ayrıca bir proses (`Backend Worker`) yaradır. Bu proseslər bir-birinin yaddaşına birbaşa müdaxilə edə bilməz; yalnız ortaq ayrılmış yaddaş sahəsi (`shared_buffers`) vasitəsilə ünsiyyət qururlar.

### MVCC: Karandaşla Pozmaq Əvəzinə Yeni Vərəq Əlavə Etmək
PostgreSQL-də mövcud sətir üzərində `UPDATE` icra edildikdə köhnə məlumat dərhal silinmir və ya yerində dəyişdirilmir. Köhnə sətrin üzərinə "etibarsızdır" möhürü vurulur və cədvələ təzə bir sətir əlavə edilir. Bu səbəbdən **oxuyanlar yazanları, yazanlar isə oxuyanları heç vaxt bloklamır**.

### VACUUM: Zibil Toplama Xidməti
Ləğv edilmiş köhnə sətirlər (`Dead Tuples`) diskdə qalır və cədvəlin süni şişməsinə (`Table Bloat`) səbəb olur. `Autovacuum` arxa planda işləyərək həmin ölü sətirlərin yerini sonrakı yeni yazmalar üçün təkrar istifadəyə açır.

> [!TIP]
> **Müsahibədə belə de:**
> "PostgreSQL-in ən böyük gücü onun MVCC arxitekturasındadır: `SELECT` sorğuları `INSERT`/`UPDATE` əməliyyatlarını bloklamır. Lakin Data Mühəndisi olaraq bilməliyəm ki, intensiv ETL və batch yeniləmələrdə bu mexanizm Dead Tuples və Table Bloat yaradır. Buna görə də `autovacuum_vacuum_scale_factor` və `work_mem` parametrlərini düzgün tənzimləmək, analitik partisiya cədvəllərində isə kiçik həcmli və sürətli `BRIN` indekslərindən istifadə etmək vacibdir."

---

## 2. Əsas anlayışlar

### 2.1. Proses və Yaddaş Memarlığı

PostgreSQL serveri işə düşdükdə əsas idarəedici proses olan **Postmaster** başlayır. O, 5432 portunu dinləyir və hər yeni müştəri bağlantısı daxil olduqda `fork()` sistemi çağırışı ilə ayrıca `postgres` backend prosesi yaradır.

Yaddaş strukturu iki yerə bölünür: bütün proseslərin ortaq istifadə etdiyi **Shared Memory** və hər bir prosesə fərdi ayrılan **Local Memory**.

#### PostgreSQL Yaddaş Sahələrinin Təyinat Cədvəli

| Yaddaş Sahəsi | Növü | Standart Dəyər | İstehsalat (Production) Tövsiyəsi | Təyinatı və Kritik Qeyd |
| :--- | :--- | :--- | :--- | :--- |
| `shared_buffers` | Ortaq (Shared) | 128 MB | Server RAM-ının 25%-i | Verilənlər bazasının əsas disk səhifələri keşidir. Qalan RAM ƏS-nin öz keşinə (OS Page Cache) saxlanılır. |
| `wal_buffers` | Ortaq (Shared) | -1 (Avtomatik ~16 MB) | 16 MB – 64 MB | Tranzaksiya qeydlərinin diska (WAL fayllarına) yazılmazdan əvvəl saxlandığı tranzit bufer. |
| `work_mem` | Fərdi (Local) | 4 MB | 32 MB – 64 MB (Qlobal) | `ORDER BY`, `DISTINCT`, `Hash Join` və `Merge Join` əməliyyatları üçün ayrılan yaddaş. **Sorğu üzrə deyil, hər bir hesablama operatoru üzrə ayrılır!** |
| `maintenance_work_mem` | Fərdi (Local) | 64 MB | 512 MB – 2 GB | `VACUUM`, `CREATE INDEX`, `ALTER TABLE` kimi inzibati əməliyyatların sürətləndirilməsi üçün geniş yaddaş sahəsi. |

#### Niyə `work_mem` Xüsusi Diqqət Tələb Edir?
Əgər mürəkkəb bir analitik sorğuda 4 ədəd `Hash Join` və 1 ədəd `ORDER BY` varsa, həmin sorğu üçün tək bir bağlantı $5 \times \text{work\_mem}$ qədər operativ yaddaş xərcləyə bilər. Əgər 100 paralel bağlantı olarsa, `work_mem` yüksək seçildikdə server qəfil Linux OOM (Out Of Memory) Killer tərəfindən dayandırıla bilər.

---

### 2.2. MVCC Mexanizmi, Dead Tuples və Autovacuum

PostgreSQL cədvəlindəki hər bir sətrin (Tuple) gizli sistem sütunları mövcuddur:

- `xmin`: Bu sətri bazaya daxil edən (`INSERT`) tranzaksiyanın identifikatoru.
- `xmax`: Bu sətri silən (`DELETE`) və ya yeniləyən (`UPDATE`) tranzaksiyanın identifikatoru (hələ silinməyibsə 0 olur).

#### Bir Sətir Yenilənəndə Nə Baş Verir?
Tutaq ki, `tx_id = 100` olan tranzaksiya sığorta müqaviləsinin mükafat məbləğini yeniləyir:
1. Mövcud sətrin `xmax` dəyəri 100 olaraq qeyd edilir (köhnə versiya ləğv edilir).
2. Cədvəlin sonuna yeni sətir əlavə edilir, onun `xmin` dəyəri 100, `xmax` dəyəri isə 0 təyin olunur.
3. 100 nömrəli tranzaksiya bitdikdən sonra artıq heç bir digər tranzaksiyanın ehtiyac duymadığı köhnə sətir **Dead Tuple** (ölü sətir) adlanır.

#### VACUUM Növlərinin Fərqi

| Xüsusiyyət | Standart `VACUUM` | `VACUUM FULL` | `pg_repack` (Tövsiyə olunan) |
| :--- | :--- | :--- | :--- |
| **Kilidləmə (Locking)** | Yüngül kilid. Oxuma və yazmanı bloklamır. | `ACCESS EXCLUSIVE`. Cədvəli tamamilə bağlayır! | Yalnız qısa müddətli keçid kilidi tələb edir. |
| **Disk Sahəsi** | Diski ƏS-yə qaytarmır; yerini sonrakı `INSERT`-lər üçün azad edir. | Bütün cədvəli yenidən yazır və diski ƏS-yə qaytarır. | Cədvəli arxa planda kopyalayaraq diski ƏS-yə qaytarır. |
| **İstehsalatda İstifadəsi** | Daimi arxa plan rejimi (`autovacuum`). | Canlı sistemdə **qadağandır** (sistemi dondurur). | İri cədvəllərdə şişməni (Bloat) aradan qaldırmaq üçün idealdır. |

#### Autovacuum Parametrlərinin Tənzimlənməsi (Tuning)
PostgreSQL standart olaraq cədvəldəki sətirlərin 20%-i dəyişdikdə təmizləməyə başlayır:
$$\text{Dəyişmə Həddi} = \text{autovacuum\_vacuum\_threshold} + (\text{autovacuum\_vacuum\_scale\_factor} \times \text{Cədvəldəki Sətirlər})$$

10 milyon sətirlik sığorta polisləri cədvəlində 20% dəyişikliyi (2 milyon sətir) gözləmək diskin sürətlə şişməsinə səbəb olar. Buna görə böyük cədvəllər üçün `scale_factor` 0.02 (2%)-ə qədər endirilməlidir:
```sql
-- Dialect: PostgreSQL
ALTER TABLE public.policies SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_threshold = 1000
);
```

---

### 2.3. İndeks Növləri: B-tree, GIN, BRIN və GiST

PostgreSQL Data Mühəndisliyi üçün müxtəlif indeks mexanizmləri təqdim edir:

| İndeks Növü | Açılışı və Əsas Xüsusiyyəti | Ən Yaxşı İstifadə Yeri | Disk və RAM Həcmi |
| :--- | :--- | :--- | :--- |
| **B-tree** | Balanced Tree. Standart sıralı ağac indeksi. | Bərabərlik (`=`) və diapazon (`BETWEEN`, `<`, `>`) axtarışları. | Böyük cədvəllərdə xeyli yer tutur (10-30% həcm). |
| **GIN** | Generalized Inverted Index (Tərsinə Çevrilmiş). | `JSONB` daxilində axtarış, Massivlər (`INT[]`), Tam mətn axtarışı (`tsvector`). | Yazma əməliyyatında nisbətən ağırdır, lakin axtarış çox sürətlidir. |
| **BRIN** | Block Range Index. 128 səhifəlik blok üçün Min/Max saxlayır. | Ardıcıl artan tarixi cədvəllər (Polislərin tarixi, loqlar, tranzaksiyalar). | **Ultra yüngüldür.** B-tree-nin 1%-i qədər yer tutur. |
| **GiST** | Generalized Search Tree. Həndəsi və aralıq axtarışı. | Coğrafi koordinatlar (PostGIS), zaman intervallarının kəsişməsi (`tsrange`). | Çoxölçülü məlumatlar üçün zəruridir. |
| **Partial Index** | Şərti indeks (`WHERE is_active = true`). | Cədvəlin yalnız müəyyən statuslu hissəsi tez-tez axtarıldıqda. | İndeks həcmini 80–90% azaldır. |

---

### 2.4. `EXPLAIN (ANALYZE, BUFFERS)` və Sorğu İcrası

Sorğunun icra mexanizmini yoxlamaq üçün `EXPLAIN` əmrindən istifadə olunur:
- `EXPLAIN`: Sorğunu icra etmədən yalnız planlaşdırıcının (Planner/Optimizer) riyazi ehtimalını göstərir.
- `EXPLAIN (ANALYZE, BUFFERS)`: Sorğunu bazada **həqiqətən icra edir**, real vaxtı (`actual time`) və operativ yaddaş istifadəsini göstərir.

#### Əsas Skan Strategiyaları
- **Seq Scan (Sequential Scan)**: Cədvəlin bütün bloklarının ardıcıl oxunması. Cədvəl kiçik olduqda və ya sətirlərin 50%-dən çoxu seçildikdə ən sürətli seçimdir.
- **Index Scan**: İndeks ağacı üzrə axtarış aparır və uyğun gələn hər bir sətir üçün əsas cədvəl faylından (Heap) məlumatı oxuyur.
- **Index Only Scan**: Sorğuda tələb olunan bütün sütunlar indeksin özündə var və Visibility Map-ə əsasən cədvələ müraciət etməyə ehtiyac qalmır.
- **Bitmap Scan**: Çoxlu indeks nəticələrini yaddaşda xəritələşdirir (`Bitmap Index Scan`), sonra cədvələ optimal blok sırası ilə müraciət edir (`Bitmap Heap Scan`).

---

### 2.5. Partisiya, JSONB və Əlavə Alətlər

#### Declarative Partitioning (Bəyannaməli Partisiya)
PostgreSQL 10-dan etibarən daxili partisiya mexanizmi təklif edir:
- **Range Partitioning**: Tarix və ya rəqəm aralığı üzrə (məsələn, hər il üçün ayrıca sığorta polisləri cədvəli).
- **List Partitioning**: Konkret dəyərlər siyahısı üzrə (məsələn, filial və ya region koduna görə).
- **Hash Partitioning**: Açara hash funksiyası tətbiq edərək bərabər paylama.
- **Partition Pruning**: Planlaşdırıcı sorğunun `WHERE` şərtinə baxaraq aidiyyəti olmayan partisiya cədvəllərini dərhal dövriyyədən çıxarır və I/O xərcini minimuma endirir.

#### JSONB və Strukturlaşdırılmamış Məlumatlar
PostgreSQL-də iki JSON növü var: sadə mətn kimi saxlayan köhnə `JSON` və parse olunmuş ikili formatda saxlanan `JSONB`. Data mühəndisliyində həmişə `JSONB` seçilir, çünki o, boşluqları silir, açarları sıralayır və birbaşa GIN indeksləri ilə indekslənə bilir.

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: Partisiya Cədvəllərinin Yaradılması (Range Partitioning)

Böyük sığorta polisləri cədvəlinin illər üzrə partisiya edilməsi və BRIN indeksinin qurulması:

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
    PRIMARY KEY (policy_id, issue_date) -- Partisiya açarı mütləq PK tərkibində olmalıdır
) PARTITION BY RANGE (issue_date);

-- 2025-ci il üçün partisiya cədvəli
CREATE TABLE public.policies_y2025 PARTITION OF public.policies_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 2026-cı il üçün partisiya cədvəli
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

Sığorta müqaviləsinin dinamik risk parametrlərinin axtarışı:

:::tabs
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL (JSONB və GIN indeksi)
CREATE TABLE public.claims_audit (
    claim_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    claim_number VARCHAR(50) NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- JSONB üzərində GIN indeksi (Bütün daxili açar və dəyərlər indekslənir)
CREATE INDEX idx_claims_details_gin ON public.claims_audit USING GIN (details);

-- İndeks dəstəkli sürətli mövcudluq axtarışı (@> operatoru)
SELECT claim_number, details->>'hospital_name' AS hospital
FROM public.claims_audit
WHERE details @> '{"medical_claim": true, "approved": true}';
```
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server: JSON_VALUE və Computed Column)
CREATE TABLE dbo.ClaimsAudit (
    ClaimID INT IDENTITY(1,1) PRIMARY KEY,
    ClaimNumber VARCHAR(50) NOT NULL,
    Details NVARCHAR(MAX) NOT NULL, -- SQL Server-də xüsusi JSON tipi yoxdur, NVARCHAR-dir
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

Sorğunun icra vaxtı və operativ yaddaş (RAM) buferlərinin monitorinqi:

```sql
-- Dialect: PostgreSQL
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
> **Canlı İstehsalatda (Production) `VACUUM FULL` İcra Etmək**
> Diskin dolduğunu görən təcrübəsiz mühəndis dərhal `VACUUM FULL` əmrini işə salır. Bu zaman PostgreSQL həmin cədvəli `ACCESS EXCLUSIVE` kilidinə alır; saytda və mobil tətbiqdə polisin yaradılması və ödənişlər tamamilə dayanır və sistem çökür.
> **Düzgün həll:** Müntəzəm kiçik `VACUUM` işlətmək və ya kəsilməsiz disk boşaldılması üçün `pg_repack` uzantısından (extension) istifadə etmək.

> [!NOTE]
> **`work_mem` Parametrini Server Səviyyəsində Həddən Artıq Böyütmək**
> `postgresql.conf`-da `work_mem = 1GB` təyin etmək serverin qəfil OOM (Out of Memory) xətası ilə çökməsinə səbəb ola bilər. Çünki 50 paralel qoşulmada hər bir mürəkkəb çeşidləmə və ya birləşdirmə qovşağı üçün ayrıca 1 GB ayrılacaq.
> **Düzgün həll:** `work_mem`-i qlobal olaraq 32–64 MB saxlamaq, yalnız xüsusi ağır gecə ETL sessiyalarında `SET work_mem = '512MB';` əmri ilə sessiya səviyyəsində artırmaq lazımdır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya Tələbi:** *"Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi... Optimal performans, biznesin davamlılığı, data bütövlüyü."*
- **Sənin Rolun:** 
  1. Köhnə SQL Server-dəki T-SQL cədvəl və prosedurlarını PostgreSQL PL/pgSQL formatına uyğunlaşdırmaq.
  2. Yeni qurulan PostgreSQL bazasında `autovacuum` tənzimləmələrini sığorta hadisələrinin intensivliyinə uyğun nizamlamaq.
  3. Böyük tarixi sığorta müqavilələri cədvəllərində B-tree əvəzinə BRIN və partisiya strategiyasını tətbiq edərək RAM və diski qorumaq.
  4. `pg_stat_statements` və `EXPLAIN (ANALYZE, BUFFERS)` ilə ən ağır sorğuları davamlı monitorinq etmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: PostgreSQL-də BRIN indeksi nədir və B-tree indeksindən hansı üstünlüyü var?
<!-- answer-start -->
**Cavab:** BRIN (Block Range Index) cədvəlin hər bir fərdi sətrini deyil, ardıcıl fiziki səhifələr blokunu (standart olaraq 128 səhifəni) əhatə edir və həmin blok üçün yalnız Minimum və Maximum dəyərləri saxlayır. Əgər məlumat diskdə təbii olaraq ardıcıl düzülübsə (məsələn, hər gün əlavə olunan sığorta hadisələri və tarixlər), BRIN indeksi B-tree ilə müqayisədə **99% daha az disk və RAM sahəsi tutur** (məsələn, 10 GB cədvəl üçün cəmi 50 KB indeks!) və axtarış zamanı kənar blokları dərhal ixtisar edir.
<!-- answer-end -->

### Sual 2: MVCC arxitekturasında bir sətri `UPDATE` etdikdə fiziki olaraq nə baş verir?
<!-- answer-start -->
**Cavab:** Köhnə sətir dərhal silinmir və ya yerində dəyişdirilmir. Həmin sətrin `xmax` sahəsinə cari tranzaksiyanın ID-si yazılır (yəni ləğv edilmiş kimi qeyd olunur). Cədvəlin sonuna isə yeni dəyərlərlə təzə bir sətir əlavə olunur və onun `xmin`-i cari tranzaksiya ID-si olur. Aktiv tranzaksiyalar bitdikdən sonra köhnə sətir "Dead Tuple" (ölü sətir) halına gəlir və yalnız `VACUUM` keçdikdən sonra onun yeri təkrar istifadəyə yararlı olur.
<!-- answer-end -->

### Sual 3: `work_mem` parametri ilə `shared_buffers` arasındakı əsas fərq nədir?
<!-- answer-start -->
**Cavab:** `shared_buffers` server səviyyəsində bütün proseslər tərəfindən ortaq istifadə olunan qlobal RAM keşidir (disk səhifələrini saxlayır). `work_mem` isə qlobal deyil; hər bir sorğu daxilindəki hər bir çeşidləmə (`ORDER BY`, `DISTINCT`) və ya `Hash Join` əməliyyatı üçün ayrılan fərdi işçi yaddaşdır. Buna görə də `work_mem` çox ehtiyatla təyin olunmalıdır, əks halda çoxlu paralel qoşulmada RAM tam tükənə bilər.
<!-- answer-end -->
