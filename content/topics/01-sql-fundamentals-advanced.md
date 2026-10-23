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

SQL-i böyük bir **mərkəzi logistika mərkəzinin naviqasiya və idarəetmə sistemi** kimi təsəvvür edin:

### Cədvəllər və JOIN-lər: Malların Konveyerlə Birləşdirilməsi
Hər bir cədvəl anbarın fərqli otağıdır (məsələn, müştərilər, sığorta polisləri, ödənişlər). `JOIN` əməliyyatları bu otaqlardakı qutuları ortaq identifikasiya nömrəsi ilə bir araya gətirən konveyerlərdir. Əgər yanlış açarla və ya dublikatlı cədvəllə birləşdirmə aparılsa, sistem lazımsız təkrarlanan sətirlərlə dolur (**Cartesian Explosion**).

### Window Functions: Hərəkət Edən Qatarın Pəncərəsindən Baxan Müfəttiş
Standart `GROUP BY` əməliyyatı sətirləri qruplaşdırıb sıxır və ilkin xırdalıqları itirir. Window funksiyaları isə hər bir orijinal sətri olduğu kimi saxlayır və hərəkət edərək ətraf sətirlərlə müqayisələr aparır: *"Bu müştərinin son 3 ödənişinin orta məbləği nə qədərdir?"* və ya *"Bu sığorta hadisəsi müştərinin neçənci müraciətidir?"*.

### Tranzaksiyalar və ACID: Bankomatın Dəqiqlik Qaydası
Bankomatdan nağd pul çıxararkən əməliyyat ya 100% uğurla tamamlanır (kartdan pul silinir və nağd pul çıxır — `COMMIT`), ya da hər hansı nasazlıqda əməliyyat sıfırlanır və balans bərpa olunur (`ROLLBACK`). Tranzaksiyada heç vaxt yarımçıq vəziyyət ola bilməz.

> [!TIP]
> **Müsahibədə belə de:**
> "Data Mühəndisi olaraq SQL-də sorğunun nəticəsi qədər onun icra planı (Execution Plan) və resurs sərfiyyatı vacibdir. Böyük həcmli boru kəmərlərində dublikatları təmizləmək üçün `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` ən etibarlı və idempotent deduplikasiya standartıdır. Həmçinin `NOT IN` yerinə `NOT EXISTS` istifadə etmək həm `NULL` risklərini aradan qaldırır, həm də optimizer tərəfindən Anti-Semi-Join kimi daha sürətli icra olunur."

---

## 2. Əsas anlayışlar

### 2.1. JOIN Növləri və Çoxluq Əməliyyatları (Set Operations)

Böyük analitik sorğularda düzgün JOIN növünün seçilməsi həm düzgün nəticə, həm də yaddaş resurslarının qorunması üçün vacibdir:

| JOIN Növü | Məntiqi və İş Prinsipi | Nəticə Dəsti | Sığorta Ssenarisi |
| :--- | :--- | :--- | :--- |
| **`INNER JOIN`** | Hər iki cədvəldə birləşdirmə şərtinə tam uyğun gələn sətirləri saxlayır. | Yalnız ortaq kəsişmə. | Yalnız məlumat bazasında müştəri profili olan aktiv polislər. |
| **`LEFT JOIN`** | Sol cədvəlin bütün sətirlərini saxlayır, sağ cədvəldən yalnız uyğun gələnləri əlavə edir. | Uyğunluq olmadıqda sağ tərəf `NULL` olur. | Bütün qeydiyyatdan keçmiş müştərilər və varsa onların sığorta polisləri. |
| **`FULL OUTER JOIN`** | Hər iki cədvəldən həm uyğun gələn, həm də uyğun gəlməyən bütün sətirləri birləşdirir. | Uyğunsuzluq olan yerlərə `NULL` yazılır. | İki fərqli sistemdən (məsələn, köhnə SQL Server və yeni CRM) gələn polislərin tutuşdurulması. |
| **`CROSS JOIN`** | Hər bir sətri digər cədvəlin bütün sətirləri ilə birləşdirir ($N \times M$ sətir). | Dekart hasili (Cartesian Product). | Bütün sığorta filialları $\times$ Bütün sığorta məhsul növləri matrisinin qurulması. |
| **`ANTI-JOIN`** | Yalnız sağ cədvəldə **mövcud olmayan** sol sətirləri tapır (`NOT EXISTS` və ya `LEFT JOIN ... WHERE right.id IS NULL`). | Uyğunluğu olmayan tək sol tərəf. | Sistemdə qeydiyyatı olan, lakin heç vaxt zərər iddiası (claim) qaldırmamış polislər. |
| **`SEMI-JOIN`** | Sağ cədvəldə ən azı bir uyğunluq olduğunu yoxlayır, lakin sətir sayını çoxaltmır (`WHERE EXISTS`). | Yalnız unikal sol sətirlər. | Cari ildə ən azı bir dəfə kompensasiya ödənişi almış müştərilərin siyahısı. |

#### Çoxluq Əməliyyatları: `UNION ALL` vs `UNION`
- `UNION ALL`: İki sorğunun nəticələrini birbaşa alt-alta yapışdırır. Dublikat yoxlaması aparmadığı üçün son dərəcə sürətlidir.
- `UNION`: Dublikatları aradan qaldırmaq üçün nəticəni yaddaşda və diskdə (`Sort / Distinct`) çeşidləyir. Milyonlarla sətirlik cədvəllərdə böyük I/O xərci yaradır. Əgər məlumatların kəsişmədiyi dəqiqdirsə, həmişə `UNION ALL` seçilməlidir.

---

### 2.2. Window (Pəncərə) Funksiyaları

Window funksiyaları analitik hesabatların əsas alətidir. Ümumi sintaksis qaydası:
$$\text{FUNCTION}() \text{ OVER} (\text{PARTITION BY } \text{qrup\_sütunu } \text{ORDER BY } \text{sıralama\_sütunu } [\text{ROWS BETWEEN ...}])$$

#### Sıralama Funksiyalarının Müqayisə Cədvəli

| Funksiya | Nömrələmə Davranışı | Nümunə Nəticə (Dəyərlər: 500, 500, 300, 100) | Əsas İstifadə Yeri |
| :--- | :--- | :--- | :--- |
| **`ROW_NUMBER()`** | Hər bir sətrə təkrarolunmaz unikal sıra verir. | 1, 2, 3, 4 | ETL-də deduplikasiya və ən son statuslu sətirlərin seçilməsi. |
| **`RANK()`** | Eyni dəyərlərə eyni sıra verir, təkrar sayı qədər sonrakı nömrəni buraxır. | 1, 1, 3, 4 | Reytinq və müsabiqə cədvəlləri. |
| **`DENSE_RANK()`** | Eyni dəyərlərə eyni sıra verir, lakin nömrələmə ardıcıllığını qırmır. | 1, 1, 2, 3 | Ən yüksək "Top N" mükafat qruplarının seçilməsi. |
| **`NTILE(n)`** | Nəticə dəstini $n$ sayda bərabər həcmli qrupa (kvantilə) bölür. | 1, 1, 2, 2 ($n=2$ üçün) | Müştərilərin risk səviyyələrinə (kvartillərə) paylanması. |

#### Naviqasiya və Aqreqasiya Funksiyaları
- `LAG(sütun, 1)`: Cari sətirdən əvvəlki sətrin dəyərini gətirir (məsələn, müştərinin ötən ilki sığorta haqqı ilə cari haqqını müqayisə etmək üçün).
- `LEAD(sütun, 1)`: Cari sətirdən sonrakı sətrin dəyərini gətirir.
- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: Qrupun əvvəlindən cari sətrə qədər artan kümülyativ cəmi (Running Total) hesablayır.

---

### 2.3. Rekursiv CTE (Common Table Expressions)

CTE (`WITH ... AS`) müvəqqəti nəticə dəstidir. Rekursiv CTE isə öz-özünü təkrar çağıran mexanizmdir və iki hissədən ibarətdir:
1. **Anchor Member (Təməl hissə):** Rekursiyanın başladığı ilkin sətirlər (məsələn, tabeçiliyi olmayan rəhbərlər: `ParentID IS NULL`).
2. **Recursive Member (Rekursiv hissə):** Əvvəlki addımın nəticəsinə birləşən və şərt ödənilənədək davam edən hissə.
3. **Birləşdirici:** İki hissə mütləq `UNION ALL` ilə birləşdirilir.

Sığorta şirkətlərində baş idarə, regional filiallar və sub-agentliklər arasındakı iyerarxik ağacı açmaq üçün rekursiv CTE əvəzolunmazdır. Sonsuz dövrün qarşısını almaq üçün `MAXRECURSION` limitindən istifadə olunmalıdır.

---

### 2.4. Tranzaksiyalar, ACID və İzolyasiya Səviyyələri

Verilənlər bazasında əməliyyatların etibarlılığı **ACID** prinsipləri ilə təmin olunur:
- **A (Atomicity):** Əməliyyatlar ya tam baş verir, ya da heç biri icra olunmur (`All-or-Nothing`).
- **C (Consistency):** Bütün biznes qaydaları, məhdudiyyətlər (`FK`, `CHECK`, `UNIQUE`) qorunur.
- **I (Isolation):** Paralel işləyən istifadəçilər bir-birinin yarımçıq qalmış əməliyyatlarını görmür.
- **D (Durability):** Təsdiq edilmiş (`COMMIT`) dəyişikliklər server çöksə belə qorunur.

#### Tranzaksiya İzolyasiya Səviyyələri və Məlumat Anomaliyaları

| İzolyasiya Səviyyəsi | Çirkli Oxuma (Dirty Read) | Təkrarlanmayan Oxuma (Non-repeatable Read) | Fantom Oxuma (Phantom Read) | İş Mexanizmi və Qeyd |
| :--- | :---: | :---: | :---: | :--- |
| **`Read Uncommitted`** | Baş verir | Baş verir | Baş verir | Kilidsiz oxuma aparır; analitikada qətiyyən tövsiyə edilmir. |
| **`Read Committed`** | **Qorunur** | Baş verir | Baş verir | Əksər RDBMS-lərin (SQL Server, PostgreSQL) standart rejimidir. |
| **`Repeatable Read`** | **Qorunur** | **Qorunur** | Baş verir (PG-də qorunur) | Tranzaksiya boyu oxunmuş sətirlər dəyişdirilə bilməz. |
| **`Serializable`** | **Qorunur** | **Qorunur** | **Qorunur** | Tranzaksiyalar tam ardıcıl simulyasiya olunur; yüksək kilid xərci var. |
| **`Snapshot`** | **Qorunur** | **Qorunur** | **Qorunur** | Kilidlərdən deyil, tranzaksiya anındakı sətir versiyalarından oxuyur. |

---

### 2.5. Kilidlənmələr (Locks), Deadlock və Normallaşdırma

#### Kilid Növləri (Locks)
- **Shared Lock (`S`):** Oxuma kilididir. Çoxsaylı oxuyucular eyni anda səhifəni və ya sətri oxuya bilər.
- **Exclusive Lock (`X`):** Yazma və yeniləmə kilididir. Yalnız tək bir tranzaksiyaya məxsusdur; başqa heç bir proses həmin məlumatı oxuya və ya dəyişə bilməz.

#### Deadlock (Dalana Dirənmə)
İki tranzaksiya bir-birinin kilidlədiyi resursları qarşılıqlı olaraq gözlədikdə baş verir:
- Tranzaksiya A `Polis` cədvəlini kilidləyib `Müştəri` cədvəlini gözləyir.
- Tranzaksiya B `Müştəri` cədvəlini kilidləyib `Polis` cədvəlini gözləyir.
- Bazanın daxili Deadlock detektoru bunlardan birini "qurban" (`Deadlock Victim`) seçərək ləğv edir (`ROLLBACK`).

#### Normallaşdırma (1NF–3NF) vs Denormallaşdırma
- **1NF (Birinci Normal Forma):** Hər xanada yalnız tək, bölünməz (atomar) dəyər olmalıdır.
- **2NF (İkinci Normal Forma):** 1NF tələbi ödənməli və bütün qeyri-açar sütunlar bütöv ilkin açardan tam asılı olmalıdır (qismən asılılıq qadağandır).
- **3NF (Üçüncü Normal Forma):** 2NF tələbi ödənməli və qeyri-açar sütunlar arasında heç bir tranzitiv asılılıq olmamalıdır.
- **Denormallaşdırma:** Data Warehouse və Lakehouse mühitlərində çoxsaylı `JOIN`-ləri aradan qaldırıb sorğu sürətini artırmaq üçün məlumatların məqsədli şəkildə geniş fakt və ölçü cədvəllərində birləşdirilməsi.

---

## 3. Kod nümunələri (Dialect Tabs ilə)

### Nümunə 1: Window Functions — Hər Müştəri Üzrə Son Polisin Seçilməsi (Deduplikasiya) və Kümülyativ Cəm

Müştərinin ən son sığorta polisini seçmək və artan toplam sığorta haqqını hesablamaq:

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
        -- Müştəri üzrə kümülyativ artan cəm (Running Total)
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
        -- Müştəri üzrə kümülyativ artan cəm (Running Total)
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

Sığorta şirkətlərində baş agentlik və sub-agentliklərin ağac strukturunu təhlil etmək:

:::tabs
@tab T-SQL
```sql
-- Dialect: T-SQL (Microsoft SQL Server)
WITH AgencyHierarchy AS (
    -- Anchor member: Ən yuxarı rəhbər agentliklər
    SELECT 
        AgencyID,
        AgencyName,
        ParentAgencyID,
        0 AS HierarchyLevel,
        CAST(AgencyName AS VARCHAR(500)) AS HierarchyPath
    FROM dbo.Agencies
    WHERE ParentAgencyID IS NULL

    UNION ALL

    -- Recursive member: Tabe olan alt agentlikləri zəncirə əlavə etmək
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

Sığorta ödənişini qəbul edib müqavilə borcunu yeniləyən atomar əməliyyat:

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
> **`NOT IN` və `NULL` Dəyərlər Tələsi**
> Əgər alt-sorğuda (`subquery`) bircə dənə belə `NULL` dəyər varsa, `WHERE Column NOT IN (SELECT NullableCol FROM ...)` şərti heç vaxt heç bir sətir qaytarmayacaq (3-valued logic: `TRUE`, `FALSE`, `UNKNOWN`). Müsahibədə hər zaman `NOT IN` yerinə `NOT EXISTS` istifadə edəcəyini vurğula; `NOT EXISTS` həm `NULL`-dan təsirlənmir, həm də optimizer tərəfindən çox vaxt `Anti-Semi-Join` kimi daha sürətli icra olunur!

> [!NOTE]
> **`UNION` ilə `UNION ALL` Arasındakı Fərqi Unudaraq Sistemi Yükləmək**
> ETL boru kəmərlərində iki fərqli filialın və ya arxiv cədvəlinin məlumatlarını birləşdirərkən `UNION` yazmaq böyük xətadır. Əgər bilirsən ki, cədvəllər arasında üst-üstə düşmə yoxdur, mütləq `UNION ALL` yazılmalıdır. `UNION` arxa planda bütün məlumatı RAM və diskdə (`tempdb` / `work_mem`) çeşidləyərək unikal sətirləri saxlayır və milyonlarla sətirdə saatlarla gecikmə yaradır.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya Tələbi:** *"SQL və NoSQL verilənlər bazalarından, xarici API-lərdən və digər korporativ mənbələrdən məlumatların qəbulu... Sorğuların optimallaşdırılması və performans tənzimlənməsi."*
- **Sənin Rolun:** 
  1. Sığorta polisləri, zərərlər (claims), ödənişlər və müştərilər arasında mürəkkəb əlaqələri quran optimal sorğular yazmaq.
  2. Analitik hesabatlar üçün Window funksiyalarından istifadə etməklə təkrar aqreqasiya sorğularının verilənlər bazasını yükləməsinin qarşısını almaq.
  3. Miqrasiya zamanı T-SQL və PostgreSQL dialektlərinin tranzaksiya idarəetməsi fərqlərini tətbiq etmək.

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
