---
id: "01-sql-fundamentals-advanced"
slug: "sql-fundamentals-advanced"
order: 1
title: "SQL Əsasları və Dərinlikləri (Advanced SQL)"
category: "SQL"
priority: "high"
readiness: "orta"
vacancyLink: "Bütün korporativ mənbələrdən və verilənlər bazalarından ETL axınlarının yazılması və sorğuların optimallaşdırılması"
tags: ["SQL", "Joins", "Window Functions", "Recursive CTE", "ACID", "Transactions", "Isolation Levels", "Indexes", "Normalization"]
summary: "Mürəkkəb JOIN-lər, Window funksiyaları, rekursiv CTE, tranzaksiyalar, ACID prinsipləri, kilidlənmələr (deadlocks) və 1NF–3NF normallaşdırma."
---

# SQL Əsasları və Dərinlikləri (Advanced SQL)

## 1. Qısa izah (Sadə dildə və analogiya ilə)

SQL-i böyük bir **mərkəzi logistika mərkəzinin naviqasiya sistemi** kimi təsəvvür edin:
- **Cədvəllər (Tables)**: Hər biri ayrıca növ malları saxlayan anbar bölmələridir (məsələn, sığorta polisləri, müştərilər, ödənişlər).
- **JOIN-lər**: Fərqli bölmələrdəki malları vahid qaimə nömrəsi ilə bir araya gətirən konveyer kəmərləridir. Əgər yanlış konveyer qursanız (`CROSS JOIN` və ya unikal olmayan açarla `LEFT JOIN`), anbar minlərlə lazımsız dublikatla dolar (**Cartesian Explosion**).
- **Window Functions (Pəncərə funksiyaları)**: Hərəkət edən qatara pəncərədən baxan müfəttiş kimidir. O, sətirləri qruplaşdırıb sıxışdırmır (`GROUP BY` kimi sətri itirmir), hər bir sətrin yanından keçərkən cari vəziyyəti əvvəlki və ya növbəti sətirlə müqayisə edir (məsələn: *"Bu müştərinin son 3 sığorta ödənişinin orta məbləği nə qədərdir?"*).
- **Tranzaksiyalar və ACID**: Bankomatdan pul çıxarmağa bənzəyir: ya kartdan pul silinir və nağd pul verilir (hər iki əməliyyat uğurla bitir — `COMMIT`), ya da hər hansı nasazlıqda əməliyyat tam ləğv olunur və pul balansa qaytarılır (`ROLLBACK`). Ortada yarımçıq vəziyyət ola bilməz.

> [!TIP]
> **Müsahibədə belə de:**
> "Data Mühəndisi olaraq SQL-də yalnız məlumatı oxumaq deyil, sorğunun icra planını (Execution Plan) başa düşmək ən vacib bacarıqdır. Məsələn, `GROUP BY` nəticəni aqreqasiya edərək sətir sayını azaldır, Window funksiyaları isə hər bir orijinal sətri saxlayaraq analitik hesablama aparır. Böyük həcmli data boru kəmərlərində dublikatların qarşısını almaq üçün `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` ən etibarlı və idempotent deduplikasiya üsuludur."

---

## 2. Əsas anlayışlar

- **JOIN növləri**:
  - `INNER JOIN`: Hər iki cədvəldə şərtə uyğun gələn kəsişməni gətirir.
  - `LEFT JOIN (OUTER)`: Sol cədvəlin bütün sətirlərini, sağ cədvəldən isə yalnız uyğun gələnləri gətirir (uyğun gəlməyəndə `NULL`).
  - `FULL OUTER JOIN`: Hər iki tərəfdən uyğun gələn və gəlməyən bütün sətirləri saxlayır.
  - `CROSS JOIN`: Dekart hasili (Cartesian product) yaradır ($N \times M$ sayda sətir).
  - `ANTI-JOIN` (`LEFT JOIN ... WHERE right.id IS NULL` və ya `NOT EXISTS`): Yalnız digər cədvəldə **olmayan** sətirləri tapır.
  - `SEMI-JOIN` (`WHERE EXISTS (...)`): Digər cədvəldə ən azı bir uyğunluq olduğunu yoxlayır, lakin sağ cədvəldən dublikat sətir çoxaltmır.
- **Window Functions**:
  - Sıralama: `ROW_NUMBER()` (hər sətrə unikal sıra), `RANK()` (eyni dəyərlərə eyni sıra, növbəti nömrəni buraxır: 1, 2, 2, 4), `DENSE_RANK()` (boşluq buraxmır: 1, 2, 2, 3), `NTILE(n)` (məlumatı $n$ bərabər qrupa bölür).
  - Qiymət gətirmə: `LAG(col, 1)` (əvvəlki sətrin dəyəri), `LEAD(col, 1)` (növbəti sətrin dəyəri), `FIRST_VALUE()`, `LAST_VALUE()`.
  - Pəncərə çərçivəsi (Frame): `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (kümülyativ cəm / Running Total).
- **CTE və Recursive CTE**:
  - `WITH cte AS (...)`: Oxunaqlılığı artıran müvəqqəti adlı nəticə dəsti.
  - `Recursive CTE`: Özünü təkrar çağıran sorğu; iyerarxik məlumatlar (təşkilati struktur, sığorta agentlikləri şəbəkəsi) və ardıcıl tarixlər yaratmaq üçün idealdır. `UNION ALL` ilə əsas hissə (Anchor) və rekursiv hissə birləşdirilir.
- **Set Operations (Çoxluq əməliyyatları)**:
  - `UNION ALL`: İki nəticəni birləşdirir, dublikatları təmizləmir (sürətlidir).
  - `UNION`: Dublikatları təmizləmək üçün daxildə gizli `Sort / Distinct` əməliyyatı aparır (ağır I/O və CPU).
  - `INTERSECT`: Hər iki sorğuda ortaq olan sətirlər.
  - `EXCEPT` (və ya `MINUS`): Birinci sorğuda olub ikincidə olmayanlar.
- **Transactions və ACID**:
  - **A (Atomicity)**: Əməliyyatlar toplusu ya tam icra olunur, ya da tam ləğv edilir (`All-or-Nothing`).
  - **C (Consistency)**: Tranzaksiya verilənlər bazasını yalnız bir düzgün vəziyyətdən digər düzgün vəziyyətə keçirə bilər (bütün `CHECK`, `FK`, `UNIQUE` məhdudiyyətləri qorunur).
  - **I (Isolation)**: Paralel işləyən tranzaksiyalar bir-birinin yarımçıq qalmış nəticələrini görməməlidir.
  - **D (Durability)**: Təsdiqlənmiş (`COMMIT`) məlumat elektrik kəsilsə və ya server çöksə belə itmir (Write-Ahead Log vasitəsilə).
- **İzolyasiya Səviyyələri (Isolation Levels) və Anomaliyalar**:
  - `Read Uncommitted`: Ən zəif izolyasiya. **Dirty Read** (hələ `COMMIT` olunmamış çirkli məlumatın oxunması) baş verir.
  - `Read Committed`: Yalnız təsdiqlənmiş məlumat oxunur. Lakin eyni tranzaksiya daxilində eyni sorğu təkrarlandıqda fərqli nəticə alına bilər (**Non-repeatable Read**).
  - `Repeatable Read`: Oxunan sətirlər kilidlənir və ya versiyalanır. Lakin yeni əlavə olunan sətirlər görünə bilər (**Phantom Read**).
  - `Serializable`: Ən yüksək izolyasiya. Sorğular sanki növbə ilə bir-birinin ardınca işləyir. Kilidlənmələr və performans xərci çox yüksəkdir.
  - `Snapshot`: Kilidlərdən istifadə etmədən, tranzaksiya başlayan andakı vəziyyətin versiyasını oxuyur (SQL Server-də `tempdb`, PostgreSQL-də təbii MVCC).
- **Locking və Deadlock**:
  - Shared Lock (`S`): Oxuma kilidi. Birdən çox oxuyucu eyni anda oxuya bilər.
  - Exclusive Lock (`X`): Yazma/Yeniləmə kilidi. Heç bir başqa tranzaksiya həmin sətri oxuya və ya dəyişə bilməz.
  - Deadlock (Dalana dirənmə): İki tranzaksiya bir-birinin kilidlədiyi resursları qarşılıqlı olaraq gözlədikdə yaranır (A tranzaksiyası Resurs 1-i kilidləyib Resurs 2-ni istəyir; B tranzaksiyası Resurs 2-ni kilidləyib Resurs 1-i istəyir). Verilənlər bazasının Deadlock Monitor-u bunlardan birini "qurban" (`Deadlock Victim`) seçərək `ROLLBACK` edir.
- **Normallaşdırma (1NF–3NF) vs Denormallaşdırma**:
  - `1NF`: Hər sütunda yalnız atomar (bölünməz) dəyər olmalıdır, təkrarlanan qruplar olmamalıdır.
  - `2NF`: 1NF şərti + cədvəlin bütün qeyri-açar sütunları bütöv ilkin açardan (Composite PK) tam funksional asılı olmalıdır.
  - `3NF`: 2NF şərti + heç bir tranzitiv asılılıq olmamalıdır (Açar olmayan sütun digər açar olmayan sütundan asılı olmamalıdır).
  - `Denormalization`: Analitik sistemlərdə (Data Warehouse / Lakehouse) sorğu zamanı ağır `JOIN`-lərin qarşısını almaq üçün məqsədli şəkildə ehtiyat məlumatların və atributların tək cədvələ birləşdirilməsi.

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: Window Functions — Hər müştəri üzrə son polisin tapılması (Deduplikasiya) və Kümülyativ Premia

Bu sorğu hər müştərinin ən son sığorta polisini seçir və müştəri üzrə artan kümülyativ (running total) sığorta haqqını hesablayır:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
WITH RankedPolicies AS (
    SELECT 
        PolicyID,
        CustomerID,
        Premium,
        IssueDate,
        -- Ən son polisin 1-ci nömrə olması
        ROW_NUMBER() OVER(
            PARTITION BY CustomerID 
            ORDER BY IssueDate DESC, PolicyID DESC
        ) AS rn,
        -- Müştəri üzrə kümülyativ cəm
        SUM(Premium) OVER(
            PARTITION BY CustomerID 
            ORDER BY IssueDate ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS RunningCustomerPremium
    FROM dbo.Policies
)
SELECT 
    PolicyID,
    CustomerID,
    Premium,
    IssueDate,
    RunningCustomerPremium
FROM RankedPolicies
WHERE rn = 1;
```
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL
WITH ranked_policies AS (
    SELECT 
        policy_id,
        customer_id,
        premium,
        issue_date,
        -- Ən son polisin 1-ci nömrə olması
        ROW_NUMBER() OVER(
            PARTITION BY customer_id 
            ORDER BY issue_date DESC, policy_id DESC
        ) AS rn,
        -- Müştəri üzrə kümülyativ cəm
        SUM(premium) OVER(
            PARTITION BY customer_id 
            ORDER BY issue_date ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_customer_premium
    FROM public.policies
)
SELECT 
    policy_id,
    customer_id,
    premium,
    issue_date,
    running_customer_premium
FROM ranked_policies
WHERE rn = 1;
```
:::

---

### Nümunə 2: Recursive CTE — Sığorta Agentlikləri İyerarxiyası

Sığorta şirkətlərində baş agentlik və ona tabe olan sub-agentlərin ağac strukturunu (Tree structure) açmaq:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
WITH AgencyHierarchy AS (
    -- Anchor member: Ən yuxarı rəhbər agentliklər (ParentID IS NULL)
    SELECT 
        AgencyID,
        AgencyName,
        ParentAgencyID,
        0 AS HierarchyLevel,
        CAST(AgencyName AS VARCHAR(500)) AS HierarchyPath
    FROM dbo.Agencies
    WHERE ParentAgencyID IS NULL

    UNION ALL

    -- Recursive member: Tabe olan agentlikləri birləşdirmək
    SELECT 
        child.AgencyID,
        child.AgencyName,
        child.ParentAgencyID,
        parent.HierarchyLevel + 1,
        CAST(parent.HierarchyPath + ' -> ' + child.AgencyName AS VARCHAR(500))
    FROM dbo.Agencies AS child
    INNER JOIN AgencyHierarchy AS parent ON child.ParentAgencyID = parent.AgencyID
)
SELECT 
    AgencyID,
    AgencyName,
    HierarchyLevel,
    HierarchyPath
FROM AgencyHierarchy
ORDER BY HierarchyPath
OPTION (MAXRECURSION 50); -- Sonsuz dövrün qarşısını almaq üçün təhlükəsizlik
```
@tab PostgreSQL
```sql
-- Dialect: PostgreSQL (RECURSIVE açar sözü tələb olunur)
WITH RECURSIVE agency_hierarchy AS (
    -- Anchor member
    SELECT 
        agency_id,
        agency_name,
        parent_agency_id,
        0 AS hierarchy_level,
        CAST(agency_name AS TEXT) AS hierarchy_path
    FROM public.agencies
    WHERE parent_agency_id IS NULL

    UNION ALL

    -- Recursive member
    SELECT 
        child.agency_id,
        child.agency_name,
        child.parent_agency_id,
        parent.hierarchy_level + 1,
        parent.hierarchy_path || ' -> ' || child.agency_name
    FROM public.agencies AS child
    JOIN agency_hierarchy AS parent ON child.parent_agency_id = parent.agency_id
)
SELECT 
    agency_id,
    agency_name,
    hierarchy_level,
    hierarchy_path
FROM agency_hierarchy
ORDER BY hierarchy_path;
```
:::

---

### Nümunə 3: Tranzaksiya və Xəta İdarəetməsi (XACT_ABORT vs PL/pgSQL Exception)

Sığorta ödənişini qəbul edib müqavilə balansını yeniləyən atomar əməliyyat:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
SET XACT_ABORT ON; -- Hər hansı run-time xətada tranzaksiyanı dərhal ləğv et
BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Ödənişi qeyd et
    INSERT INTO dbo.Payments (PolicyID, Amount, PaymentDate)
    VALUES (101, 250.00, GETDATE());

    -- 2. Polisin qalıq borcunu azalt
    UPDATE dbo.Policies
    SET RemainingDebt = RemainingDebt - 250.00,
        UpdatedAt = GETDATE()
    WHERE PolicyID = 101;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW; -- Xətanı çağıran tətbiqə ötür
END CATCH;
```
@tab PostgreSQL
```sql
-- Dialect: PL/pgSQL (PostgreSQL)
CREATE OR REPLACE PROCEDURE public.process_insurance_payment(
    p_policy_id INT,
    p_amount NUMERIC(18,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Ödənişi qeyd et
    INSERT INTO public.payments (policy_id, amount, payment_date)
    VALUES (p_policy_id, p_amount, CURRENT_TIMESTAMP);

    -- 2. Polisin qalıq borcunu azalt
    UPDATE public.policies
    SET remaining_debt = remaining_debt - p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE policy_id = p_policy_id;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Ödəniş zamanı xəta baş verdi: %', SQLERRM;
END;
$$;
```
:::

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: `NOT IN` və `NULL` Dəyərlər Tələsi**
> Əgər alt-sorğuda (`subquery`) bircə dənə belə `NULL` dəyər varsa, `WHERE Column NOT IN (SELECT NullableCol FROM ...)` şərti heç vaxt heç bir sətir qaytarmayacaq (3-valued logic: `TRUE`, `FALSE`, `UNKNOWN`). Müsahibədə hər zaman `NOT IN` yerinə `NOT EXISTS` istifadə edəcəyini vurğula; `NOT EXISTS` həm `NULL`-dan təsirlənmir, həm də optimizer tərəfindən çox vaxt `Anti-Semi-Join` kimi daha sürətli icra olunur!

> [!NOTE]
> **Qeyd: `UNION` ilə `UNION ALL` arasındakı fərqi unudaraq sistemi yükləmək**
> ETL boru kəmərlərində iki fərqli filialın və ya arxiv cədvəlinin məlumatlarını birləşdirərkən `UNION` yazmaq böyük xətadır. Əgər bilirsən ki, cədvəllər arasında üst-üstə düşmə yoxdur, mütləq `UNION ALL` yazılmalıdır. `UNION` arxa planda bütün məlumatı RAM və diskdə (`tempdb` / `work_mem`) çeşidləyərək unikal sətirləri saxlayır və milyonlarla sətirdə saatlarla gecikmə yaradır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"SQL və NoSQL verilənlər bazalarından, xarici API-lərdən və digər korporativ mənbələrdən məlumatların qəbulu... Sorğuların optimallaşdırılması və performans tənzimlənməsi."*
- **Sənin rolun**: Sığorta polisləri, zərərlər (claims), ödənişlər və müştərilər arasında mürəkkəb əlaqələri quran sorğular yazmaq; analitik hesabatlar üçün Window funksiyalarından istifadə etməklə təkrar sorğuların verilənlər bazasını yükləməsinin qarşısını almaq; miqrasiya zamanı T-SQL və PostgreSQL dialektlərinin tranzaksiya fərqlərini idarə etmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: `RANK()` ilə `DENSE_RANK()` funksiyaları arasındakı fərq nədir və hər biri hansı halda seçilməlidir?
<!-- answer-start -->
**Cavab:** Hər iki funksiya eyni dəyərə malik sətirlərə eyni sıra nömrəsi verir. Lakin `RANK()` növbəti fərqli dəyərə keçərkən dublikatların sayı qədər sıra nömrəsini buraxır (məsələn: 1, 2, 2, 4), `DENSE_RANK()` isə nömrələməni ardıcıl davam etdirir (məsələn: 1, 2, 2, 3). Əgər məqsəd ən çox sığorta haqqı ödəyən "Top 3" unikal məbləğ qrupunu tapmaqdırsa, `DENSE_RANK()` istifadə olunmalıdır.
<!-- answer-end -->

### Sual 2: Deadlock yaranmasının qarşısını almaq üçün tətbiq və SQL səviyyəsində hansı ən yaxşı təcrübələr mövcuddur?
<!-- answer-start -->
**Cavab:** Ən əsas qaydalar: 
1) Bütün tranzaksiyalarda cədvəllərə və sətirlərə eyni ardıcıllıqla müraciət etmək (məsələn, hər zaman əvvəlcə `Customers`, sonra `Policies`).
2) Tranzaksiyaları mümkün qədər qısa saxlamaq, tranzaksiya içində istifadəçi daxiletməsi və ya şəbəkə API sorğuları gözləməmək.
3) Lazımsız yerə yüksək izolyasiya səviyyələri seçməmək.
4) Sorğularda uyğun indekslərdən istifadə etmək ki, axtarış zamanı bütöv cədvəl kilidlənməsin (Row-level lock əvəzinə Table-level lock baş verməsin).
<!-- answer-end -->

### Sual 3: Bir cədvəlin 3NF-də (Üçüncü Normal Forma) olması üçün hansı şərtlər ödənməlidir?
<!-- answer-start -->
**Cavab:** Cədvəl əvvəlcə 2NF-də olmalıdır (hər sütun atomardır və ilkin açardan tam asılıdır). Əlavə olaraq, heç bir qeyri-açar sütun digər qeyri-açar sütundan asılı olmamalıdır (tranzitiv asılılıq olmamalıdır). Məsələn, `Policies` cədvəlində `AgentID`, `AgentName`, `AgentPhone` birlikdə saxlanılırsa, agentin adı və nömrəsi `PolicyID`-dən deyil, `AgentID`-dən asılıdır. 3NF üçün agent məlumatları ayrıca `Agencies` cədvəlinə çıxarılmalı və əsas cədvəldə yalnız xarici açar (`AgentID`) qalmalıdır.
<!-- answer-end -->
