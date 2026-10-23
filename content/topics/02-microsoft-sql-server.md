---
id: "02-microsoft-sql-server"
slug: "microsoft-sql-server"
order: 2
title: "Microsoft SQL Server Dərinliyi və Mühitin Təhlili"
category: "Microsoft SQL Server"
priority: "high"
readiness: "oyrenmeliyem"
vacancyLink: "Mövcud Microsoft SQL Server mühitinin təhlili və qiymətləndirilməsi: verilənlər bazaları, sxemlər, saxlanılan prosedurlar, asılılıqlar, performans problemləri"
tags: ["SQL Server", "Architecture", "Buffer Pool", "Transaction Log", "DMV", "Query Store", "Indexes", "Parameter Sniffing", "Execution Plans", "Wait Stats", "SSIS", "Dependencies"]
summary: "Fiziki fayllar, səhifə strukturu, Buffer Pool, T-SQL obyektləri, icra planları, statistika, Query Store, DMV monitorinqi, asılılıq analizi və ilk 2 həftəlik inventarizasiya planı."
---

# Microsoft SQL Server Dərinliyi və Mühitin Təhlili

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Microsoft SQL Server-i yüksək mühafizəli və mütəşəkkil **mərkəzi bank xəzinəsi** kimi təsəvvür edin:

### MDF və NDF Faylları: Zirzəmidəki Polad Seyflər
Bütün məlumatlar burada 8 KB-lıq sənəd qovluqlarında (**Data Pages**) və 64 KB-lıq bloklarda (**Extents**) səliqə ilə düzülüb. Böyük həcmli sığorta arxivləri disk yükünü balanslaşdırmaq üçün fərqli disklərdəki köməkçi seyflərə (`.ndf`) paylanır.

### Buffer Pool: Xəzinədarın İş Masası (RAM)
Müştəri sənəd istədikdə, bütöv bir 8 KB-lıq səhifə diskdən masaya gətirilir. Əgər tələb olunan səhifə artıq masadadırsa, cavab dərhal verilir (**Buffer Cache Hit**).

### Transaction Log (LDF Faylı): Mühafizəçinin Jurnalı
Seyfdə hər hansı bir sənədin yeri dəyişdirilməzdən və ya məbləğ yazılmazdan əvvəl, dərhal bu jurnala ardıcıl şəkildə qeyd olunur (**Write-Ahead Logging - WAL**). Server qəfil sönsə belə, bu jurnal əsasında hər şey bərpa olunur (**Crash Recovery**).

### Optimizer və Statistika: Təcrübəli Naviqator
Bir sorğu daxil olduqda, minlərlə mümkün yol arasından ən az I/O və CPU xərcləyən ən optimal icra planını (**Execution Plan**) seçir. Əgər onun əlindəki məlumat paylanması xəritəsi (Statistika) köhnəlibsə, 1 saniyəlik sadə sorğu saatlarla davam edən darboğaza çevrilir.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən real istehsalatda (production) illərlə böyük SQL Server klasterlərini idarə etməmişəm, lakin SQL Server-in daxili arxitekturasını dərindən başa düşürəm. Mövcud mühiti təhvil alarkən ilk addımım `sys.dm_exec_query_stats` ilə ən ağır sorğuları tapmaq, Query Store-u yoxlamaq, `sys.dm_os_wait_stats` ilə əsas darboğazları (I/O, CPU, Locking) aşkar etmək və `sys.sql_expression_dependencies` vasitəsilə cədvəl-prosedur asılılıq xəritəsini çıxarmaq olacaq."

---

## 2. Əsas anlayışlar (Ətraflı İzah)

### 2.1. Fiziki Arxitektura və Saxlama Vahidləri

SQL Server-də məlumatların fiziki və məntiqi saxlanma vahidləri bir neçə qatdan ibarətdir:

| Saxlama / Yaddaş Vahidi | Növü | Təyinatı və Daxili Strukturu | İstehsalat (Production) Qaydası |
| :--- | :--- | :--- | :--- |
| **Data Page (8 KB)** | Disk | Əsas I/O vahidi. 96 bayt başlıq, 8060 bayt məlumat və sətir ofset yuvalarından ibarətdir. | Sətir 8060 baytı keçdikdə `LOB_DATA` səhifələrinə çıxarılır. |
| **Extent (64 KB)** | Disk | 8 ədəd ardıcıl səhifədən ibarətdir. *Uniform* (tək obyekt) və *Mixed* (kiçik obyektlər) növləri var. | Böyük cədvəllər sürətli ardıcıl oxuma üçün həmişə Uniform Extent-lərdə saxlanılır. |
| **Data Files (`.mdf` / `.ndf`)** | Disk | `.mdf` əsas sistem faylı, `.ndf` isə əlavə köməkçi məlumat fayllarıdır. | I/O-nu paralelləşdirmək üçün fərqli fiziki disklərdə Filegroup-lar yaradılır. |
| **Transaction Log (`.ldf`)** | Disk / Log | Dairəvi (circular) çalışan **Virtual Log Files (VLF)** parçalarından ibarət əməliyyat jurnalı. | Auto-growth sabit addımlarla (məs. 256 MB və ya 512 MB) qoyulmalıdır, yoxsa minlərlə xırda VLF performansı çökdürür. |
| **Buffer Pool** | RAM | Data Cache (səhifələr) və Plan Cache (icra planları) üçün ayrılan əsas operativ yaddaş. | `max server memory` düzgün limitlənməlidir ki, Əməliyyat Sisteminə ən azı 4–8 GB sərbəst RAM qalsın. |
| **`tempdb`** | Sistem DB | Müvəqqəti cədvəllər (`#temp`), aralıq çeşidləmələr (`SORT`), Version Store üçün ortaq baza. | Disk rəqabətini (PFS/GAM contention) aradan qaldırmaq üçün nüvə sayına uyğun (maks. 8) bərabər həcmli data faylı açılmalıdır. |

#### Recovery Models (Bərpa Modelləri)

| Bərpa Modeli | Loqlama Səviyyəsi | Point-in-Time Recovery? | Qeyd və Risk |
| :--- | :--- | :---: | :--- |
| **Full** | Bütün əməliyyatlar tam qeyd olunur. | **Bəli** | İstehsalatın standartıdır. Müntəzəm Log Backup edilməsə, LDF faylı diski tam doldurar. |
| **Simple** | Checkpoint keçən kimi inaktiv loqlar təmizlənir. | Xeyr | Yalnız son Full/Diff backup anına qayıtmaq mümkündür. Test mühitləri üçün uyğundur. |
| **Bulk-Logged** | Kütləvi yükləmələr (`bcp`, `SELECT INTO`) minimal loqlanır. | Məhdud | Gecə ETL yükləmələrində log faylını qorumaq üçün keçici istifadə olunur. |

---

### 2.2. T-SQL Proqramlaşdırma Obyektlərinin Müqayisəsi

| Obyekt Növü | Tranzaksiya & DDL Dəstəyi | Çıxış Növü | İcra Planı və Performans Xüsusiyyəti |
| :--- | :--- | :--- | :--- |
| **Stored Procedure** | Bəli (`BEGIN TRAN`, `COMMIT`, `CREATE`) | Çoxlu nəticə dəsti, `OUTPUT` parametri | İcra planı keşlənir; biznes məntiqi və ETL üçün ən etibarlı vasitədir. |
| **Scalar UDF** | Xeyr | Tək bir skalyar dəyər | **RBAR (Row-By-Row) Tələsi!** Hər sətir üçün tək-tək çağırılır, paralelliyi dondurur. |
| **Inline TVF (iTVF)** | Xeyr | Cədvəl (`TABLE`) | Əsas sorğuya `JOIN` kimi daxil olur; optimizer tərəfindən tam optimallaşdırılır (çox sürətlidir). |
| **Multi-Statement TVF**| Xeyr | Daxili müvəqqəti cədvəl | Daxildə cədvəl dəyişəni açır; statistikası olmadığı üçün optimizer çox vaxt səhv plan seçir. |
| **Indexed View** | Xeyr | Fiziki cədvəl | Üzərində unikal Clustered Index yaradıldıqda diskdə saxlanılır; ağır aqreqasiyaları sürətləndirir. |

---

### 2.3. Tempdb Resursları: Temp Tables vs Table Variables vs CTE

| Xüsusiyyət | Common Table Expression (CTE) | Temp Table (`#Temp`) | Table Variable (`@Table`) |
| :--- | :--- | :--- | :--- |
| **Fiziki Məkan** | Yalnız yaddaşda məntiqi təsvir | `tempdb`-də fiziki cədvəl | `tempdb`-də fiziki struktur |
| **Statistika (Statistics)** | Yoxdur (Əsas sorğu ilə birləşir) | **Tam statistika toplanır** | **Statistika yoxdur** (Standart 1 sətir fərz edilir) |
| **İndeksləmə** | Mümkün deyil | Müstəqil indekslər yaradıla bilər | Yalnız ilkin açar / unikal məhdudiyyət |
| **Tranzaksiya `ROLLBACK`** | Əsas tranzaksiyadan asılıdır | Tranzaksiya geri çəkildikdə ləğv edilir | **Geri qayıtmır** (`ROLLBACK`-dən təsirlənmir) |
| **Tövsiyə Olunan Həcm** | Qısa, oxunaqlı təkrar istifadə | Böyük həcmlər (1000+ sətir) | Yalnız çox kiçik lüğətlər (< 100 sətir) |

---

### 2.4. İndekslər, İcra Planları və Parameter Sniffing

#### İndeks Mexanizmləri
- **Clustered Index:** Cədvəlin sətirlərini B-Tree-nin ən aşağı yarpaq (Leaf) səviyyəsində fiziki ardıcıllıqla saxlayır. Cədvəldə yalnız 1 dənə ola bilər. Əgər Clustered Index yoxdursa, cədvəl **Heap** (xaotik yığın) adlanır.
- **Non-Clustered Index:** Açar dəyərini və həmin sətrin fiziki ünvanını (Clustered Index varsa Clustering Key-i, yoxdursa RID - Row ID) saxlayır.
- **Covering Index və `INCLUDE` Klauzulası:** Əgər sorğu indeksdə olmayan sütunları da tələb edirsə, SQL Server hər sətir üçün əsas cədvələ gedib əlavə oxuma etməlidir (**Key Lookup**). Əlavə sütunlar `INCLUDE (ColA, ColB)` ilə indeksin yarpaq səviyyəsinə qoyulur; B-Tree dərinləşmir, lakin Key Lookup **0-a enir**.

#### Execution Plan (İcra Planı) Əsas Operatorları
- **Index Seek:** B-Tree ağacından birbaşa hədəf sətirləri tapır (ən effektiv operator).
- **Index Scan:** Bütün indeks ağacını başdan-ayağa oxuyur.
- **Key Lookup:** Qeyri-klaster indeksdən sonra çatışmayan sütunlar üçün əsas cədvələ əlavə I/O müraciətidir.
- **Nested Loops:** Bir tərəf kiçik, digər tərəf indeksli olanda sürətlidir.
- **Hash Match:** Böyük indekslənməmiş cədvəllərin `tempdb`/RAM keşində birləşdirilməsidir.

#### Parameter Sniffing Problemi
Stored Procedure ilk dəfə çağırıldıqda ötürülən parametrə görə icra planı tərtib olunur və keşə atılır. Əgər `@Status = 'Cancelled'` parametri cəmi 5 sətir gətirirsə və `Nested Loops` planı keşlənirsə, növbəti dəfə `@Status = 'Active'` parametri ilə çağırılanda (3 milyon sətir) eyni Nested Loops planı işləyir və server iflic olur.

---

### 2.5. Diaqnostika: Query Store, DMV-lər və Wait Stats

#### Ən Vacib DMV-lər (Dynamic Management Views)
- `sys.dm_exec_query_stats`: Ən çox CPU, I/O və icra vaxtı xərcləyən sorğuların statistikası.
- `sys.dm_db_index_usage_stats`: Hansı indekslərin oxunduğunu, hansıların isə yalnız yazma əməliyyatında yük yaratdığını göstərir.
- `sys.dm_db_missing_index_details`: SQL Server-in özünün təklif etdiyi çatışmayan indekslər.

#### Əsas Wait Statistikaları (`sys.dm_os_wait_stats`)
- `PAGEIOLATCH_SH`: Məlumat səhifəsinin diskdən RAM-a gətirilməsini gözləmə (Disk darboğazı və ya Buffer Pool çatışmazlığı).
- `CXPACKET` / `CXCONSUMER`: Sorğunun paralel axınları arasında gözləmə (`MAXDOP` tənzimlənməlidir).
- `LCK_M_...`: Tranzaksiyaların kilid gözləməsi (Bloklanma).
- `WRITELOG`: Transaction Log-un (LDF) diskə yazılma gecikməsi.

---

## 3. Kod nümunələri (T-SQL Skriptləri)

### Nümunə 1: SQL Server Mühitini İnventarizasiya Etmək (Cədvəllər, Sətir Sayı və Disk Sahəsi)

Atəşgah Sığorta-da ilk həftə bütün cədvəllərin fiziki həcmini və sətir sayını müəyyənləşdirmək üçün skript:

```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- Cədvəllərin sətir sayı, data və indeks ölçülərinin inventarizasiyası
SELECT 
    t.name AS TableName,
    s.name AS SchemaName,
    p.rows AS TotalRows,
    CAST(ROUND(((SUM(a.total_pages) * 8) / 1024.00), 2) AS NUMERIC(18, 2)) AS TotalSpaceMB,
    CAST(ROUND(((SUM(a.used_pages) * 8) / 1024.00), 2) AS NUMERIC(18, 2)) AS UsedSpaceMB,
    CAST(ROUND(((SUM(a.total_pages) - SUM(a.used_pages)) * 8) / 1024.00, 2) AS NUMERIC(18, 2)) AS UnusedSpaceMB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE t.is_ms_shipped = 0 AND i.index_id <= 1 -- Clustered Index və ya Heap
GROUP BY t.name, s.name, p.rows
ORDER BY TotalSpaceMB DESC;
```

---

### Nümunə 2: Çatışmayan İndekslərin (Missing Indexes) DMV ilə Tapılması

Optimizer-in ən çox ehtiyac duyduğu və sorğuları sürətləndirəcək indeks təklifləri:

```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- Çatışmayan indekslərin gözlənilən təsir faizi ilə siyahısı
SELECT TOP (10)
    mig.index_group_handle,
    mid.index_handle,
    CONVERT(DECIMAL(28,1), migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans)) AS ImprovementScore,
    'CREATE INDEX IX_' + OBJECT_NAME(mid.object_id) + '_' + 
        REPLACE(REPLACE(REPLACE(ISNULL(mid.equality_columns,''),', ','_'),'[',''),']','') +
        CASE WHEN mid.inequality_columns IS NOT NULL THEN '_' + REPLACE(REPLACE(REPLACE(mid.inequality_columns,', ','_'),'[',''),']','') ELSE '' END +
        ' ON ' + mid.statement + ' (' + ISNULL(mid.equality_columns,'') + 
        CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ', ' ELSE '' END +
        ISNULL(mid.inequality_columns, '') + ')' +
        ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS CreateIndexStatement,
    migs.user_seeks,
    migs.user_scans,
    migs.avg_user_impact AS ExpectedImpactPct
FROM sys.dm_db_missing_index_groups mig
INNER JOIN sys.dm_db_missing_index_group_stats migs ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
ORDER BY ImprovementScore DESC;
```

---

### Nümunə 3: Stored Procedure və Cədvəl Asılılıq Analizi (`sys.sql_expression_dependencies`)

Miqrasiya və ya refaktorinq zamanı bir cədvəlin hansı prosedurlara bağlandığını görmək:

```sql
-- Dialect: T-SQL (Microsoft SQL Server)
-- Sığorta cədvəlindən asılı olan bütün prosedurlar və funksiyalar
SELECT 
    ReferencingObject = SCHEMA_NAME(o.schema_id) + '.' + o.name,
    ObjectType = o.type_desc,
    ReferencedEntity = d.referenced_entity_name,
    ReferencedSchema = ISNULL(d.referenced_schema_name, 'dbo')
FROM sys.sql_expression_dependencies AS d
INNER JOIN sys.objects AS o ON d.referencing_id = o.object_id
WHERE d.referenced_entity_name = 'Policies' -- Yoxlanılacaq cədvəl
ORDER BY ObjectType, ReferencingObject;
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Parameter Sniffing Fəlakəti və Yanlış Həllər**
> Çox vaxt tərtibatçılar bütün prosedura `WITH RECOMPILE` əlavə edirlər. Bu zaman hər bir çağırışda CPU icra planını yenidən hesablayır və yüksək sorğu yükü altında CPU 100%-ə çatır.
> **Düzgün yanaşma:** 
> 1) Əgər məlumat həddindən artıq qeyri-bərabər paylanıbsa, yalnız həmin sorğuya `OPTION (RECOMPILE)` vermək.
> 2) Və ya `OPTIMIZE FOR (@Status = 'Active')` / `OPTIMIZE FOR UNKNOWN` istifadə etmək.
> 3) Parametri prosedur daxilində yerli dəyişənə mənimsətmək (`DECLARE @LocalStatus = @Status; WHERE Status = @LocalStatus`).

> [!NOTE]
> **Linked Server Üzərində Filtrsiz Dörd Hissəli Sorğu Göndərmək**
> `SELECT * FROM [RemoteServer].[InsuranceDB].[dbo].[Claims] WHERE ClaimDate >= '2026-01-01'` yazdıqda, SQL Server çox vaxt uzaq serverdəki **bütün cədvəli** şəbəkə ilə yerli serverə çəkir və filtri burada tətbiq edir!
> **Düzgün həll:** Mütləq `OPENQUERY` istifadə edərək filtri uzaq serverdə icra etmək:
> `SELECT * FROM OPENQUERY([RemoteServer], 'SELECT * FROM InsuranceDB.dbo.Claims WHERE ClaimDate >= ''2026-01-01''')`.

---

## 5. Vakansiya ilə əlaqə: İlk 2 Həftənin Fəaliyyət Planı (Atəşgah Sığorta)

Müsahibədə səndən: *"Bizim mövcud SQL Server mühitimiz var, yüzlərlə sənədsiz prosedur və cədvəl var. İlk 2 həftədə nə edəcəksən?"* soruşulduqda, bu dəqiq 4-mərhələli planı de:

1. **Gün 1–3: Mühitin İventarizasiyası və Sağlamlıq Yoxlanışı (Health Check)**
   - SQL Server versiyası, Edition, Patch səviyyəsi, RAM/CPU konfiqurasiyası, `MAXDOP` və `Cost Threshold for Parallelism` parametrlərini çıxarmaq.
   - Bütün verilənlər bazalarının Recovery Model-lərini (`Full` vs `Simple`) və backup qrafiklərini yoxlamaq (LDF fayllarının vəziyyəti).
   - `sys.tables` və `sys.partitions` ilə cədvəllərin sətir sayını və disk həcmini cədvəlləşdirmək.
2. **Gün 4–6: Performans və Darboğaz Diaqnostikası**
   - Query Store aktiv deyilsə, təhlükəsiz şəkildə aktivləşdirmək.
   - `sys.dm_os_wait_stats` ilə serverin əsas gözləmə tipini (`PAGEIOLATCH_SH` — I/O, `CXPACKET` — paralellik, `LCK_M_...` — bloklanma) aşkar etmək.
   - `sys.dm_exec_query_stats` ilə ən çox CPU və I/O yeyən "Top 10" sorğunu və proseduru sənədləşdirmək.
3. **Gün 7–9: Asılılıq və İnteqrasiya Xəritəsinin Qurulması**
   - `sys.sql_expression_dependencies` vasitəsilə hansı cədvəllərin hansı saxlanılan prosedurlarla əlaqəli olduğunu müəyyənləşdirmək.
   - SQL Server Agent tapşırıqlarını (Jobs), SSIS paketlərini və Linked Server bağlantılarını siyahıya almaq.
4. **Gün 10: Nəticələrin Təqdimatı və Miqrasiyaya Hazırlıq Hesabatı**
   - Problemli cədvəllər (Heap cədvəllər, istifadə olunmayan indekslər, çatışmayan indekslər).
   - PostgreSQL-ə miqrasiya zamanı çətinlik yaradacaq T-SQL spesifik obyektlərin (CLR, dynamic SQL, XML/HierarchyID) siyahısı.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: Temp table (`#temp`) ilə Table variable (`@table`) arasındakı əsas daxili fərqlər hansılardır və nə üçün böyük məlumatlarda table variable zərər verə bilər?
<!-- answer-start -->
**Cavab:** Hər ikisi fiziki olaraq `tempdb`-dən istifadə edir. Lakin `#temp` cədvəlində tam statistika toplanır və indekslər yaradıla bilər, optimizer real sətir sayını bilərək düzgün join seçir. `@table` üzərində isə statistika olmur; SQL Server onun həmişə 1 sətir olduğunu fərz edir (Cardinality = 1). Daxilində 1 milyon sətir olduqda optimizer Nested Loops seçərək sistemi iflic edir. Həmçinin, istifadəçi tranzaksiyasında `ROLLBACK` baş verdikdə `#temp` geri qayıdır, `@table` isə qayıtmır.
<!-- answer-end -->

### Sual 2: Parameter Sniffing nədir və `OPTION (RECOMPILE)` ilə `OPTIMIZE FOR UNKNOWN` arasındakı fərq nədir?
<!-- answer-start -->
**Cavab:** Stored Procedure ilk dəfə icra olunarkən daxil edilən parametr dəyərinə uyğun icra planı hazırlanır və keşlənir. Əgər sonrakı çağırışlarda fərqli həcmdə məlumat qaytaran parametrlər gələrsə, köhnə plan zəif performans göstərir. `OPTION (RECOMPILE)` hər icrada planı yenidən tərtib edir (CPU xərci artır). `OPTIMIZE FOR UNKNOWN` isə konkret parametrin histoqramına deyil, ümumi orta sıxlıq vektoruna (Density Vector) əsaslanan stabil və orta dərəcəli plan seçir.
<!-- answer-end -->

### Sual 3: `PAGEIOLATCH_SH` wait statistikası nəyi göstərir və onu necə diaqnostika etmək lazımdır?
<!-- answer-start -->
**Cavab:** Bu gözləmə növü sorğunun tələb etdiyi məlumat səhifəsinin operativ yaddaşda (Buffer Pool) olmadığını və diskdən RAM-a oxunmasını gözlədiyini bildirir. Əgər sistemdə bu wait tipi liderdirsə: 1) İndekslərin çatışmaması səbəbindən nəhəng `Index Scan` və ya `Table Scan`-lər baş verir; 2) Serverdə RAM (Buffer Pool) çatışmır; 3) Disk alt-sistemi (I/O latency) ləng işləyir. Əvvəlcə `sys.dm_exec_query_stats` ilə ən çox `logical_reads` və `physical_reads` edən sorğular tapılıb indekslərlə optimallaşdırılmalıdır.
<!-- answer-end -->
