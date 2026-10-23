---
id: "04-sql-server-postgresql-miqrasiya"
slug: "sql-server-postgresql-miqrasiya"
order: 4
title: "SQL Server -> PostgreSQL Miqrasiyası (Dərin Bələdçi)"
category: "Miqrasiya"
priority: "high"
readiness: "oyrenmeliyem"
vacancyLink: "Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi (sxemlərin çevrilməsi, data bütövlüyü, biznesin davamlılığı, cutover plan, rollback)"
tags: ["Miqrasiya", "SQL Server", "PostgreSQL", "Data Types", "PL/pgSQL", "Cutover", "Rollback", "CDC", "Validation", "Debezium", "pgloader"]
summary: "Tiplərin və T-SQL əmrlərinin çevrilmə cədvəlləri, çətin obyektlər (CLR, Linked Server, SSIS, Agent), Big-Bang vs CDC, bütövlük yoxlaması, addım-addım Cutover və Rollback planı."
---

# SQL Server -> PostgreSQL Miqrasiyası (Dərin Bələdçi)

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Bir sığorta şirkətinin verilənlər bazasını Microsoft SQL Server-dən PostgreSQL-ə köçürmək **uçuş zamanı sərnişin təyyarəsinin mühərrikini dəyişməyə** bənzəyir:

### Biznesin Fasiləsizliyi
Müştərilər 24/7 saytdan və mobil tətbiqdən icbari və KASKO sığorta polisləri alır, yol qəzası baş verdikdə dərhal kompensasiya iddiası (claim) qaldırırlar. Sistemi 2 gün tam söndürmək (**Big-Bang**) sığorta biznesi üçün qəbuledilməz maliyyə və etibar itkisidir.

### Sxem və Məlumat Tipləri: Standart Adapterlər
Əgər boltlar və vintlər fərqli standartdadırsa (T-SQL-də `NVARCHAR`, `DATETIME2`, `BIT`, `IDENTITY`), yeni mühərrikə birbaşa bağlana bilməz. Əvvəlcədən dəqiq adapter cədvəli (**Data Type Mapping**) qurulmalıdır.

### Kəsilməsiz Keçid (CDC Near-Zero Downtime)
Təyyarə köhnə mühərriklə uçarkən, arxa planda yeni mühərrikə eyni yanacaq axını (Change Data Capture - CDC loqları) yönləndirilir. Hər iki mühərrik eyni dövrəyə çatdığı an, cəmi 5 dəqiqəlik qısa texniki fasilə ilə idarəetmə sükanı yeni mühərrikə (**Cutover**) verilir.

### Rollback (Geri Qayıdış Zəmanəti)
Əgər yeni mühərrikdə ilk saatlarda gözlənilməz texniki qüsur yaranarsa, sistemi təhlükəyə atmamaq üçün əvvəlcədən tərs replikasiya (**Reverse Replication**) qurulur və tək bir düymə ilə köhnə bazaya qayıdılır.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən real istehsalatda təkbaşına SQL Server -> PostgreSQL miqrasiyasını icra etməmişəm, lakin strukturlaşdırılmış yanaşmam tam hazırdır:
> 1) İnventarizasiya və asılılıq analizi (`sys.sql_expression_dependencies`).
> 2) DDL çevrilməsi və tip uyğunlaşdırılması (`NVARCHAR` → `TEXT/VARCHAR`, `BIT` → `BOOLEAN`, `IDENTITY` → `GENERATED ALWAYS AS IDENTITY`).
> 3) Tarixi məlumatın kütləvi yüklənməsi (`pgloader` və ya Spark JDBC).
> 4) CDC (Debezium / AWS DMS) ilə delta dəyişikliklərin fasiləsiz replikasiyası.
> 5) Məlumat bütövlüyünün ikiqat heş və cərgə sayı ilə sübutu (`MD5 / Checksum`).
> 6) Tərs replikasiya (Reverse CDC) ilə təmin olunmuş Rollback ssenarisi altında minimal downtime ilə Cutover."

---

## 2. Əsas anlayışlar və Müqayisə Cədvəlləri

### 2.1. Miqrasiya Axını Arxitekturası (End-to-End Migration Flow)

Aşağıdakı diaqram Atəşgah Sığorta üçün nəzərdə tutulmuş kəsilməsiz CDC miqrasiya axınını əks etdirir:

```
+----------------------------+                     +----------------------------+
|  MS SQL Server (Source)    |                     |   PostgreSQL (Target)      |
|  - Policies, Claims        |                     |   - public.policies        |
|  - Transaction Log (LDF)   |                     |   - public.claims          |
+--------------+-------------+                     +--------------^-------------+
               |                                                  |
       1. Tarixi Data (Bulk)                             4. Validasiya & Cutover
       pgloader / Spark JDBC                              Row Count & MD5 Checksum
               |                                                  |
               v                                                  |
+--------------+-------------+                     +--------------+-------------+
|    Tarixi Məlumat Yüklənməsi+-------------------->+   Hədəf Baza Replikasiyası |
+----------------------------+                     +--------------^-------------+
               |                                                  |
       2. Real-Time CDC                                  3. Tərs Replikasiya
       (Debezium / Kafka Connect)                         (Rollback Təhlükəsizliyi)
               |                                                  |
               +--------------------->[ KAFKA ]-------------------+
```

---

### 2.2. Data Type Mapping Cədvəli (SQL Server → PostgreSQL)

| SQL Server Tipi | PostgreSQL Qarşılığı | Səbəb və Diqqət Yetirilməli Məqam |
| :--- | :--- | :--- |
| `NVARCHAR(n)` / `NCHAR(n)` | `VARCHAR(n)` və ya `TEXT` | PostgreSQL standart olaraq UTF-8 istifadə edir; `N` prefiksinə ehtiyac yoxdur. Uzun mətnlərdə `TEXT` daha çevikdir. |
| `DATETIME2` / `DATETIME` | `TIMESTAMPTZ` | Sığorta polislərində saat qurşağı dəqiqliyi üçün hər zaman `TIMESTAMPTZ` (UTC) tövsiyə olunur. |
| `BIT` | `BOOLEAN` | SQL Server-də 0/1 idi, PostgreSQL-də doğma `TRUE`/`FALSE`. Tətbiq sorğularında `WHERE is_active = 1` yerinə `WHERE is_active = TRUE` yazılmalıdır. |
| `UNIQUEIDENTIFIER` | `UUID` | PostgreSQL-də `uuid-ossp` və ya daxili `gen_random_uuid()` funksiyası ilə işləyir. |
| `MONEY` / `SMALLMONEY` | `NUMERIC(19,4)` | `MONEY` tipi valyuta simvolu və yuvarlaqlaşdırma xətaları yarada bilər; maliyyə hesablamalarında mütləq `NUMERIC` istifadə olunur. |
| `IDENTITY(1,1)` | `GENERATED ALWAYS AS IDENTITY` | Köhnə `SERIAL` əvəzinə müasir SQL standartı olan `IDENTITY` tövsiyə olunur; ardıcıllıq (sequence) avtomatik idarə olunur. |
| `TINYINT` | `SMALLINT` | PostgreSQL-də 1 baytlıq işarəsiz ədəd yoxdur, ən kiçik tam ədəd 2 baytlıq `SMALLINT`-dir. |
| `VARBINARY(MAX)` / `IMAGE`| `BYTEA` | Şəkillər və sənəd skanları ikili (binary) `BYTEA` formatında saxlanılır. |
| `ROWVERSION` / `TIMESTAMP`| `BIGINT` və ya Sequence | SQL Server-də avtomatik artan 8-baytlıq ikili versiya idi; PostgreSQL-də trigger ilə yenilənən `BIGINT` və ya `xmin` ilə əvəzlənir. |

---

### 2.3. T-SQL → PL/pgSQL Sintaksis Çevrilmə Cədvəli

| Əməliyyat | Microsoft SQL Server (T-SQL) | PostgreSQL (PL/pgSQL) |
| :--- | :--- | :--- |
| **Sətir Məhdudiyyəti** | `SELECT TOP (10) * FROM ...` | `SELECT * FROM ... LIMIT 10;` |
| **Səhifələmə (Pagination)** | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` | `OFFSET 20 LIMIT 10;` |
| **NULL Əvəzləməsi** | `ISNULL(col, default_val)` | `COALESCE(col, default_val)` |
| **Sətir Birləşdirmə** | `col1 + ' ' + col2` | `col1 \|\| ' ' \|\| col2` və ya `CONCAT(col1, ' ', col2)` |
| **Cari Tarix/Vaxt** | `GETDATE()` və ya `SYSUTCDATETIME()` | `CURRENT_TIMESTAMP` və ya `CLOCK_TIMESTAMP()` |
| **Tarix Əlavə Etmək** | `DATEADD(day, 30, IssueDate)` | `issue_date + INTERVAL '30 days'` |
| **Tarix Fərqi** | `DATEDIFF(day, StartDate, EndDate)` | `(end_date - start_date)` və ya `DATE_PART('day', age)` |
| **Tranzaksiya Xətası** | `BEGIN TRY...BEGIN CATCH` | `BEGIN ... EXCEPTION WHEN OTHERS THEN` |
| **Upsert / Birləşdirmə** | `MERGE INTO Target USING Source ...` | `INSERT INTO ... ON CONFLICT (...) DO UPDATE` |
| **Dəyişən Sətirləri Alma**| `OUTPUT inserted.PolicyID, deleted.Status` | `RETURNING policy_id, status;` |
| **İdentifikator Dırnaqları** | `[PolicyID]`, `[Customer Name]` | `"policy_id"`, `"customer_name"` |
| **Hərf Həssaslığı** | Adətən `Case-Insensitive` (CI) | Standart olaraq `Case-Sensitive`; dırnaqsız kiçik hərflərə çevrilir |

---

### 2.4. Miqrasiyanın Ən Çətin Obyektləri və Həll Yolları

| Mürəkkəb Obyekt | SQL Server Təyinatı | PostgreSQL-də Əvəzləmə Yolu |
| :--- | :--- | :--- |
| **Dinamik SQL** | `sp_executesql` ilə sətirləri birləşdirmək | PL/pgSQL daxilində `EXECUTE format('SELECT * FROM %I WHERE id = $1', table_name) USING p_id;` |
| **SQL CLR (.NET C#)** | Baza daxilində C# kitabxanaları | `PL/Python`, `PL/Perl` və ya məntiqi bazadan çıxararaq xarici mikroservisə ötürmək |
| **Linked Servers** | Uzaq bazalara dörd hissəli adla müraciət | `postgres_fdw` (Foreign Data Wrapper) və ya `dblink` uzantısı |
| **SQL Server Agent Jobs** | Qrafik üzrə işləyən daxili tapşırıqlar | Sadə tapşırıqlar üçün `pg_cron`, mürəkkəb ETL boruları üçün **Apache Airflow DAG-ları** |
| **SSIS Paketləri (`.dtsx`)** | Vizual ETL kətanları | Python (`pandas`, `SQLAlchemy`) və ya PySpark skriptlərinə keçirilməli və Airflow ilə idarə olunmalıdır |

---

### 2.5. Miqrasiya Strategiyalarının Müqayisəsi

| Strategiya | Kəsilmə Müddəti (Downtime) | Texniki Mürəkkəblik | Risk Səviyyəsi | Uyğun Ssenari |
| :--- | :--- | :--- | :--- | :--- |
| **Big-Bang Miqrasiyası** | 6–24 saat (Uzun kəsilmə) | Aşağı (Replikasiya yoxdur) | **Yüksək** (Xəta baş verdikdə geri qayıdış itki yaradır) | Qeyri-kritik sistemlər və ya kiçik bazalar (< 50 GB) |
| **CDC Near-Zero Downtime** | 5–15 dəqiqə (Yalnız Cutover) | Orta / Yüksək (Kafka, Debezium) | **Minimal** (Köhnə və yeni baza paralel işləyir) | 24/7 sığorta, bank və kritik istehsalat mühitləri |

---

### 2.6. Məlumat Bütövlüyünün Yoxlanması (Data Validation Framework)

Miqrasiya prosesinin rəsmi təsdiqi üçün 4 səviyyəli yoxlama aparılır:

| Səviyyə | Yoxlama Növü | Yoxlama Qaydası | Qəbul Meyarı (Criteria) |
| :--- | :--- | :--- | :--- |
| **1-ci Səviyyə** | **Sətir Sayları (Row Counts)** | Bütün cədvəllər üzrə toplam sətir sayı müqayisə edilir | MSSQL Sətir Sayı == PostgreSQL Sətir Sayı |
| **2-ci Səviyyə** | **Maliyyə Aqreqatları (Sums)** | Sığorta haqları (`SUM(premium)`), iddia ödənişləri tutuşdurulur | 0.00 qəpik fərq |
| **3-cü Səviyyə** | **Kriptoqrafik Heş (MD5 Checksum)** | Bütün sətirlər sütunlar üzrə birləşdirilib heşlənir | Heş kodları 100% bərabər olmalıdır |
| **4-cü Səviyyə** | **Əlaqə Bütövlüyü (FK Integrity)** | Uşaq cədvəllərdə valideyni olmayan sətirlər axtarılır | 0 ədəd "yetim sətir" (Orphan row) |

---

### 2.7. Addım-Addım Cutover Planı və Rollback Strategiyası

#### Cutover Qrafiki
- **T - 24 saat:** Hədəf PostgreSQL bazasında indekslər, istifadəçi icazələri yoxlanılır; CDC gecikməsi (Lag) monitorinq edilir (< 2 saniyə olmalıdır).
- **T - 2 saat:** IT və biznes komandalarına keçid hazırlığı xəbərdarlığı göndərilir.
- **T - 15 dəqiqə:** Tətbiq xidmətləri texniki rejimə alınır (`Maintenance Mode`), SQL Server-də yeni yazmalar dayandırılır (`READ_ONLY`).
- **T - 0 (Cutover Anı):** CDC buferinin boşalması gözlənilir (son dəqiqənin tranzaksiyaları PostgreSQL-ə yazılır). Tətbiqlərin `Connection String`-i PostgreSQL-ə yönləndirilir.
- **T + 15 dəqiqə:** Smoke testlər icra olunur (Yeni polis satışı, müqavilə axtarışı, hesabat çıxarılması).
- **T + 30 dəqiqə:** Sistem müştərilərə tam açılır. Tərs CDC (PostgreSQL → SQL Server) işə salınır.

#### Rollback (Geri Qayıdış) Zəmanəti
Əgər keçiddən sonrakı ilk 24 saat ərzində PostgreSQL-də kritik arxitektura problemi aşkar edilərsə:
1. PostgreSQL-ə daxil olan bütün yeni əməliyyatlar tərs CDC vasitəsilə paralel olaraq SQL Server-ə axıdıldığı üçün, SQL Server aktual qalır.
2. Tətbiqin Connection String-i yenidən SQL Server-ə qaytarılır.
3. **Biznes sıfır məlumat itkisi ilə işinə davam edir.**

---

### 2.8. Risk Reyestri (Risk Register)

| Risk | Ehtimal | Təsir | Qarşısının Alınması Planı (Mitigation) |
| :--- | :--- | :--- | :--- |
| **Collation və Case-Sensitivity Uyğunsuzluğu** | Yüksək | Yüksək | Bütün DDL obyektləri əvvəlcədən `snake_case` kiçik hərflərlə yaradılır; axtarışlarda `ILIKE` və ya `LOWER()` tətbiq olunur. |
| **Tarix və Saat Qurşağı Xətaları** | Orta | Yüksək | SQL Server-dəki `DATETIME2` PostgreSQL-də mütləq `TIMESTAMPTZ` edilir və server saat qurşağı `UTC` təyin olunur. |
| **CDC Lag Böyüməsi** | Orta | Orta | Şəbəkə zolağı genişləndirilir, kütləvi tarixi yükləmə CDC başlamazdan əvvəl bitirilir. |
| **İndeks Çatışmazlığı Səbəbindən CPU Donması** | Yüksək | Yüksək | `pg_stat_statements` aktivləşdirilir, miqrasiyadan dərhal sonra `ANALYZE` icra olunur. |
| **Tətbiq ORM/SQL Xətaları** | Orta | Yüksək | Keçiddən əvvəl Staging mühitində tətbiqin bütün avtomatlaşdırılmış inteqrasiya testləri icra olunur. |

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: T-SQL `MERGE` və `OUTPUT` vs PostgreSQL `ON CONFLICT` və `RETURNING`

Sığorta polisini yeniləyən və ya əlavə edən, eyni zamanda dəyişən ID-ni dərhal geri qaytaran nümunə:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- MERGE və OUTPUT istifadəsi
CREATE OR ALTER PROCEDURE dbo.usp_UpsertPolicy
    @PolicyNumber VARCHAR(50),
    @CustomerID INT,
    @Premium DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    MERGE dbo.Policies AS target
    USING (SELECT @PolicyNumber AS PolicyNumber) AS source
    ON (target.PolicyNumber = source.PolicyNumber)
    WHEN MATCHED THEN
        UPDATE SET 
            target.Premium = @Premium,
            target.UpdatedAt = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (PolicyNumber, CustomerID, Premium, CreatedAt)
        VALUES (@PolicyNumber, @CustomerID, @Premium, GETDATE())
    OUTPUT 
        $action AS ActionType,
        inserted.PolicyID,
        inserted.PolicyNumber,
        inserted.Premium;
END;
```
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL
-- ON CONFLICT və RETURNING istifadəsi
CREATE OR REPLACE FUNCTION public.upsert_policy(
    p_policy_number VARCHAR(50),
    p_customer_id INT,
    p_premium NUMERIC(18,2)
)
RETURNS TABLE (
    policy_id INT,
    policy_number VARCHAR(50),
    premium NUMERIC(18,2),
    is_updated BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.policies (policy_number, customer_id, premium, created_at, updated_at)
    VALUES (p_policy_number, p_customer_id, p_premium, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (policy_number) 
    DO UPDATE SET 
        premium = EXCLUDED.premium,
        updated_at = CURRENT_TIMESTAMP
    RETURNING 
        policies.policy_id,
        policies.policy_number,
        policies.premium,
        (xmax != 0) AS is_updated; -- xmax != 0 olduqda deməli UPDATE baş verib
END;
$$;
```
:::

---

### Nümunə 2: Miqrasiyadan Sonra Bütövlük və MD5 Heş Yoxlanışı (Data Validation)

Hər iki bazada eyni cədvəlin sətir sayını və sətirlərin ardıcıl kriptoqrafik heşini müqayisə edən skript:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- Sətir sayı, cəm və sətirlərin Checksum doğrulaması
SELECT 
    COUNT(*) AS TotalRows,
    SUM(CAST(Premium AS DECIMAL(38,2))) AS TotalPremiumSum,
    CHECKSUM_AGG(BINARY_CHECKSUM(PolicyID, PolicyNumber, CustomerID, Premium)) AS HashCheck
FROM dbo.Policies;
```
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL
-- Sətir sayı, cəm və MD5 aqreqasiya doğrulaması
SELECT 
    COUNT(*) AS total_rows,
    SUM(premium) AS total_premium_sum,
    MD5(STRING_AGG(
        policy_id::text || policy_number || customer_id::text || premium::text, 
        ',' ORDER BY policy_id
    )) AS hash_check
FROM public.policies;
```
:::

---

### Nümunə 3: pgloader Konfiqurasiya Faylı Nümunəsi

Böyük cədvəllərin SQL Server-dən PostgreSQL-ə avtomatik və sürətli köçürülməsi üçün `migration.load` faylı:

```bash
# Dialect: Bash (pgloader konfiqurasiyası)
LOAD DATABASE
     FROM mssql://sa:SecretPass123@sqlserver.corp.local:1433/InsuranceDB
     INTO postgresql://postgres:SecretPass123@postgres.corp.local:5432/insurance_db

WITH include drop, create tables, create indexes, reset sequences,
     workers = 8, concurrency = 4,
     prefetch rows = 25000

CAST type datetime2 to timestamptz drop default,
     type bit to boolean using bit-to-boolean,
     type uniqueidentifier to uuid drop typemod,
     type money to numeric drop typemod

ALTER SCHEMA 'dbo' RENAME TO 'public';
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Quoted Identifiers və CamelCase Cədvəl Adları Tələsi**
> Əgər miqrasiya aləti SQL Server-dəki cədvəlləri `"Policies"` və ya `"PolicyID"` kimi cüt dırnaqla yaratsa, PostgreSQL onları dəqiq böyük hərflərlə saxlayır. Sonradan proqramçı kodda `SELECT policyid FROM policies` yazdıqda PostgreSQL `column "policyid" does not exist` xətası verəcək!
> **Qızıl Qayda:** Bütün obyekt və sütun adları miqrasiya zamanı birmənalı olaraq kiçik hərflərə (`snake_case`) çevrilməlidir.

> [!NOTE]
> **Sequence (Ardıcllıq) Dəyərlərinin Yenilənməməsi**
> Cədvəllər köçürüldükdən sonra mövcud ID-lər (məsələn, 1-dən 500,000-ə qədər) yeni bazaya oturur. Lakin PostgreSQL-in daxili `SEQUENCE`-i hələ də 1 dəyərində qalır! İlk yeni `INSERT` sorğusunda `duplicate key value violates unique constraint` xətası baş verir. Miqrasiyadan dərhal sonra bütün ardıcıllıqlar yenilənməlidir:
> `SELECT setval(pg_get_serial_sequence('public.policies', 'policy_id'), coalesce(max(policy_id), 1)) FROM public.policies;`

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya Tələbi:** *"Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi (sxemlərin çevrilməsi, uyğunluğun qiymətləndirilməsi, məlumatların bütövlüyünün təmin olunması, optimal performans, fasiləsizlik, cutover plan, rollback strategiyası)..."*
- **Sənin Rolun:** 
  1. Sığorta polisləri, zərər iddiaları və maliyyə ödənişləri bazasını biznesi dayandırmadan köçürmək.
  2. SQL Server və PostgreSQL arasında tiplərin və T-SQL prosedurlarının dəqiq çevrilmə xəritəsini qurmaq.
  3. `Debezium` CDC boru kəməri ilə minimal fasiləli Cutover və tərs replikasiyalı Rollback planını icra etmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: SQL Server-dən PostgreSQL-ə miqrasiyada `BIT` tipini köçürərkən tətbiq kodunda hansı dəyişiklik tələb oluna bilər?
<!-- answer-start -->
**Cavab:** SQL Server-də `BIT` tipi ədədi 0 və ya 1 kimi saxlanılır və sorğularda `WHERE IsActive = 1` yazılır. PostgreSQL-də isə `BOOLEAN` tipi sərt şəkildə `TRUE` və ya `FALSE` tələb edir. Əgər tətbiq kodu `WHERE is_active = 1` göndərərsə, PostgreSQL tip uyğunsuzluğu xətası verə bilər (`operator does not exist: boolean = integer`). Həll: Tətbiq sorğularını `WHERE is_active = TRUE` (və ya sadəcə `WHERE is_active`) formatına keçirmək.
<!-- answer-end -->

### Sual 2: Cutover zamanı "Reverse Replication" (Tərs Replikasiya) nə üçün lazımdır?
<!-- answer-start -->
**Cavab:** Rollback (Geri Qayıdış) təhlükəsizliyini təmin etmək üçün. Cutover bitdikdən sonra yeni əməliyyatlar artıq PostgreSQL-ə yazılır. Əgər sistemdə 3 saat sonra kritik bir qüsur aşkar edilərsə və köhnə SQL Server-ə qayıtmaq lazım gələrsə, həmin 3 saat ərzində PostgreSQL-ə yazılmış yeni polislər və ödənişlər itməməlidir. Tərs replikasiya bu dəyişiklikləri real vaxtda SQL Server-ə ötürür və sıfır itki ilə geri qayıtmağa imkan verir.
<!-- answer-end -->

### Sual 3: SQL Server-dəki Linked Server və SSIS paketləri PostgreSQL-də necə əvəzlənir?
<!-- answer-start -->
**Cavab:** Linked Server-lər PostgreSQL-də `postgres_fdw` (Foreign Data Wrapper) və ya `dblink` uzantıları ilə əvəzlənir. SSIS paketləri isə müasir Data Engineering mühitində avtomatlaşdırılmış Python/PySpark boru kəmərlərinə çevrilir və Apache Airflow ilə orkestrasiya edilir.
<!-- answer-end -->
