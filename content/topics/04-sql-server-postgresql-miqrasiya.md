---
id: "04-sql-server-postgresql-miqrasiya"
slug: "sql-server-postgresql-miqrasiya"
order: 4
title: "SQL Server -> PostgreSQL Miqrasiyası"
category: "Miqrasiya"
priority: "high"
readiness: "oyrenmeliyem"
vacancyLink: "Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi"
tags: ["Miqrasiya", "SQL Server", "PostgreSQL", "Data Types", "Cutover", "pgloader", "CDC"]
summary: "T-SQL-dən PL/pgSQL-ə çevrilmə, data tiplərinin uyğunlaşdırılması, kəsilməsiz (near-zero downtime) keçid və yoxlama (validation) strategiyaları."
---

# SQL Server -> PostgreSQL Miqrasiyası

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Bir verilənlər bazasını SQL Server-dən PostgreSQL-ə köçürmək köhnə bir fabrikin avadanlıqlarını başqa bir ölkədəki müasir zavoda köçürməyə bənzəyir:
- **Sxem və Tiplər (Avadanlıq ölçüləri)**: SQL Server-dəki vintlər düym (imperial) ölçüsündədirsə (`NVARCHAR`, `DATETIME2`, `IDENTITY`), PostgreSQL metrik sistemlə işləyir (`VARCHAR`, `TIMESTAMPTZ`, `GENERATED ALWAYS AS IDENTITY`). Birbaşa yerinə taxmaq olmur, əvvəlcədən dəqiq adapter cədvəli (mapping matrix) qurulmalıdır.
- **Saxlanılan Prosedurlar (Robot proqramları)**: SQL Server-in T-SQL dili ilə PostgreSQL-in PL/pgSQL dili fərqli sintaksis və xəta idarəetməsinə malikdir (`ISNULL` yerinə `COALESCE`, `GETDATE()` yerinə `CURRENT_TIMESTAMP`, `@@ROWCOUNT` yerinə `GET DIAGNOSTICS`).
- **Keçid (Cutover - Fabrikin işini dayandırmadan açılış)**: Sığorta şirkətində müştərilər 24/7 polis alır və ya qəza iddiası qaldırır. Fabriki 2 gün bağlamaq olmaz. Buna görə də əsas keçid zamanı **CDC (Change Data Capture)** mexanizmi ilə köhnə bazaya edilən hər bir dəyişiklik real vaxtda yeni bazaya axıdılır, son kəsilmə müddəti (downtime) isə sadəcə bir neçə dəqiqəyə endirilir.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən real production mühitində təkbaşına böyük bir SQL Server -> PostgreSQL miqrasiyasını idarə etməmişəm, lakin addım-addım yanaşmam tam aydındır:
> 1) Əvvəlcə mühitin inventarizasiyası və asılılıq xəritəsi çıxarılır (`sys.sql_expression_dependencies`).
> 2) DDL sxemləri çevrilir, data type uyğunsuzluqları aradan qaldırılır.
> 3) Tarixi məlumat kütləvi yüklənir (`pgloader` və ya Python/Spark ETL).
> 4) CDC (məsələn Debezium və ya AWS DMS) ilə delta dəyişikliklər paralel sinxronlaşdırılır.
> 5) Hash/Checksum və cərgə sayı (row count) yoxlamaları ilə data bütövlüyü sübut olunur.
> 6) Əvvəlcədən hazırlanmış və sınaqdan keçmiş Rollback planı ilə minimal downtime altında son keçid (Cutover) icra edilir."

---

## 2. Əsas anlayışlar

- **Sxem Çevrilməsi (Schema Conversion)**: Cədvəllər, açarlar, indekslər və məhdudiyyətlərin (constraints) PostgreSQL sintaksisinə uyğunlaşdırılması.
- **Data Type Mapping (Tiplərin uyğunlaşdırılması)**:
  - `NVARCHAR(n)` $\rightarrow$ `VARCHAR(n)` və ya sadəcə `TEXT` (PostgreSQL-də UTF-8 standartdır).
  - `DATETIME2` $\rightarrow$ `TIMESTAMPTZ` (Timezone dəstəyi ilə vaxt).
  - `BIT` $\rightarrow$ `BOOLEAN` (SQL Server-də 0/1 idi, PostgreSQL-də `TRUE`/`FALSE`).
  - `UNIQUEIDENTIFIER` $\rightarrow$ `UUID`.
  - `MONEY` $\rightarrow$ `NUMERIC(19,4)` (Hesablama dəqiqliyi üçün `NUMERIC` tövsiyə olunur).
- **Cutover (Son keçid)**: Tətbiqin qoşulma ünvanının (Connection String) SQL Server-dən PostgreSQL-ə dəyişdirildiyi son an.
- **Rollback Strategiyası**: Əgər keçiddən dərhal sonra kritik bir xəta aşkar edilərsə, biznesi dayandırmadan dərhal köhnə sistemə qayıtmaq üçün əks-istiqamətli sinxronizasiya (Reverse Replication).
- **Validation (Yoxlama)**: Məlumatın tam və itkisiz keçdiyini təsdiqləmək üçün sətir saylarının müqayisəsi və `MD5`/`SHA256` aqreqat heşlərinin tutuşdurulması.

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: T-SQL vs PL/pgSQL Sintaksis Fərqləri

Sığorta polisinin statusunu yoxlayan və yeniləyən prosedur:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- Sığorta polisinin statusunu yoxlayan və yeniləyən prosedur
CREATE OR ALTER PROCEDURE dbo.usp_RenewPolicy
    @PolicyID INT,
    @RenewalCost DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- T-SQL-də ISNULL və GETDATE istifadəsi
    IF EXISTS (SELECT 1 FROM dbo.Policies WHERE PolicyID = @PolicyID AND IsActive = 1)
    BEGIN
        UPDATE dbo.Policies
        SET Premium = ISNULL(Premium, 0) + @RenewalCost,
            UpdatedAt = GETDATE()
        WHERE PolicyID = @PolicyID;
        
        PRINT 'Polis uğurla yeniləndi.';
    END
END;
```
@tab PostgreSQL
```sql
-- Dialect: PL/pgSQL (PostgreSQL)
-- Eyni məntiqin PostgreSQL-də icrası
CREATE OR REPLACE PROCEDURE public.usp_renew_policy(
    p_policy_id INT,
    p_renewal_cost NUMERIC(18,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- PostgreSQL-də COALESCE və CURRENT_TIMESTAMP / CLOCK_TIMESTAMP
    IF EXISTS (SELECT 1 FROM public.policies WHERE policy_id = p_policy_id AND is_active = TRUE) THEN
        UPDATE public.policies
        SET premium = COALESCE(premium, 0) + p_renewal_cost,
            updated_at = CURRENT_TIMESTAMP
        WHERE policy_id = p_policy_id;
        
        RAISE NOTICE 'Polis uğurla yeniləndi.';
    END IF;
END;
$$;
```
:::

---

### Nümunə 2: Miqrasiyadan sonra data bütövlüyünün yoxlanması (Data Validation)

```sql
-- Dialect: PostgreSQL
-- Cədvəlin sətir sayı və əsas rəqəmsal sütunun MD5 heşi üzrə bütövlük yoxlaması
SELECT 
    COUNT(*) AS total_rows,
    SUM(premium) AS total_premium_sum,
    MD5(STRING_AGG(policy_id::text, ',' ORDER BY policy_id)) AS id_checksum
FROM public.policies;
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: Böyük-kiçik hərf həssaslığı (Case Sensitivity / Quoted Identifiers)**
> SQL Server adətən böyük-kiçik hərflərə həssas deyil (`Case-Insensitive`). PostgreSQL isə dırnaqsız yazılan bütün cədvəl və sütun adlarını avtomatik olaraq **kiçik hərflərə (lowercase)** çevirir. Əgər miqrasiya skripti cədvəli `"PolicyID"` kimi dırnaqda yaratsa, tətbiq kodundakı `SELECT policyid` xəta verəcək! Tövsiyə: bütün obyektləri təmiz kiçik hərflərlə (`snake_case`) yaratmaq.

> [!NOTE]
> **Qeyd: NULL dəyərlərin sıralanması (NULL ordering)**
> SQL Server-də `ORDER BY column ASC` zamanı `NULL` dəyərlər ən başda gəlir. PostgreSQL-də isə standart olaraq `NULLS LAST` prinsipi işləyir. Sıralamadan asılı hesabatlarda bu incə fərq nəticələrin fərqli görünməsinə səbəb ola bilər.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Microsoft SQL Server-dən PostgreSQL-ə miqrasiyanın layihələndirilməsi və idarə edilməsi (sxemlərin çevrilməsi, uyğunluğun qiymətləndirilməsi, məlumatların bütövlüyünün təmin olunması, rollback strategiyası)..."*
- **Sənin rolun**: Sığorta məlumat bazasının (polislər, müştərilər, ödənişlər, hadisələr) heç bir maliyyə itkisi olmadan PostgreSQL-ə köçürülməsi üçün sınaq mühitində prototip hazırlamaq, CDC axınını qurmaq və yoxlama skriptlərini avtomatlaşdırmaq.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: SQL Server-dəki `IDENTITY(1,1)` sütununu PostgreSQL-də necə əvəzləmək daha müasir və təhlükəsiz hesab olunur?
<!-- answer-start -->
**Cavab:** Köhnə `SERIAL` tipi əvəzinə SQL standartı olan `GENERATED ALWAYS AS IDENTITY` (və ya `GENERATED BY DEFAULT AS IDENTITY`) istifadə etmək tövsiyə olunur. Bu, arxa planda avtomatik ardıcıllıq (sequence) yaradır və təsadüfən manual ID daxil edilməsinin qarşısını alır.
<!-- answer-end -->

### Sual 2: Miqrasiya zamanı "Big-Bang" ilə "Phased / CDC" yanaşması arasındakı fərq nədir?
<!-- answer-start -->
**Cavab:** "Big-Bang" yanaşmasında sistem tamamilə söndürülür (məsələn şənbə gecəsi), bütün data köçürülür və bazar günü səhər yeni sistem açılır; sadədir amma uzun kəsilmə tələb edir və risklidir. "CDC" (Change Data Capture) yanaşmasında isə baza canlı işləyərkən fonda kütləvi data köçürülür və sonrakı hər bir dəyişiklik real-vaxtda replikasiya edilir; son keçid cəmi 5-15 dəqiqə çəkir.
<!-- answer-end -->

### Sual 3: T-SQL-dəki `MERGE` operatoru PostgreSQL-də necə icra edilir?
<!-- answer-start -->
**Cavab:** PostgreSQL 15-dən etibarən standart `MERGE INTO` sintaksisi dəstəklənir. Daha köhnə versiyalarda və ya sadə `UPSERT` əməliyyatlarında isə `INSERT INTO ... ON CONFLICT (id) DO UPDATE SET ...` sintaksisindən istifadə olunur.
<!-- answer-end -->
