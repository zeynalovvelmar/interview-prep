---
id: "05-data-modelling-warehousing"
slug: "data-modellesdirme-ve-anbarlar"
order: 5
title: "Data Modelləşdirmə və Data Warehouse (Kimball, SCD, Star Schema)"
category: "Modelləşdirmə"
priority: "medium"
readiness: "guclu"
vacancyLink: "Məlumatların saxlanması, emalı, inteqrasiyası prinsipləri və korporativ arxitektura standartlarının tətbiqi"
tags: ["Data Modeling", "DWH", "Kimball", "Star Schema", "Snowflake", "SCD Type 1", "SCD Type 2", "SCD Type 3", "Fact", "Dimension", "Surrogate Key"]
summary: "OLTP vs OLAP, Kimball ölçülü modelləşdirmə, Star vs Snowflake, sığorta star schema diaqramı, SCD 1/2/3 SQL nümunələri və Data Vault xülasəsi."
---

# Data Modelləşdirmə və Data Warehouse (Kimball, SCD, Star Schema)

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Data modelləşdirməni **bir supermarket şəbəkəsinin anbarı və vitrini** kimi təsəvvür edin:
- **OLTP (Əməliyyat Kassası - 3NF)**: Hər saniyə kassada çek vuran, kartdan pul silən sistemdir. Əsas məqsədi sürətli yazma və tam bütövlükdür. Mallar kateqoriyalara görə 10 müxtəlif otaqda parçalanıb saxlanılır (Normallaşdırma).
- **OLAP / Data Warehouse (Analitik Vitrin - Kimball Ölçülü Model)**: Mağaza rəhbərliyinin illik gəliri, ən çox satılan şokoladları və müştəri seqmentlərini analiz etdiyi masadır. Əgər rəhbər hər hesabat üçün 10 otağı gəzib məlumat yığsa (mürəkkəb 15-qatlı `JOIN`-lər), kompüter donar. Buna görə də vitrində hər şey hazır, birləşdirilmiş və rahat qruplaşdırılmış şəkildə düzülür (**Star Schema**).
- **Faktlar (Fact - Hadisələr və Rəqəmlər)**: Kassada baş verən konkret ölçülə bilən hadisələrdir: *"Satıldı 2 ədəd, məbləğ 50 AZN"*.
- **Ölçülər (Dimensions - Hadisənin Ətrafı)**: Hadisənin kontekstidir: *"Kim aldı? (Müştəri), Nə vaxt aldı? (Tarix), Hansı filialdan aldı? (Filial), Kim satdı? (Agent)"*.

> [!TIP]
> **Müsahibədə belə de:**
> "OLTP sistemlərində verilənlər bazası 3NF normallaşdırması ilə yazma əməliyyatları üçün optimallaşdırılır. Lakin analitik hesabatlar və Data Warehouse/Lakehouse üçün Ralph Kimball-ın **Ölçülü Modelləşdirmə (Dimensional Modeling)** yanaşması standartdır. Biz mərkəzə rəqəmsal metrikləri saxlayan Fakt cədvəlini (`FactPolicies`, `FactClaims`), ətrafına isə kontekst verən Ölçü cədvəllərini (`DimCustomer`, `DimDate`, `DimAgent`) qoyaraq **Star Schema** qururuq. Müştəri ünvanı və ya risk dərəcəsi dəyişdikdə tarixi dəqiqliyi qorumaq üçün **SCD Type 2** metodundan istifadə edirik."

---

## 2. Əsas anlayışlar

### 2.1. OLTP vs OLAP Müqayisəsi

| Xüsusiyyət | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
| :--- | :--- | :--- |
| **Məqsəd** | Gündəlik biznes əməliyyatlarını qeyd etmək (polis yazmaq, ödəniş almaq) | Qərarların qəbulu üçün tarixi trendləri və aqreqatları təhlil etmək |
| **Dizayn Modeli** | 3NF (Normallaşdırılmış, dublikatsız cədvəllər) | Star Schema / Snowflake (Denormallaşdırılmış, Fakt və Ölçülər) |
| **Əsas Əməliyyat** | Çox sayda sürətli `INSERT`, `UPDATE`, `DELETE` (Row-by-Row) | Kütləvi oxuma (`SELECT`), `GROUP BY`, Window hesabatları (Batch) |
| **Məlumat Həcmi** | Cari məlumatlar (Son 6–12 ay) | İllərlə toplanmış nəhəng tarixi məlumatlar (5–10 il) |
| **Cavab Vaxtı** | Millisaniyələr | Saniyələr və ya dəqiqələr |

---

### 2.2. Kimball Fakt və Ölçü Cədvəlləri
- **Fakt Cədvəlləri (Fact Tables)**:
  - Biznes prosesinin ölçülə bilən rəqəmsal nəticələrini (Measures/Metrics) saxlayır: məsələn, `premium_amount`, `claim_payout`, `deductible_amount`.
  - Ölçü cədvəllərinə bağlanan xarici açarları (Foreign Keys) ehtiva edir.
  - **Fakt növləri**:
    - *Transactional Fact*: Hər bir fərdi əməliyyatı qeyd edir (məsələn: hər bir ödəniş).
    - *Periodic Snapshot Fact*: Müəyyən dövrün sonu üçün vəziyyət (məsələn: hər ayın sonuna aktiv polislərin cəmi).
    - *Accumulating Snapshot Fact*: Müəyyən mərhələli prosesin başlanğıcından sonuna qədərki gedişatı (məsələn: qəza hadisəsinin qeydə alınması $\rightarrow$ ekspertiza $\rightarrow$ təsdiq $\rightarrow$ ödəniş).
- **Ölçü Cədvəlləri (Dimension Tables)**:
  - Faktlara kontekst verir ("Kim? Harada? Nə vaxt? Hansı şərtlərlə?").
  - Mətn xarakterli və təsviri atributlardan ibarətdir: `customer_name`, `gender`, `car_model`, `agent_branch`.
- **Conformed Dimensions (Vahid Ölçülər)**:
  - Şirkətdə fərqli fakt cədvəlləri (məsələn, `FactPolicy` və `FactClaims`) tərəfindən eyni mənada istifadə olunan ortaq ölçü cədvəlidir (məsələn: `DimCustomer` və ya `DimDate`). Bu, fərqli departamentlərin hesabatlarının bir-biri ilə uzlaşmasını təmin edir (**Single Version of the Truth**).
- **Surrogate Keys (Süni Açarlar)**:
  - Ölçü cədvəllərində ilkin açar (PK) kimi biznes açarı (məsələn, Müştərinin FİN kodu və ya Şəxsiyyət Vəsiqəsi) **istifadə olunmur**!
  - Əvəzində süni, artan tam ədəd (`customer_key BIGINT`) yaradılır.
  - *Niyə vacibdir?* 
    1) Təbii sistemlərdəki açarlar dəyişə və ya xətalı daxil edilə bilər.
    2) **SCD Type 2** tətbiq edərkən eyni müştərinin 3 fərqli tarixi sətri ola bilər; FİN unikal qala bilməz, amma `customer_key` hər sətir üçün unikal olur.
    3) Rəqəmsal `BIGINT` üzrə `JOIN` simvol tipli (`VARCHAR`) `JOIN`-dən 10 dəfələrlə sürətlidir.

---

### 2.3. Slowly Changing Dimensions (SCD Növləri)

Müştərinin ünvanı, telefon nömrəsi və ya risk qrupu zamanla dəyişdikdə Data Warehouse-da bu dəyişiklik necə idarə olunur?

- **SCD Type 0 (Fixed / Dəyişməz)**:
  - Məlumat heç vaxt dəyişdirilmir. Məsələn: Müştərinin doğum tarixi (`birth_date`).
- **SCD Type 1 (Overwrite / Üzərinə Yazmaq)**:
  - Köhnə məlumat silinir, yeni dəyər yerinə yazılır. Tarixçə saxlanılmır.
  - *İstifadə yeri*: Orfoqrafik səhvlərin düzəldilməsi (məsələn, addakı hərf səhvi).
  - *Mənfi cəhət*: Keçmiş hesabatları təkrar çıxardıqda nəticə dəyişir (Audit qorunmur).
- **SCD Type 2 (Add New Row / Yeni Sətir Əlavə Etmək — Standart)**:
  - Köhnə sətir bağlanır (`valid_to = CURRENT_DATE, is_current = FALSE`), yeni dəyərlə təzə bir sətir əlavə olunur (`valid_from = CURRENT_DATE, valid_to = '9999-12-31', is_current = TRUE`).
  - *Üstünlük*: Tarixi həqiqət 100% qorunur! 2024-cü ildəki hadisəni analiz edərkən müştərinin həmin tarixdəki köhnə ünvanı və risk dərəcəsi görünür.
- **SCD Type 3 (Add New Column / Əlavə Sütun)**:
  - Cədvələ `previous_risk_class` və `current_risk_class` kimi sütunlar əlavə olunur. Yalnız son iki vəziyyəti saxlayır, çox pilləli tarixçə üçün yararsızdır.

---

### 2.4. Star Schema vs Snowflake Schema
- **Star Schema (Ulduz Sxemi)**: Bütün ölçü cədvəlləri birbaşa mərkəzdəki Fakt cədvəlinə bağlanır. Ölçülər denormallaşdırılıb (məsələn: Şəhər, Rayon və Ölkə hamısı `DimLocation` cədvəlindədir). Sorğular çox sadə və ən yüksək sürətli `JOIN`-lərə malikdir.
- **Snowflake Schema (Qar Dənəciyi)**: Ölçü cədvəllərinin özü də daxildə normallaşdırılır (məsələn: `DimCity` $\rightarrow$ `DimCountry`). Saxlama yerinə azca qənaət edir, lakin sorğularda çoxlu əlavə `JOIN` tələb etdiyi üçün analitikada tövsiyə olunmur.

---

### 2.5. Data Vault 2.0 Xülasəsi
Çox böyük və tez-tez dəyişən korporativ mühitlərdə tətbiq olunan xüsusi modelləşdirmə:
- **Hubs**: Yalnız biznes açarlarını saxlayır (`HashKey`, `CustomerBusinessKey`, `LoadDate`).
- **Links**: Hub-lar arasındakı əlaqələri saxlayır (`LinkPolicyCustomer`).
- **Satellites**: Zamanla dəyişən bütün təsviri atributları və tarixçəni saxlayır.
- *Üstünlük*: Mənbə sistemlərdən asılılığı aradan qaldırır, paralel ETL-ə tam imkan verir və 100% audit təmin edir.

---

### 2.6. Sığorta Sahəsi üçün Star Schema Memarlıq Diaqramı

Aşağıdakı sxem Atəşgah Sığorta-nın əsas biznes proseslərini (Polis satışı və Hadisə ödənişləri) əhatə edən klassik **Ulduz Sxemidir (Star Schema)**:

```
                  +-------------------------+
                  |       DimDate           |
                  +-------------------------+
                  | PK  date_key            |
                  |     full_date           |
                  |     year, quarter, month|
                  |     day_of_week         |
                  +------------+------------+
                               |
                               |
+---------------------+        |        +-------------------------+
|     DimCustomer     |        |        |       DimAgent          |
+---------------------+        |        +-------------------------+
| PK  customer_key    |        |        | PK  agent_key           |
|     customer_id (BK)|        |        |     agent_name          |
|     full_name       |        |        |     branch_name         |
|     risk_category   |        |        |     commission_rate     |
|     valid_from      |        |        +------------+------------+
|     valid_to        |        |                     |
|     is_current      |        |                     |
+----------+----------+        |                     |
           |                   |                     |
           |      +------------v------------+        |
           +----->|       FactPolicies      |<-------+
                  +-------------------------+
                  | FK  date_key            |
                  | FK  customer_key        |
                  | FK  agent_key           |
                  | FK  coverage_key        |
                  |     policy_number       |
                  |     premium_amount      |
                  |     insured_amount      |
                  +------------+------------+
                               |
                               | (Conformed Dimensions)
                               |
                  +------------v------------+
                  |       FactClaims        |
                  +-------------------------+
                  | FK  claim_date_key      |
                  | FK  policy_key          |
                  | FK  customer_key        |
                  |     claim_number        |
                  |     claim_amount        |
                  |     paid_amount         |
                  +-------------------------+
                               |
                  +------------v------------+
                  |      DimCoverage        |
                  +-------------------------+
                  | PK  coverage_key        |
                  |     coverage_type       |
                  |     deductible_pct      |
                  +-------------------------+
```

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: SCD Type 2 İcrası (SQL Server MERGE vs PostgreSQL CTE/Procedure)

Müştərinin risk dərəcəsi və ya ünvanı dəyişdikdə köhnə sətri qapadıb yeni sətir əlavə edən klassik SCD Type 2 ETL addımı:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- SCD Type 2: Köhnə sətri bağlamaq və yeni sətri əlavə etmək
CREATE OR ALTER PROCEDURE dbo.usp_LoadDimCustomer_SCD2
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Dəyişikliyi aşkar edib köhnə sətri bağlamaq
    UPDATE dim
    SET 
        dim.ValidTo = DATEADD(day, -1, CAST(GETDATE() AS DATE)),
        dim.IsCurrent = 0
    FROM dbo.DimCustomer AS dim
    INNER JOIN dbo.StageCustomer AS stg ON dim.CustomerID = stg.CustomerID
    WHERE dim.IsCurrent = 1 
      AND (dim.RiskCategory <> stg.RiskCategory OR dim.Address <> stg.Address);

    -- 2. Yeni sətirləri (həm tam yeni müştəriləri, həm də dəyişənlərin yeni versiyasını) daxil etmək
    INSERT INTO dbo.DimCustomer (
        CustomerID,
        CustomerName,
        RiskCategory,
        Address,
        ValidFrom,
        ValidTo,
        IsCurrent
    )
    SELECT 
        stg.CustomerID,
        stg.CustomerName,
        stg.RiskCategory,
        stg.Address,
        CAST(GETDATE() AS DATE) AS ValidFrom,
        '9999-12-31' AS ValidTo,
        1 AS IsCurrent
    FROM dbo.StageCustomer AS stg
    LEFT JOIN dbo.DimCustomer AS dim 
        ON stg.CustomerID = dim.CustomerID AND dim.IsCurrent = 1
    WHERE dim.CustomerID IS NULL -- Tam yeni müştəri və ya 1-ci addımda köhnəsi bağlanmış
       OR (dim.RiskCategory <> stg.RiskCategory OR dim.Address <> stg.Address);
END;
```
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL (PL/pgSQL)
CREATE OR REPLACE PROCEDURE public.load_dim_customer_scd2()
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Dəyişən müştərilərin cari aktiv sətrini bağlamaq
    UPDATE public.dim_customer AS dim
    SET 
        valid_to = CURRENT_DATE - INTERVAL '1 day',
        is_current = FALSE
    FROM public.stage_customer AS stg
    WHERE dim.customer_id = stg.customer_id
      AND dim.is_current = TRUE
      AND (dim.risk_category IS DISTINCT FROM stg.risk_category 
           OR dim.address IS DISTINCT FROM stg.address);

    -- 2. Yeni versiya və ya tam yeni müştəri sətirlərini əlavə etmək
    INSERT INTO public.dim_customer (
        customer_id,
        customer_name,
        risk_category,
        address,
        valid_from,
        valid_to,
        is_current
    )
    SELECT 
        stg.customer_id,
        stg.customer_name,
        stg.risk_category,
        stg.address,
        CURRENT_DATE,
        '9999-12-31'::date,
        TRUE
    FROM public.stage_customer AS stg
    LEFT JOIN public.dim_customer AS dim 
        ON stg.customer_id = dim.customer_id AND dim.is_current = TRUE
    WHERE dim.customer_id IS NULL; -- Aktiv qeydi olmayanlar (bağlanmış və ya yeni)
END;
$$;
```
:::

---

### Nümunə 2: SCD Type 1 İcrası (Sadə Üzərinə Yazmaq)

Orfoqrafik xətaları və ya telefon nömrəsini tarixçə saxlamadan yeniləmək:

:::tabs
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL
-- SCD Type 1: Mövcud olanı yerində yenilə, olmayanları əlavə et
INSERT INTO public.dim_customer_scd1 (customer_id, full_name, phone_number, updated_at)
SELECT customer_id, full_name, phone_number, CURRENT_TIMESTAMP
FROM public.stage_customer
ON CONFLICT (customer_id) 
DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    updated_at = CURRENT_TIMESTAMP
WHERE dim_customer_scd1.full_name IS DISTINCT FROM EXCLUDED.full_name
   OR dim_customer_scd1.phone_number IS DISTINCT FROM EXCLUDED.phone_number;
```
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
UPDATE dim
SET 
    dim.FullName = stg.FullName,
    dim.PhoneNumber = stg.PhoneNumber,
    dim.UpdatedAt = GETDATE()
FROM dbo.DimCustomer_SCD1 AS dim
INNER JOIN dbo.StageCustomer AS stg ON dim.CustomerID = stg.CustomerID
WHERE dim.FullName <> stg.FullName OR dim.PhoneNumber <> stg.PhoneNumber;
```
:::

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: Fakt Cədvəllərində Biznes Açarlarından (Natural Keys) İstifadə Etmək**
> Ən böyük memarlıq səhvi Fakt cədvəlində `customer_id` (məsələn, FİN kod) saxlamaqdır. Əgər müştəri üçün SCD Type 2 tətbiq olunubsa, `Fact.customer_id = Dim.customer_id` üzrə `JOIN` etdikdə həmin müştərinin həm 2024, həm 2025, həm də 2026-cı il versiyaları eyni anda çıxacaq və **bütün sığorta haqları 3 dəfə şişəcək (Cartesian Explosion)**! Fakt cədvəlində mütləq hadisə anında aktiv olan süni açar (`customer_key`) saxlanmalıdır.

> [!NOTE]
> **Qeyd: Vaxt Ölçüsündə (DimDate) Standart `DATE` Tipini Açara Çevirməmək**
> Analitik sorğularda `WHERE IssueDate >= '2026-01-01'` yazmaq əvəzinə `DimDate` cədvəlindən tam ədəd formatında `date_key` (məsələn: `20260101` integer) istifadə etmək cədvəl həcminə və `JOIN` sürətinə böyük üstünlük qazandırır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Məlumatların saxlanması, emalı, inteqrasiyası prinsipləri və korporativ arxitektura standartlarının tətbiqi... Analitik hesabatlılıq üçün modelləşdirmə."*
- **Sənin rolun**: Sığorta polisləri, müqavilə şərtləri, müştəri risk profilləri və sığorta hadisələri (claims) üçün vahid Data Mart və Star Schema modellərini layihələndirmək; SCD Type 2 mexanizmini quraraq müştəri seqmentasiyasının tarixi dəqiqliyini təmin etmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: Kimball modelində "Conformed Dimension" nədir və şirkət üçün nə dərəcədə vacibdir?
<!-- answer-start -->
**Cavab:** Conformed Dimension (Vahid Ölçü) fərqli biznes proseslərinə aid fakt cədvəlləri tərəfindən ortaq istifadə edilən, eyni struktura və məzmuna malik ölçü cədvəlidir (məsələn: `DimCustomer` həm Polis satışı, həm də Qəza/İddia departamenti üçün vahiddir). Bu, müxtəlif departamentlərin hesabatlarında məlumat fərqliliyinin (məsələn, İddia şöbəsində 500 müştəri, Satışda 450 müştəri görünməsi kimi) qarşısını alır və şirkət üzrə vahid həqiqət mənbəyini (Single Source of Truth) təmin edir.
<!-- answer-end -->

### Sual 2: Niyə DWH cədvəllərində Təbii Açar (Natural Key) əvəzinə Süni Açar (Surrogate Key) istifadə olunmalıdır?
<!-- answer-start -->
**Cavab:** 1) Mənbə sistemlərdən asılılığı aradan qaldırır (mənbədə ID dəyişə və ya xətalı daxil edilə bilər). 2) **SCD Type 2 tarixçəsini saxlamaq üçün şərtdir**: eyni müştərinin fərqli zaman kəsikləri üçün çoxlu sətri olduqda təbii açar unikal ola bilmir, lakin hər sətir üçün unikal `customer_key` yaranır. 3) Kiçik tam ədədlər (`BIGINT`) üzrə `JOIN` etmək simvol tipli (`VARCHAR`) natural açarlardan dəfələrlə sürətlidir.
<!-- answer-end -->

### Sual 3: SCD Type 1 ilə SCD Type 2 arasındakı fərq nədir?
<!-- answer-start -->
**Cavab:** SCD Type 1-də köhnə məlumatın üzərinə birbaşa yeni məlumat yazılır və keçmiş tarixçə itir (yalnız cari vəziyyət qalır). SCD Type 2-də isə köhnə sətir bağlanır (`is_current = FALSE, valid_to = CURRENT_DATE`) və yeni dəyərlərlə təzə bir sətir əlavə olunur; nəticədə bütün tarixi dəyişikliklər qorunur və istənilən keçmiş tarix üçün dəqiq audit hesabatı almaq mümkün olur.
<!-- answer-end -->
