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

Data modelləşdirməni böyük bir **supermarket şəbəkəsinin əməliyyat anbarı və analitik satış vitrini** kimi təsəvvür edin:

### OLTP: Əməliyyat Kassası (3NF Modeli)
Gündəlik kassa əməliyyatları, kartdan pul silinməsi və polisin sistemdə qeydiyyatıdır. Burada əsas prioritet sürətli yazma və məlumat bütövlüyüdür. Məlumatlar təkrarçılığın qarşısını almaq üçün 10-15 müxtəlif cədvələ parçalanır (3NF Normallaşdırma).

### OLAP və Data Warehouse: Analitik İdarəetmə Vitrini (Kimball Ölçülü Model)
Rəhbərliyin illik mənfəəti, ən çox zərər gətirən sığorta növlərini və müştəri seqmentlərini analiz etdiyi mühitdir. Əgər hər analitik hesabat üçün 15 cədvəl `JOIN` edilsə, sistem iflic olar. Buna görə də vitrində hər şey əvvəlcədən birləşdirilmiş, qruplaşdırılmış və oxunması asan olan **Ulduz Sxemi (Star Schema)** formasında qurulur.

### Faktlar (Facts) və Ölçülər (Dimensions)
- **Faktlar:** Biznesdə baş verən konkret, rəqəmlə ölçülən hadisələrdir: *"Ödənilən sığorta haqqı 500 AZN, zərər məbləği 1,200 AZN"*.
- **Ölçülər:** Həmin hadisənin ətrafındakı kontekstdir: *"Kim aldı? (Müştəri), Nə vaxt bağlandı? (Tarix), Hansı agent satdı? (Agent), Hansı məhsuldur? (KASKO/İcbari)"*.

> [!TIP]
> **Müsahibədə belə de:**
> "OLTP sistemlərində verilənlər bazası 3NF normallaşdırması ilə yazma əməliyyatları üçün optimallaşdırılır. Lakin analitik hesabatlar və Data Warehouse/Lakehouse üçün Ralph Kimball-ın **Ölçülü Modelləşdirmə (Dimensional Modeling)** yanaşması standartdır. Biz mərkəzə rəqəmsal metrikləri saxlayan Fakt cədvəlini (`FactPolicies`, `FactClaims`), ətrafına isə kontekst verən Ölçü cədvəllərini (`DimCustomer`, `DimDate`, `DimAgent`) qoyaraq **Star Schema** qururuq. Müştəri ünvanı və ya risk dərəcəsi dəyişdikdə tarixi dəqiqliyi qorumaq üçün **SCD Type 2** metodundan istifadə edirik."

---

## 2. Əsas anlayışlar

### 2.1. OLTP vs OLAP Müqayisəsi

| Xüsusiyyət | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
| :--- | :--- | :--- |
| **Əsas Məqsəd** | Gündəlik biznes tranzaksiyalarını qeyd etmək (Polis satışı, ödəniş) | İdarəetmə qərarları üçün tarixi trendləri və aqreqatları təhlil etmək |
| **Dizayn Modeli** | 3NF (Normallaşdırılmış, dublikatsız çoxsaylı cədvəllər) | Star Schema / Snowflake (Denormallaşdırılmış Fakt və Ölçülər) |
| **Əsas Əməliyyat** | Çoxlu sürətli `INSERT`, `UPDATE`, `DELETE` (Sətir-bə-sətir) | Kütləvi oxuma (`SELECT`), `GROUP BY`, Window funksiyaları (Batch) |
| **Məlumat Dərinliyi** | Yalnız cari məlumatlar (Son 6–12 ay) | İllərlə toplanmış nəhəng tarixi məlumatlar (5–10 il) |
| **Cavab Gözləntisi** | Millisaniyələr | Saniyələr və ya dəqiqələr |

---

### 2.2. Kimball Fakt və Ölçü Cədvəlləri

Ralph Kimball metodologiyası analitik anbarları iki əsas cədvəl kateqoriyasına bölür:

#### Fakt Cədvəlləri (Fact Tables)
Fakt cədvəlləri biznes prosesinin ölçülə bilən rəqəmsal nəticələrini (Measures/Metrics) və ölçü cədvəllərinə bağlanan xarici açarları (Foreign Keys) saxlayır.

Data mühəndisliyində istifadə olunan 3 əsas fakt cədvəli növü mövcuddur:

| Fakt Cədvəli Növü | Mahiyyəti | Sığorta Sahəsindən Nümunə | Yenilənmə Davranışı |
| :--- | :--- | :--- | :--- |
| **Transactional Fact** | Hər bir fərdi əməliyyat anını qeyd edir. Ən xırda qranulyarlıq səviyyəsidir. | Hər bir sığorta polisin satışı və ya hər bir fərdi kompensasiya ödənişi. | Yalnız əlavə edilir (`INSERT-only`), heç vaxt dəyişdirilmir. |
| **Periodic Snapshot Fact** | Müəyyən zaman fasiləsinin (gün, ay, rüb) sonuna olan ümumi vəziyyəti əks etdirir. | Hər ayın sonuna olan aktiv polislərin ümumi sayı və toplam yığılmış sığorta haqqı. | Dövri olaraq (məsələn, hər ayın 1-i) hesablanıb yazılır. |
| **Accumulating Snapshot Fact** | Çoxmərhələli biznes prosesinin başlanğıcından yekununa qədərki bütün status və tarixlərini tək sətirdə izləyir. | Sığorta hadisəsinin gedişatı: Qəzanın baş verməsi $\rightarrow$ İddianın qeydiyyatı $\rightarrow$ Ekspertiza $\rightarrow$ Təsdiq $\rightarrow$ Ödəniş tarixi. | Prosesin hər addımında mövcud sətir `UPDATE` edilir. |

#### Ölçü Cədvəlləri (Dimension Tables)
Ölçü cədvəlləri faktlara dolğun kontekst verir ("Kim? Harada? Nə vaxt? Hansı şərtlərlə?"). Bu cədvəllər mətn xarakterli və təsviri atributlardan ibarətdir: `customer_name`, `gender`, `car_model`, `branch_name`.

#### Vahid Ölçülər (Conformed Dimensions)
Müəssisədə fərqli departamentlərin fakt cədvəlləri (məsələn, `FactPolicies` və `FactClaims`) tərəfindən ortaq istifadə olunan ölçü cədvəlləridir (məsələn, `DimCustomer` və `DimDate`). Vahid ölçülər şirkət daxilində tək bir həqiqət mənbəyinin (**Single Source of Truth**) formalaşmasını təmin edir.

#### Süni Açarlar (Surrogate Keys)
Ölçü cədvəllərində ilkin açar (PK) kimi mənbə sistemdən gələn təbii açarlar (məsələn, FİN kod və ya seriya nömrəsi) istifadə olunmur. Əvəzində süni, artan tam ədəd (`customer_key BIGINT`) yaradılır.

Surrogate Key istifadəsinin 3 mühüm səbəbi:
1. **Mənbə sistemlərdən asılılığı aradan qaldırır:** Mənbə sistemdə unikal identifikator dəyişə və ya xətalı daxil edilə bilər.
2. **SCD Type 2 tarixçəsini mümkün edir:** Eyni müştərinin zamanla 3 fərqli tarixi sətri olduqda, FİN kod unikal qala bilməz, lakin hər sətir üçün fərqli `customer_key` yaranır.
3. **Sorğu performansını artırır:** Tam ədəd (`BIGINT`) üzrə `JOIN` simvol tipli (`VARCHAR`) açarlarla müqayisədə 5-10 dəfə daha sürətli işləyir.

---

### 2.3. Slowly Changing Dimensions (SCD Növləri)

Müştərinin ünvanı, telefon nömrəsi və ya risk qrupu zamanla dəyişdikdə Data Warehouse-da bu dəyişikliyin idarə edilməsi üçün Slowly Changing Dimension (SCD) texnikalarından istifadə olunur:

| SCD Növü | İzahı və Mexanizmi | Tarixçə Saxlanırmı? | Sığorta Tətbiqi və Nümunə |
| :--- | :--- | :--- | :--- |
| **SCD Type 0** | Dəyişməz ölçü. Məlumat bir dəfə yazılır və heç vaxt yenilənmir. | Xeyr (Dəyişiklik qadağandır) | Müştərinin doğum tarixi (`birth_date`). |
| **SCD Type 1** | Köhnə məlumatın üzərinə birbaşa yeni məlumat yazılır. | Xeyr (Keçmiş itirilir) | Orfoqrafik xətaların və ya telefon nömrəsinin düzəldilməsi. |
| **SCD Type 2** | Köhnə sətir bağlanır (`valid_to = CURRENT_DATE, is_current = FALSE`), yeni dəyərlə təzə bir sətir əlavə edilir. | **Bəli (100% Tam Audit)** | Müştərinin risk kateqoriyasının və ya yaşayış ünvanının dəyişməsi. |
| **SCD Type 3** | Cədvələ əlavə sütun əlavə edilir (`previous_risk_group`, `current_risk_group`). | Yalnız son 2 vəziyyət | Yalnız əvvəlki və hazırkı vəziyyəti müqayisə etmək üçün məhdud ssenarilər. |

---

### 2.4. Star Schema vs Snowflake Schema

| Parametr | Ulduz Sxemi (Star Schema) | Qar Dənəciyi (Snowflake Schema) |
| :--- | :--- | :--- |
| **Quruluş** | Bütün ölçülər birbaşa mərkəzdəki fakt cədvəlinə bağlanır. | Ölçü cədvəllərinin özləri də daxildə normallaşdırılır (alt-cədvəllərə bölünür). |
| **Normallaşdırma** | Tam denormallaşdırılıb (Şəhər, Rayon, Ölkə eyni cədvəldədir). | Qismən normallaşdırılıb (`City` $\rightarrow$ `Region` $\rightarrow$ `Country`). |
| **JOIN Əməliyyatları** | Çox sadə və az sayda `JOIN` (Maksimum sorğu sürəti). | Çoxlu pilləli `JOIN`-lər tələb edir və sorğunu ləngidir. |
| **DWH Tövsiyəsi** | **Kimball standartı və ən yaxşı seçim.** | Müasir analitikada nadir hallarda istifadə olunur. |

---

### 2.5. Data Vault 2.0 Memarlığı

Nəhəng korporasiyalarda və yüzlərlə mənbə sistemi olan mühitlərdə tətbiq edilən xüsusi modelləşdirmə yanaşmasıdır:
- **Hubs:** Yalnız unikal biznes açarlarını saxlayır (`HashKey`, `CustomerBusinessKey`, `LoadDate`).
- **Links:** Hub-lar arasındakı biznes əlaqələrini təmsil edir (`LinkPolicyCustomer`).
- **Satellites:** Bütün təsviri atributları və onların zaman daxilindəki tam tarixçəsini saxlayır.

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

### Nümunə 1: SCD Type 2 İcrası (SQL Server vs PostgreSQL PL/pgSQL)

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
-- Dialect: PostgreSQL (ON CONFLICT DO UPDATE)
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
> **Fakt Cədvəllərində Təbii Açarlardan (Natural Keys) İstifadə Etmək**
> Ən böyük memarlıq səhvi Fakt cədvəlində `customer_id` (məsələn, FİN kod) saxlamaqdır. Əgər müştəri üçün SCD Type 2 tətbiq olunubsa, `Fact.customer_id = Dim.customer_id` üzrə `JOIN` etdikdə həmin müştərinin həm 2024, həm 2025, həm də 2026-cı il versiyaları eyni anda çıxacaq və **bütün sığorta haqları 3 dəfə şişəcək (Cartesian Explosion)**! Fakt cədvəlində mütləq hadisə anında aktiv olan süni açar (`customer_key`) saxlanmalıdır.

> [!NOTE]
> **Tarix Ölçüsündə (DimDate) Standart `DATE` Tipini Açara Çevirməmək**
> Analitik sorğularda `WHERE IssueDate >= '2026-01-01'` yazmaq əvəzinə `DimDate` cədvəlindən tam ədəd formatında `date_key` (məsələn: `20260101` integer) istifadə etmək cədvəl həcminə və `JOIN` sürətinə böyük üstünlük qazandırır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya Tələbi:** *"Məlumatların saxlanması, emalı, inteqrasiyası prinsipləri və korporativ arxitektura standartlarının tətbiqi... Analitik hesabatlılıq üçün modelləşdirmə."*
- **Sənin Rolun:** 
  1. Sığorta polisləri, müqavilə şərtləri, müştəri risk profilləri və sığorta hadisələri (claims) üçün vahid Data Mart və Star Schema modellərini layihələndirmək.
  2. Müştəri ünvan və risk dərəcələrinin dəyişməsini SCD Type 2 mexanizmi ilə quraraq keçmiş dövrlərin maliyyə hesabatlarının dəqiqliyini qorumaq.
  3. Bütün ölçü cədvəllərində Surrogate Key-lərdən istifadə edərək `JOIN` əməliyyatlarını sürətləndirmək və mənbə sistemlərindən asılılığı aradan qaldırmaq.

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
