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

Bir sığorta şirkətinin verilənlər bazasını Microsoft SQL Server-dən PostgreSQL-ə köçürmək **uçuş zamanı təyyarənin mühərrikini dəyişməyə** bənzəyir:
- Müştərilər 24/7 saytdan və mobil tətbiqdən icbari/kasko sığorta alır, qəza zamanı dərhal iddia (claim) qaldırır. Sistemi 2 gün tam söndürmək (**Big-Bang**) sığorta biznesi üçün qəbuledilməz maliyyə və etibar itkisidir.
- **Sxem və Tiplər**: Əgər vintlər fərqli standartdadırsa (T-SQL-də `NVARCHAR`, `DATETIME2`, `BIT`, `IDENTITY`), yeni mühərrikə birbaşa taxıla bilməz; əvvəlcədən dəqiq adapter cədvəli (**Data Type Mapping**) qurulmalıdır.
- **Kəsilməsiz Keçid (CDC Near-Zero Downtime)**: Təyyarə köhnə mühərriklə uçarkən, arxa planda yeni mühərrikə eyni yanacaq axını (Change Data Capture - CDC loqları) verilir. İki mühərrik eyni dövrədə işlədiyi an, cəmi 5 dəqiqəlik texniki fasilə ilə idarəetmə sükanı yeni mühərrikə (**Cutover**) verilir.
- **Rollback (Geri Qayıdış Planı)**: Əgər yeni mühərrikdə ilk saatda gözlənilməz vibrasiya (gizli xəta) yaranarsa, qəza etməmək üçün əvvəlcədən tərs axın (**Reverse Replication**) qurulur və dərhal köhnə sistemə qayıdılır.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən real istehsalatda təkbaşına SQL Server -> PostgreSQL miqrasiyasını icra etməmişəm, lakin strukturlaşdırılmış yanaşmam tam hazırdır:
> 1) İnventarizasiya və asılılıq analizi (`sys.sql_expression_dependencies`).
> 2) DDL çevrilməsi və tip uyğunlaşdırılması (`NVARCHAR` $\rightarrow$ `TEXT/VARCHAR`, `BIT` $\rightarrow$ `BOOLEAN`, `IDENTITY` $\rightarrow$ `GENERATED ALWAYS AS IDENTITY`).
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

### 2.2. Data Type Mapping Cədvəli (SQL Server $\rightarrow$ PostgreSQL)

| SQL Server Tipi | PostgreSQL Qarşılığı | Səbəb və Diqqət Yetirilməli Məqam |
| :--- | :--- | :--- |
| `NVARCHAR(n)` / `NCHAR(n)` | `VARCHAR(n)` və ya `TEXT` | PostgreSQL standart olaraq UTF-8 istifadə edir; `N` prefiksinə ehtiyac yoxdur. Uzun mətnlərdə `TEXT` daha çevikdir. |
| `DATETIME2` / `DATETIME` | `TIMESTAMPTZ` | Sığorta polislərində saat qurşağı dəqiqliyi üçün hər zaman `TIMESTAMPTZ` (UTC) tövsiyə olunur. |
| `BIT` | `BOOLEAN` | SQL Server-də 0/1 idi, PostgreSQL-də doğma `TRUE`/`FALSE`. Tətbiq sorğularında `WHERE is_active = 1` yerinə `WHERE is_active = TRUE` yazılmalıdır. |
| `UNIQUEIDENTIFIER` | `UUID` | PostgreSQL-də `uuid-ossp` və ya daxili `gen_random_uuid()` funksiyası ilə işləyir. |
| `MONEY` / `SMALLMONEY` | `NUMERIC(19,4)` | `MONEY` tipi valyuta simvolu və yuvarlaqlaşdırma problemləri yarada bilər; maliyyə hesablamalarında mütləq `NUMERIC` istifadə olunur. |
| `IDENTITY(1,1)` | `GENERATED ALWAYS AS IDENTITY` | Köhnə `SERIAL` əvəzinə SQL standartı olan `IDENTITY` tövsiyə olunur; ardıcıllıq (sequence) avtomatik idarə olunur. |
| `TINYINT` | `SMALLINT` | PostgreSQL-də 1 baytlıq unsigned ədəd yoxdur, ən kiçik tam ədəd 2 baytlıq `SMALLINT`-dir. |
| `VARBINARY(MAX)` / `IMAGE`| `BYTEA` | Şəkillər və sənəd skanları ikili (binary) `BYTEA` formatında saxlanılır. |
| `ROWVERSION` / `TIMESTAMP`| `BIGINT` və ya Sequence | SQL Server-də avtomatik artan 8-baytlıq ikili versiya idi; PostgreSQL-də trigger ilə yenilənən `BIGINT` və ya `xmin` ilə əvəzlənir. |

---

### 2.3. T-SQL $\rightarrow$ PL/pgSQL Sintaksis Çevrilmə Cədvəli

| Əməliyyat | Microsoft SQL Server (T-SQL) | PostgreSQL (PL/pgSQL) |
| :--- | :--- | :--- |
| **Sətir məhdudiyyəti** | `SELECT TOP (10) * FROM ...` | `SELECT * FROM ... LIMIT 10;` |
| **Səhifələmə (Pagination)** | `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY` | `OFFSET 20 LIMIT 10;` |
| **NULL əvəzləməsi** | `ISNULL(col, default_val)` | `COALESCE(col, default_val)` |
| **Sətir birləşdirmə** | `col1 + ' ' + col2` | `col1 \|\| ' ' \|\| col2` və ya `CONCAT(col1, ' ', col2)` |
| **Cari Tarix/Vaxt** | `GETDATE()` və ya `SYSUTCDATETIME()` | `CURRENT_TIMESTAMP` və ya `CLOCK_TIMESTAMP()` |
| **Tarix əlavə etmək** | `DATEADD(day, 30, IssueDate)` | `issue_date + INTERVAL '30 days'` |
| **Tarix fərqi** | `DATEDIFF(day, StartDate, EndDate)` | `(end_date - start_date)` və ya `DATE_PART('day', age)` |
| **Tranzaksiya Xətası** | `BEGIN TRY...BEGIN CATCH` | `BEGIN ... EXCEPTION WHEN OTHERS THEN` |
| **Upsert / Birləşdirmə** | `MERGE INTO Target USING Source ...` | `INSERT INTO ... ON CONFLICT (...) DO UPDATE` (PG 15+ `MERGE`) |
| **Dəyişən Sətirləri Alma**| `OUTPUT inserted.PolicyID, deleted.Status` | `RETURNING policy_id, status;` |
| **İdentifikator Dırnaqları** | `[PolicyID]`, `[Customer Name]` | `"policy_id"`, `"customer_name"` |
| **Hərf həssaslığı** | Adətən `Case-Insensitive` (CI) | Standart olaraq `Case-Sensitive`; kiçik hərflərə çevirir |

---

### 2.4. Miqrasiyanın Ən Çətin Elementləri ("Çətin Yerlər")

1. **Dinamik SQL (`sp_executesql`)**:
   - T-SQL-də string birləşdirilərək `sp_executesql` ilə parametrlə çağırılır.
   - PL/pgSQL-də `EXECUTE format('SELECT * FROM %I WHERE id = $1', table_name) USING p_id;` sintaksisinə çevrilməlidir (`%I` identifikator inyeksiyasının qarşısını alır).
2. **SQL CLR (.NET C# Assambleyaları)**:
   - SQL Server daxilində C# dll-ləri ilə mürəkkəb riyazi və ya kriptoqrafik hesablamalar.
   - PostgreSQL-də birbaşa .NET işləmir. Həll: Məntiqi ya `PL/Python` / `PL/Perl` ilə yenidən yazmaq, ya da bazadan kənara çıxararaq xarici mikroservisə vermək.
3. **Linked Servers**:
   - SQL Server-in uzaq bazalara qoşulması.
   - PostgreSQL-də `postgres_fdw` (Foreign Data Wrapper) və ya `dblink` uzantısı qurulmalıdır.
4. **SQL Server Agent Jobs**:
   - SQL Agent-dəki pilləli (steps) qrafikləri PostgreSQL-də təbii olaraq yoxdur.
   - Həll: Sadə SQL tapşırıqları üçün `pg_cron`, mürəkkəb ETL işləri üçün isə **Apache Airflow DAG-ları**.
5. **SSIS Paketləri (dtsx)**:
   - Vizual SSIS ETL axınları avtomatik çevrilə bilməz.
   - Həll: Python (`pandas`, `SQLAlchemy`) və ya PySpark skriptlərinə keçirilməli, Airflow ilə orkestrasiya olunmalıdır.

---

### 2.5. Miqrasiya Strategiyaları Müqayisəsi

1. **Big-Bang Miqrasiyası**:
   - Şənbə gecəsi köhnə baza söndürülür, bütün data kütləvi köçürülür, bazar səhəri yeni baza açılır.
   - *Üstünlük*: Sadə arxitektura, replikasiya konfiqurasiyası tələb etmir.
   - *Mənfi cəhət*: 100 GB-dan böyük bazalarda kəsilmə (downtime) saatlarla çəkir; hər hansı xətada geri qayıtmaq bütün yeni əməliyyatların itməsi deməkdir.
2. **CDC Near-Zero Downtime (Tövsiyə olunan)**:
   - Köhnə baza canlı işləyərkən fonda kütləvi data köçürülür və sonrakı hər bir dəyişiklik Debezium (Kafka) və ya AWS DMS ilə hədəf PostgreSQL-ə axıdılır.
   - *Kəsilmə müddəti*: Cəmi **5–15 dəqiqə** (yalnız tətbiqin connection string-ini dəyişmək və son bir neçə tranzaksiyanı tamamlamaq üçün).
   - *Risksiz*: Yeni baza paralel işləyir və istənilən an yoxlanıla bilir.

---

### 2.6. Məlumat Bütövlüyünün Yoxlanması (Data Validation Framework)
Miqrasiyanın uğurlu sayılması üçün 4 səviyyəli yoxlama aparılır:
1. **Sətir Saylarının Müqayisəsi (Row Counts)**: Bütün cədvəllər üzrə $N_{\text{MSSQL}} == N_{\text{PG}}$.
2. **Maliyyə və Say Aqreqatları (Sum / Min / Max)**: Sığorta haqlarının ümumi cəmi (`SUM(premium)`), iddia məbləğləri qəpiyinə qədər tutuşdurulur.
3. **Kriptoqrafik Heş Müqayisəsi (Hash / Checksum)**: Cədvəlin bütün sətirləri ID ardıcıllığı ilə `MD5` və ya `SHA256` heşinə yığılır və iki baza arasında müqayisə edilir.
4. **Referential Integrity (Xarici Açar Yoxlaması)**: Heç bir cədvəldə "yetim sətir" (Orphan record - valideyni olmayan uşaq cədvəl sətri) qalmadığı yoxlanılır.

---

### 2.7. Addım-Addım Cutover Planı və Rollback Strategiyası

#### Cutover Qrafiki:
- **T - 24 saat**: Hədəf PostgreSQL bazasında son DDL indeksləri və icazələri yoxlanılır; CDC gecikməsi (Lag) monitorinq edilir (< 2 saniyə olmalıdır).
- **T - 2 saat**: Bütün maraqlı tərəflərə (IT, Biznes, Rəhbərlik) keçid hazırlığı bildirişi göndərilir.
- **T - 15 dəqiqə**: Tətbiqlər qısa texniki fasilə rejiminə keçirilir (`Maintenance Mode`), SQL Server-də yeni yazmalar dondurulur (`READ_ONLY`).
- **T - 0 (Cutover)**: CDC buferinin sıfıra çatması gözlənilir (son tranzaksiyalar PG-yə yazılır). Connection String PostgreSQL-ə yönləndirilir.
- **T + 15 dəqiqə**: Smoke Testlər icra olunur (Sığorta polisi yaratmaq, axtarış etmək, hesabat çıxarmaq).
- **T + 30 dəqiqə**: Sistem istifadəçilərə açılır. Tərs CDC (PostgreSQL $\rightarrow$ SQL Server) işə salınır.

#### Rollback (Geri Qayıdış) Strategiyası:
Əgər keçiddən sonrakı ilk 24 saat ərzində PostgreSQL-də kritik arxitektura problemi və ya qarşısıalınmaz data korlanması baş verərsə:
1. PostgreSQL-ə edilən bütün yeni sətirlər tərs CDC vasitəsilə SQL Server-ə axıdıldığı üçün, SQL Server aktual qalır.
2. Tətbiqin Connection String-i yenidən SQL Server-ə qaytarılır.
3. **Biznes sıfır məlumat itkisi ilə köhnə bazada işini davam etdirir.**

---

### 2.8. Risk Reyestri (Risk Register)

| Risk | Ehtimal | Təsir | Qarşısının Alınması Planı (Mitigation) |
| :--- | :--- | :--- | :--- |
| **Collation və Case-Sensitivity Uyğunsuzluğu** | Yüksək | Yüksək | Bütün DDL obyektləri əvvəlcədən `snake_case` kiçik hərflərlə yaradılır; mətn axtarışlarında `ILIKE` və ya `LOWER()` tətbiq olunur. |
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
-- ON CONFLICT və RETURNING istifadəsi (və ya PG 15+ MERGE)
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
> **Diqqət: Quoted Identifiers və CamelCase Cədvəl Adları Tələsi**
> Əgər miqrasiya aləti SQL Server-dəki cədvəlləri `"Policies"` və ya `"PolicyID"` kimi cüt dırnaqla yaratsa, PostgreSQL onları dəqiq böyük hərflərlə qeyd edir. Sonradan proqramçı kodda `SELECT policyid FROM policies` yazdıqda PostgreSQL `column "policyid" does not exist` xətası verəcək! **Qızıl Qayda:** Bütün obyekt və sütun adları miqrasiya zamanı birmənalı olaraq kiçik hərflərə (`snake_case`) çevrilməlidir.

> [!NOTE]
> **Qeyd: Sequence (Ardıcllıq) Dəyərlərinin Yenilənməməsi**
> Cədvəllər köçürüldükdən sonra mövcud ID-lər (məsələn, 1-dən 500,000-ə qədər) yeni bazaya oturur. Lakin PostgreSQL-in daxili `SEQUENCE`-i hələ də 1 dəyərində qalır! İlk yeni `INSERT` sorğusunda `duplicate key value violates unique constraint` xətası baş verir. Miqrasiyadan dərhal sonra bütün ardıcıllıqlar yenilənməlidir:
> `SELECT setval(pg_get_serial_sequence('public.policies', 'policy_id'), coalesce(max(policy_id), 1)) FROM public.policies;`

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi (sxemlərin çevrilməsi, uyğunluğun qiymətləndirilməsi, məlumatların bütövlüyünün təmin olunması, optimal performans, fasiləsizlik, cutover plan, rollback strategiyası)..."*
- **Sənin rolun**: Sığorta polisləri, zərər iddiaları və maliyyə ödənişləri bazasını biznesi dayandırmadan köçürmək; tiplərin dəqiq xəritəsini qurmaq; `Debezium` CDC boru kəməri ilə paralel sinxronizasiya təmin etmək; Rollback planı ilə şirkətin risklərini minimuma endirmək.

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
