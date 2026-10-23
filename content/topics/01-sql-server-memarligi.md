---
id: "01-sql-server-memarligi"
slug: "sql-server-memarligi"
order: 1
title: "Microsoft SQL Server Memarlığı"
category: "Microsoft SQL Server"
priority: "high"
readiness: "oyrenmeliyem"
vacancyLink: "Mövcud Microsoft SQL Server mühitinin təhlili və qiymətləndirilməsi"
tags: ["SQL Server", "Buffer Pool", "Transaction Log", "Recovery Models", "DMV", "T-SQL"]
summary: "SQL Server-in daxili iş prinsipi: Buffer Pool, Transaction Log, səhifə (Page/Extent) strukturu, bərpa modelləri və DMV vasitəsilə mühitin inventarizasiyası."
---

# Microsoft SQL Server Memarlığı

## 1. Qısa izah (Sadə dildə və analogiya ilə)

Microsoft SQL Server-i böyük bir **mərkəzi kitabxana** kimi təsəvvür edin:
- **Disk (MDF/NDF faylları)**: Kitabxananın ucqar zirzəmisindəki arxiv rəfləridir. Bütün kitablar (verilənlər) burada saxlanılır, lakin oradan kitab gətirmək vaxt aparır (I/O gecikməsi).
- **Buffer Pool (RAM)**: Oxu zalındakı iş masalarıdır. Bir məlumat oxunmaq və ya dəyişdirilmək istəndikdə, bütöv bir 8 KB-lıq səhifə (Data Page) diskdən masaya gətirilir. Əgər məlumat artıq masadadırsa (RAM), sorğu dərhal cavablanır (**Buffer Cache Hit**).
- **Transaction Log (LDF faylı)**: Kitabxanaçının dərhal qələmlə yazdığı **qeyd dəftəridir (Write-Ahead Logging - WAL)**. Masada hər hansı bir vərəq dəyişdirilən kimi, əvvəlcə ardıcıl şəkildə dəftərə yazılır: *"Filan istifadəçi saat 10:15-də müqavilə nömrəsini dəyişdi"*. Yalnız dəftərə yazıldıqdan sonra əməliyyat təsdiqlənir (`COMMIT`). Əgər qəfil işıqlar sönsə, diskdəki kitablar köhnə qalsa belə, qeyd dəftəri oxunaraq hər şey bərpa edilir (**Crash Recovery**).

> [!TIP]
> **Müsahibədə belə de:**
> "SQL Server-də məlumat birbaşa diskdəki cədvələ yazılmır. Əvvəlcə Transaction Log-a (LDF) ardıcıl olaraq yazılır (WAL prinsipi) və RAM-dakı (Buffer Pool) səhifə çirklənmiş (dirty page) kimi qeyd olunur. `CHECKPOINT` prosesi dövri olaraq bu çirkli səhifələri diskə (MDF) boşaldır. Bu, həm performansı təmin edir, həm də sistem çökmələrində məlumat itkisinin qarşısını alır."

---

## 2. Əsas anlayışlar

- **Data Page (Səhifə)**: SQL Server-də məlumatın ən kiçik fiziki saxlama vahididir. Ölçüsü dəqiq **8 KB**-dır (8192 bayt). Bir səhifədə ən çox 8060 bayt istifadəçi məlumatı yerləşə bilər.
- **Extent**: 8 ədəd ardıcıl səhifədən ibarət **64 KB**-lıq blokdur. SQL Server diskdə yeri extent-lər şəklində ayırır.
- **Buffer Pool**: SQL Server-in operativ yaddaşının (RAM) ən böyük hissəsidir. Oxunan səhifələr burada keşlənir.
- **Dirty Page**: RAM-da dəyişdirilmiş, lakin hələ diskdəki MDF faylına yazılmamış səhifə.
- **Checkpoint**: Arxa planda işləyən və RAM-dakı bütün dirty page-ləri diskə köçürən mexanizm.
- **Recovery Models (Bərpa modelləri)**:
  - **Full**: Hər bir əməliyyat Transaction Log-da saxlanılır. Point-in-time recovery (məsələn: *"dünən saat 14:32:05 vəziyyətinə qayıt"*) mümkündür. Log ehtiyat nüsxəsi (Log Backup) vaxtaşırı götürülməlidir, əks halda LDF diski doldurar!
  - **Simple**: `CHECKPOINT` keçən kimi tamamlanmış əməliyyatların log-u təmizlənir. Disk sahəsinə qənaət edir, lakin yalnız son tam backup anına qayıtmaq olar.
  - **Bulk-Logged**: Kütləvi yükləmələr (bcp, BULK INSERT) minimal log-lanır.

---

## 3. Kod nümunələri

### Nümunə 1: SQL Server mühitini inventarizasiya etmək (DMV)
Atəşgah Sığorta-da mövcud mühiti təhlil edərkən ən ağır sorğuları və çatışmayan indeksləri tapmaq üçün Dynamic Management Views (DMV) istifadə olunur:

```sql
-- Dialect: T-SQL
-- Ən çox CPU və I/O xərcləyən 5 sorğunun müəyyən edilməsi
SELECT TOP (5)
    qs.total_worker_time / qs.execution_count AS avg_cpu_time_ms,
    qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
    qs.execution_count,
    SUBSTRING(st.text, (qs.statement_start_offset/2) + 1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
ORDER BY avg_cpu_time_ms DESC;
```

### Nümunə 2: Stored Procedure asılılıqlarının təhlili
Miqrasiyadan əvvəl hansı obyektlərin bir-birindən asılı olduğunu görmək üçün:

```sql
-- Dialect: T-SQL
-- Sığorta cədvəlindən asılı olan bütün Stored Procedure və View-lar
SELECT 
    referencing_schema_name = SCHEMA_NAME(o.schema_id),
    referencing_object_name = o.name,
    referencing_type_desc = o.type_desc
FROM sys.sql_expression_dependencies AS d
JOIN sys.objects AS o ON d.referencing_id = o.object_id
WHERE d.referenced_entity_name = 'Policies' -- Sığorta müqavilələri cədvəli
ORDER BY referencing_type_desc, referencing_object_name;
```

---

## 4. Tez-tez edilən səhvlər

> [!WARNING]
> **Diqqət: LDF faylının diski tam doldurması**
> Ən böyük səhv verilənlər bazasını `FULL Recovery Model`-də qoyub, vaxtaşırı `Transaction Log Backup` cədvəlini qurmamaqdır. Tam (Full) backup log faylını kəsmir (truncate etmir). Nəticədə LDF faylı yüzlərlə giqabayt böyüyərək diski doldurur və baza donur (`RESOURCE_SEMAPHORE` və ya `LOG_FULL` xətası).

> [!NOTE]
> **Qeyd: Clustered Index-i unikal olmayan və geniş sütuna vermək**
> Clustered index açarı hər bir Non-Clustered index-in daxilində sətir ünvanı (Row Locator) kimi saxlanılır. Əgər Clustered index kimi uzun bir `NVARCHAR(100)` seçilsə, bütün digər indekslərin həcmi dəfələrlə şişəcək və Buffer Pool-da lazımsız yer tutacaq.

---

## 5. Vakansiya ilə əlaqə (Atəşgah Sığorta)

- **Vakansiya tələbi**: *"Mövcud Microsoft SQL Server mühitinin təhlili və qiymətləndirilməsi: verilənlər bazaları, sxemlər, saxlanılan prosedurlar, asılılıqlar, performans problemləri..."*
- **Sənin rolun**: Sığorta sistemində mövcud yüzlərlə stored procedure və cədvəllərin inventarizasiyasını aparmaq, `sys.sql_expression_dependencies` ilə inteqrasiya xəritəsini çıxarmaq və PostgreSQL-ə keçid zamanı kritik darboğazları (I/O bottlenecks) öncədən müəyyənləşdirmək.

---

## 6. Mini-quiz (Özünü yoxla)

### Sual 1: SQL Server-də bir Data Page-in ölçüsü nə qədərdir və niyə 8 KB-dan böyük bir sətir birbaşa saxlanıla bilmir?
<!-- answer-start -->
**Cavab:** Data Page dəqiq 8 KB (8192 bayt)-dır. Səhifə başlığı (header - 96 bayt) və sətir ofset yuvaları nəzərə alındıqda, tək bir sətir ən çox 8060 bayt ola bilər. Əgər sətirdə `VARCHAR(MAX)` və ya `VARBINARY(MAX)` kimi böyük sütunlar varsa, SQL Server onları xüsusi `LOB_DATA` (Large Object) səhifələrinə çıxarır və əsas səhifədə sadəcə 24 baytlıq göstərici (pointer) saxlayır.
<!-- answer-end -->

### Sual 2: Checkpoint prosesi ilə Lazy Writer arasındakı fərq nədir?
<!-- answer-start -->
**Cavab:** `Checkpoint` müəyyən intervalla və ya bərpa müddəti hədəfinə (Recovery Interval) əsasən işə düşür və yaddaşdakı bütün çirkli səhifələri (dirty pages) diskə yazır. `Lazy Writer` isə yaddaş (RAM) çatışmazlığı yarandıqda dövrəyə girir: az istifadə olunan səhifələri Buffer Pool-dan təmizləyərək yeni sorğular üçün operativ yaddaşda yer boşaldır.
<!-- answer-end -->

### Sual 3: SQL Server-də hansı DMV sorğuların gözləmə səbəbini (Wait Statistics) göstərir?
<!-- answer-start -->
**Cavab:** `sys.dm_os_wait_stats`. Bu DMV vasitəsilə sistemdə ən çox vaxt itirən gözləmə tiplərini (məsələn: `PAGEIOLATCH_SH` — disk oxuma darboğazı, `CXPACKET` — paralellik/CPU tənzimləməsi, `LCK_M_X` — kilidlənmə/bloklanma) təhlil etmək mümkündür.
<!-- answer-end -->
