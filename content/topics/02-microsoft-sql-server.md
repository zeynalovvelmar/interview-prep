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
- **MDF və NDF faylları (Əsas və Köməkçi Yaddaş)**: Xəzinənin dərin zirzəmisindəki polad seyflərdir. Bütün sənədlər burada 8 KB-lıq qovluqlarda (**Data Pages**) və 64 KB-lıq bloklarda (**Extents**) səliqə ilə düzülüb.
- **Buffer Pool (Əməliyyat Masası - RAM)**: Xəzinədarın iş masasıdır. Müştəri sənəd istədikdə, bütöv bir 8 KB-lıq qovluq diskdən masaya gətirilir. Əgər qovluq artıq masadadırsa, cavab dərhal verilir (**Buffer Cache Hit**).
- **Transaction Log (LDF faylı - Hadisə Jurnalı)**: Xəzinənin qapısındakı mühafizəçinin dəftəridir. Seyfdə hər hansı bir sənədin yeri dəyişdirilməzdən və ya məbləğ yazılmazdan əvvəl, dərhal bu jurnala ardıcıl şəkildə qeyd olunur (**Write-Ahead Logging - WAL**). Elektrik sönsə belə, bu jurnal əsasında hər şey bərpa olunur (**Crash Recovery**).
- **Optimizer və Statistika**: Təcrübəli naviqatordur. Bir sorğu gələndə minlərlə mümkün yol arasından ən az I/O və CPU xərcləyən ən optimal icra planını (**Execution Plan**) seçir. Əgər onun əlindəki xəritə (Statistika) köhnəlibsə, 1 saniyəlik sorğu saatlarla davam edən kabusa çevrilir.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən real istehsalatda (production) illərlə böyük SQL Server klasterlərini idarə etməmişəm, lakin SQL Server-in daxili arxitekturasını dərindən başa düşürəm. Mövcud mühiti təhvil alarkən ilk addımım `sys.dm_exec_query_stats` ilə ən ağır sorğuları tapmaq, Query Store-u yoxlamaq, `sys.dm_os_wait_stats` ilə əsas darboğazları (I/O, CPU, Locking) aşkar etmək və `sys.sql_expression_dependencies` vasitəsilə cədvəl-prosedur asılılıq xəritəsini çıxarmaq olacaq."

---

## 2. Əsas anlayışlar (Ətraflı İzah)

### 2.1. Fiziki Arxitektura və Saxlama Vahidləri
- **Data Files (`.mdf` və `.ndf`)**:
  - `.mdf` (Primary Data File): Verilənlər bazasının başlanğıc nöqtəsi və sistem cədvəllərinin saxlandığı əsas fayl.
  - `.ndf` (Secondary Data Files): Böyük bazalarda I/O yükünü fərqli disklərə paylamaq üçün yaradılan əlavə məlumat faylları.
  - `Filegroups`: Məlumat fayllarını məntiqi qruplaşdırmaq və cədvəlləri/indeksləri spesifik disklərdə yerləşdirmək üçün istifadə olunur.
- **Pages və Extents**:
  - **Data Page (8 KB)**: SQL Server-də məlumatın fiziki oxunma və yazılma vahididir. 96 bayt başlıq (Header), 8060 bayt istifadəçi məlumatı və sətir ofset yuvalarından ibarətdir. Sətir 8060 baytdan böyük olduqda `LOB_DATA` (Large Object) səhifələrinə çıxarılır.
  - **Extent (64 KB)**: 8 ədəd ardıcıl səhifədən ibarətdir. *Uniform Extent* (bütün 8 səhifə tək bir obyektə məxsusdur) və *Mixed Extent* (kiçik cədvəllər arasında paylaşılır).
- **Buffer Pool**:
  - SQL Server RAM-ının əsas hissəsi.
  - **Data Cache**: Diskdən oxunmuş məlumat səhifələri.
  - **Plan Cache**: Kompilyasiya olunmuş T-SQL sorğu və prosedur icra planları.
  - **Dirty Page**: RAM-da yenilənmiş, lakin hələ MDF faylına yazılmamış səhifə.
  - **Checkpoint**: Bütün dirty page-ləri diskə yazan arxa plan prosesi.
  - **Lazy Writer**: RAM çatışmazlığı olduqda köhnə/az istifadə olunan səhifələri təmizləyərək yeni oxumalar üçün yer açan proses.
- **Transaction Log (`.ldf`) və Virtual Log Files (VLFs)**:
  - LDF faylı daxilən dairəvi (circular) strukturda işləyən kiçik **VLF** (Virtual Log File) parçalarına bölünür.
  - Həddindən artıq kiçik addımlarla avtomatik böyümə (`Auto-growth 1MB`) minlərlə xırda VLF yaradır (**VLF Fragmentation**) və verilənlər bazasının açılmasını, backup/restore prosesini kəskin ləngidir.
- **Recovery Models (Bərpa Modelləri)**:
  - **Full**: Hər bir DML/DDL əməliyyatı tam loqlanır. Point-in-time recovery mümkündür. Müntəzəm Log Backup tələb edir, əks halda LDF diski doldurur!
  - **Simple**: Checkpoint keçən kimi inaktiv loqlar təmizlənir. Diskə qənaət edir, lakin yalnız son Full/Diff backup nöqtəsinə qayıtmaq mümkündür.
  - **Bulk-Logged**: `SELECT INTO`, `bcp`, indeks yenidənqurmaları minimal loqlanır.

---

### 2.2. T-SQL Proqramlaşdırma Obyektləri
- **Stored Procedures vs Functions vs Views vs Triggers**:
  - `Stored Procedure`: DML və DDL icra edə bilər, tranzaksiyaları idarə edir (`BEGIN TRAN/COMMIT`), çıxış parametrləri (`OUTPUT`) qaytara bilər, icra planı keşlənir.
  - `Scalar User-Defined Function (UDF)`: Tək dəyər qaytarır. `WHERE` və ya `SELECT` daxilində çağırıldıqda hər bir sətir üçün tək-tək icra olunur (**Row-by-Row RBAR**) və paralelliyi (`Parallel Execution`) bloklayır! SQL Server 2019-a qədər UDF-lər ən böyük gizli performans qatilidir.
  - `Inline Table-Valued Function (iTVF)`: Tək bir `SELECT` ilə cədvəl qaytarır. Optimizer onu əsas sorğuya `JOIN` kimi daxil edir (çox sürətlidir).
  - `Multi-Statement TVF (mSTVF)`: Daxilində müvəqqəti cədvəl yaradıb doldurur; optimizer sətir sayını dəqiq təxmin edə bilmədiyi üçün çox vaxt zəif plan seçir.
  - `Views`: Yalnız yadda saxlanılmış `SELECT` sorğusudur. Əgər üzərində unikal Clustered Index yaradılarsa, fiziki olaraq diskdə saxlanılır (**Indexed / Materialized View**).
  - `Triggers`: `AFTER` və `INSTEAD OF` tranzaksiya hadisələrinə cavab verir. `inserted` və `deleted` virtual cədvəllərindən istifadə edir. Ağır ETL axınlarında arxa planda gizli gecikmələrə səbəb olduğu üçün ehtiyatla işlədilməlidir.

---

### 2.3. Tempdb Strukturları: Temp Tables vs Table Variables vs CTE
- **CTE (`WITH ...`)**: Yaddaşda və ya `tempdb`-də heç bir fiziki cədvəl yaratmır. Sadəcə sorğunu vizual oxunaqlı edir; əsas sorğu ilə birlikdə optimallaşdırılır.
- **Local Temp Table (`#Temp`)**:
  - `tempdb`-də fiziki cədvəl kimi yaranır.
  - Üzərində statistika (Statistics) toplanır və indekslər yaradıla bilər.
  - Böyük həcmli məlumatlar (1000+ sətir) üçün mütləq `#Temp` seçilməlidir, çünki optimizer real sətir sayını bilərək düzgün `Hash Join` və ya `Merge Join` seçir.
- **Table Variable (`@Table`)**:
  - `DECLARE @t TABLE (...)` ilə yaranır.
  - Yalnız yaddaşda qalmır — həcmi artdıqda yenə `tempdb`-yə yazılır!
  - Üzərində statistika yaradılmır; SQL Server (SQL 2019-cu ilə qədər) həmişə onun cəmi **1 sətir** olduğunu fərz edir (**Fixed 1-Row Estimate**). Əgər daxilində 500,000 sətir varsa, optimizer yanlışlıqla `Nested Loops` seçəcək və sorğu saatlarla ilişib qalacaq.
  - İstifadəçi tranzaksiyasının `ROLLBACK` əmri table variable daxilindəki məlumatı geri qaytarmır!

---

### 2.4. İndekslər, İcra Planları və Statistika
- **Clustered Index**: Cədvəlin sətirlərini B-Tree-nin ən aşağı yarpaq (Leaf) səviyyəsində fiziki ardıcıllıqla saxlayır. Cədvəldə yalnız 1 dənə ola bilər. Əgər Clustered Index yoxdursa, cədvəl **Heap** (xaotik yığın) adlanır.
- **Non-Clustered Index**: Açar dəyərini və həmin sətrin fiziki ünvanını (Clustered Index varsa Clustering Key-i, yoxdursa RID - Row ID) saxlayır.
- **Covering Index və `INCLUDE` Klauzulası**:
  - Əgər sorğu indeksdə olmayan sütunları da istəyirsə, SQL Server hər sətir üçün əsas cədvələ gedib əlavə oxuma etməlidir (**Key Lookup**).
  - `CREATE NONCLUSTERED INDEX ... INCLUDE (ColA, ColB)` yazdıqda, həmin sütunlar indeksin aralıq B-Tree səviyyələrinə deyil, yalnız ən aşağı yarpaq səviyyəsinə əlavə olunur. B-Tree şişmir, amma sorğu bütün məlumatı indeksdən tapır və Key Lookup **0-a enir**!
- **Execution Plans (İcra Planları)**:
  - Əsas operatorlar: `Index Seek` (dəqiq tapma - ən yaxşı), `Index Scan` (indeksin hamısını oxuma), `Table Scan` (Heap-in hamısını oxuma), `Key Lookup` (əsas cədvələ əlavə I/O sorğusu).
  - Join növləri: `Nested Loops` (bir tərəf kiçik, digər tərəf indeksli olanda əla), `Hash Match` (böyük indekslənməmiş cədvəllər üçün), `Merge Join` (hər iki tərəf artıq sıralı olanda ən sürətli).
- **Statistika və Parameter Sniffing**:
  - Statistika cədvəldəki məlumatların paylanma histoqramıdır (Histogram - ən çox 200 addım).
  - **Parameter Sniffing**: Stored Procedure ilk dəfə çağırıldıqda ötürülən parametrə görə plan tərtib olunur və keşə atılır. Məsələn: `@Status = 'Cancelled'` cəmi 5 sətir gətirir və `Index Seek + Nested Loops` planı keşlənir. Növbəti dəfə `@Status = 'Active'` ilə çağırılanda (3 milyon sətir) eyni Nested Loops planı işləyir və sistem tamamilə donur!

---

### 2.5. Diaqnostika Alətləri: Query Store, DMV-lər və Wait Stats
- **Query Store**: SQL Server-in "qara qutusudur" (Flight Data Recorder). İcra planlarının tarixçəsini, icra müddətini və resurs sərfiyyatını avtomatik qeyd edir. Plan reqresiyası baş verəndə köhnə yaxşı planı tək kliklə məcbur etmək (`Force Plan`) mümkündür.
- **Ən Vacib DMV-lər (Dynamic Management Views)**:
  - `sys.dm_exec_query_stats`: Ən çox CPU, I/O və vaxt xərcləyən sorğuların statistikası.
  - `sys.dm_db_index_usage_stats`: Hansı indekslərin işlədiyini, hansıların isə heç oxunmadığı halda yalnız `UPDATE/INSERT` zamanı sistemi ləngitdiyini göstərir.
  - `sys.dm_db_missing_index_details`: SQL Server-in özünün təklif etdiyi çatışmayan indekslər.
  - `sys.dm_os_wait_stats`: Sistemin ən çox nəyi gözlədiyini göstərən server səviyyəli statistika:
    - `PAGEIOLATCH_SH`: Məlumat səhifəsi diskdən RAM-a gətirilərkən gözləmə (Disk I/O darboğazı və ya Buffer Pool çatışmazlığı).
    - `CXPACKET` / `CXCONSUMER`: Sorğunun paralel axınları (Parallelism) arasında gözləmə (`MAXDOP` və ya `Cost Threshold for Parallelism` tənzimlənməlidir).
    - `LCK_M_...`: Tranzaksiyaların kilid gözləməsi (Bloklanma).
    - `WRITELOG`: Transaction Log-un (LDF) diskə yazılma gecikməsi.
- **SQL Agent, Linked Servers və SSIS**:
  - `SQL Server Agent`: Dövri ETL tapşırıqlarını (Jobs), backup-ları və monitorinq xəbərdarlıqlarını cədvəl üzrə işlədən xidmət.
  - `Linked Server`: SQL Server-dən başqa serverlərə (məsələn Oracle və ya digər MSSQL) qoşulmaq mexanizmi. Böyük cədvəllərdə uzaq serverdən bütün sətirləri çəkməmək üçün dörd hissəli ad (`Server.DB.Schema.Table`) əvəzinə mütləq `OPENQUERY()` ilə filtrli sorğu göndərilməlidir!
  - `SSIS (SQL Server Integration Services)`: Ənənəvi ETL aləti; `Data Flow Task` (in-memory buffer ilə transformasiya) və `Control Flow Task` (iş axınının ardıcıllığı).

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
> **Diqqət: Parameter Sniffing Fəlakəti və Yanlış Həllər**
> Çox vaxt tərtibatçılar bütün prosedura `WITH RECOMPILE` əlavə edirlər. Bu zaman hər bir çağırışda CPU icra planını yenidən hesablayır və yüksək sorğu yükü altında CPU 100%-ə çatır. **Düzgün yanaşma:** 
> 1) Əgər məlumat həddindən artıq qeyri-bərabər paylanıbsa, yalnız həmin sorğuya `OPTION (RECOMPILE)` vermək.
> 2) Və ya `OPTIMIZE FOR (@Status = 'Active')` / `OPTIMIZE FOR UNKNOWN` istifadə etmək.
> 3) Parametri prosedur daxilində yerli dəyişənə mənimsətmək (`DECLARE @LocalStatus = @Status; WHERE Status = @LocalStatus`).

> [!NOTE]
> **Qeyd: Linked Server üzərində filtrsiz dörd hissəli sorğu göndərmək**
> `SELECT * FROM [RemoteServer].[InsuranceDB].[dbo].[Claims] WHERE ClaimDate >= '2026-01-01'` yazdıqda, SQL Server çox vaxt uzaq serverdəki **bütün cədvəli** şəbəkə ilə yerli serverə çəkir və filtri burada tətbiq edir! Həll: Mütləq `OPENQUERY` istifadə edərək filtri uzaq serverdə icra etmək:
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
