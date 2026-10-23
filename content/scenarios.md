---
id: "scenarios-guide"
title: "Real İstehsalat Ssenariləri (5 Əsas Ssenari)"
subtitle: "Atəşgah Sığorta və Data Mühəndisliyi müsahibələri üçün addım-addım model həllər"
---

# Real İstehsalat Ssenariləri (5 Əsas Ssenari)

> [!NOTE]
> Müsahibədə texniki suallarla yanaşı sənə real istehsalat situasiyaları veriləcək. Hər bir ssenariyə cavab verərkən **tələsmədən**, **məsələni dəqiqləşdirərək**, **mərhələli (diaqnostika → təcili müdaxilə → kök səbəbin aradan qaldırılması → monitorinq)** strukturla yanaşmaq lazımdır.

---

## Ssenari 1: Şirkətdə 400 Sənədləşdirilməmiş Stored Procedure Var — İlk 2 Həftəlik İnventar Planın

### Kontekst
Şirkətin SQL Server bazasında illər ərzində toplanmış, heç bir sənədləşməsi (documentation) olmayan 400 ədəd Stored Procedure mövcuddur. Rəhbərlik bunları PostgreSQL-ə köçürməyi planlaşdırır, lakin hansı prosedurların canlı istifadə olunduğu, hansılarının köhnəldiyi və hansı cədvəllərə toxunduğu bilinmir.

### Məqsəd
İlk 2 həftə ərzində riskləri minimuma endirərək mövcud mühitin tam inventarını və asılılıq xəritəsini çıxarmaq.

### Addım-addım Həll Yolu

#### Həftə 1: Avtomatlaşdırılmış Kəşfiyyat və Fəaliyyət Təhlili
1. **İstifadə tezliyini müəyyən etmək (Aktiv vs Ölü Kod):**
   SQL Server-in dinamik idarəetmə görünüşlərindən (`sys.dm_exec_procedure_stats`) istifadə edərək sonuncu server yenidən başladılmasından bəri hansı prosedurların nə qədər icra edildiyini çıxarıram:
   ```sql
   -- Dialect: T-SQL
   SELECT 
       OBJECT_NAME(object_id, database_id) AS procedure_name,
       execution_count,
       total_worker_time / execution_count AS avg_cpu_time,
       total_elapsed_time / execution_count AS avg_duration,
       last_execution_time
   FROM sys.dm_exec_procedure_stats
   ORDER BY execution_count DESC;
   ```
   *Əgər prosedur son 6 ayda heç bir dəfə də işləməyibsə, o "potensial arxiv" kateqoriyasına salınır.*

2. **Asılılıq Ağacının (Dependency Tree) qurulması:**
   `sys.sql_expression_dependencies` cədvəlindən istifadə edərək hansı prosedurun hansı cədvəlləri oxuduğunu və yazdığını xəritələyirəm:
   ```sql
   -- Dialect: T-SQL
   SELECT 
       OBJECT_NAME(referencing_id) AS procedure_name,
       referenced_entity_name AS target_table_or_view
   FROM sys.sql_expression_dependencies
   WHERE referencing_class = 1;
   ```

#### Həftə 2: Qruplaşdırma, Mürəkkəblik Reytinqi və Təqdimat
1. **Biznes qruplarına ayırmaq:** Prosedurları domenlər üzrə bölmək: `Sales_`, `Claims_`, `Underwriting_`, `Reports_`.
2. **Mürəkkəblik xalı vermək:**
   * Sadə: Tək bir SELECT / INSERT edən kiçik prosedurlar.
   * Orta: Bir neçə JOIN və tranzaksiya idarəsi olanlar.
   * Çətin: Daxilində dinamik SQL (`sp_executesql`), kursorlar, müvəqqəti cədvəllər və kənar Linked Server zəngləri olanlar.
3. **Nəticə:** Komandaya "Excel / Confluence İnventar Cədvəli" təqdim etmək və miqrasiyanı ən sadə və ən az asılılığı olan modullardan başlamağı təklif etmək.

---

## Ssenari 2: 2 TB-lıq Polislər Bazasını Minimal Fasilə (< 1 Saat Downtime) ilə Miqrasiya Etmək

### Kontekst
Atəşgah Sığortanın əsas sığorta polisləri bazası SQL Server-dədir və həcmi 2 TB-dır. Şirkət 24/7 rejimdə işləyir və sistemin 4-5 saatlıq kəsilməsinə biznes icazə vermir. Maksimum icazə verilən fasilə pəncərəsi 1 saatdır.

### Məqsəd
2 TB məlumatı və gündəlik əməliyyatları sıfır itki və 1 saatdan az downtime ilə PostgreSQL-ə köçürmək.

### Addım-addım Həll Yolu

#### 1. Yanaşma Seçimi (Niyə Big-Bang yox, CDC?):
2 TB məlumatın şəbəkə üzərindən birbaşa nüsxələnməsi 6-10 saat çəkər. Buna görə Big-Bang istisna olunur. Yeganə düzgün seçim **CDC (Change Data Capture) əsaslı phased miqrasiyadır**.

#### 2. Arxitektura Addımları:
```text
[SQL Server (2 TB Canlı)] ──(1. Initial Bulk Dump)──► [PostgreSQL Sxem]
       │
       ▼ (2. CDC Aktiv: LSN oxunuşu)
 [Debezium / Kafka Connect] ──(Dəqiqəlik Dəyişikliklər)──► [PostgreSQL Sink]
       │ (Lag = 0 olana qədər paralel işləyir)
       ▼ (3. Cutover Pəncərəsi: 30 dəqiqə)
[Tətbiqlər PostgreSQL-ə yönləndirilir]
```
1. **Hazırlıq:** SQL Server-də CDC aktiv edilir. PostgreSQL tərəfində DDL sxemi və indekslər yaradılır.
2. **Initial Snapshot:** Tarixi keçmiş məlumatlar (məsələn, 2025-ci ilə qədər olan 1.7 TB) paralel batch-lərlə (pgloader və ya xüsusi ETL) PostgreSQL-ə köçürülür.
3. **Canlı CDC Sinxronizasiyası:** Mənbədə baş verən hər bir INSERT/UPDATE/DELETE əməliyyatı Debezium vasitəsilə tutulub PostgreSQL-ə tətbiq edilir.
4. **Validasiya:** Replikasiya paralel davam edərkən təsadüfi seçilmiş 100,000 sətir və maliyyə aqreqatları hər iki bazada tutuşdurulur.
5. **Cutover (Keçid Gecəsi - Cəmi 30 dəqiqə):**
   * SQL Server `READ_ONLY` rejiminə keçirilir.
   * CDC lag-in tam 0 olduğu təsdiqlənir.
   * Son validasiya sorğuları işə salınır.
   * Tətbiqin Connection String-i PostgreSQL-ə dəyişdirilir və sistem açılır.

---

## Ssenari 3: Gecə Yarı İşləyən ETL Əvvəl 10 Dəqiqəyə Bitirdi, İndi 3 Saat Çəkir

### Kontekst
Hər gecə saat 03:00-da işə düşən sığorta hesabatı ETL tapşırığı əvvəllər 10 dəqiqə çəkirdisə, son bir həftədə müddət 3 saata qalxıb və səhər rəhbərlik hesabatı gecikir.

### Məqsəd
Sürət azalmasının kök səbəbini (root cause) tapmaq və əvvəlki performansı bərpa etmək.

### Addım-addım Diaqnostika Planı

```text
Addım 1: Datanın həcmi kəskin artıbmı? (Row count check)
   └── XEYR ──► Addım 2: Verilənlər bazasında Bloklama və ya Resurs Çatışmazlığı varmı?
                   └── BƏLİ ──► Başqa bir gecə işi ilə toqquşma (Locking / Wait stats)
                   └── XEYR ──► Addım 3: İcra Planı dəyişibmi? (Parameter Sniffing / Stale Stats)
```

1. **Həcm və Sətir Sayı Yoxlanışı:**
   İlkin olaraq emal edilən sətir sayına baxıram. Ola bilər ki, hansısa xəta səbəbilə 100 min sətir yerinə 50 milyon sətir daxil olub. Əgər həcm eynidirsə, problem məlumat bazasındadır.

2. **Wait Stats və Bloklamaların (Locks) Analizi:**
   ETL işləyərkən serverdə nəyi gözlədiyinə baxıram (`sys.dm_os_waiting_tasks` və ya Postgres `pg_stat_activity`):
   * `PAGEIOLATCH_SH` → Diskdən oxuma çox ləngdir (İndeks çatışmazlığı və ya Table Scan).
   * `LCK_M_...` → Eyni vaxtda işləyən başqa bir zərərlilik arxivi skripti cədvəli kilidləyib.

3. **İcra Planı və Statistika Köhnəlməsi (Parameter Sniffing):**
   Ən çox rast gəlinən səbəb: Verilənlər bazası statistikasının köhnəlməsi səbəbindən Optimizer-in Index Seek əvəzinə tam Clustered Index Scan seçməsidir.
   * Həll: Cədvəlin statistikasını yeniləmək:
     ```sql
     -- Dialect: T-SQL
     UPDATE STATISTICS dbo.Policies WITH FULLSCAN;
     ```
   * Və ya proseduru yenidən kompilyasiya etmək (`EXEC sp_recompile 'dbo.sp_GenerateDailyReport'`).

---

## Ssenari 4: Polislər Cədvəlində Dublikatlar və Yetim Xarici Açarlar (Orphan FK) Yaranıb

### Kontekst
Mənbə sistemdən daxil olan `stg_policies` cədvəlində eyni sığorta nömrəsinə malik təkrar qeydlər var və bəzi polislərdə mövcud olmayan müştəri ID-si (`customer_id = 999999`) göstərilib. Əsas DWH-a yükləsək hesabat korlanacaq.

### Məqsəd
Təmizləmə borusunda dublikatları aradan qaldırmaq və yetim sətirləri Karantinə ayıraraq bütövlüyü təmin etmək.

### Addım-addım Həll Yolu (SQL / PySpark)

#### 1. Dublikatların aradan qaldırılması (Deduplication):
Ən son yenilənmə tarixinə görə yalnız sonuncu sətri saxlamaq üçün CTE və `ROW_NUMBER()` pəncərə funksiyası tətbiq edirəm:
```sql
-- Dialect: PostgreSQL
WITH ranked_policies AS (
    SELECT 
        policy_id,
        policy_number,
        customer_id,
        premium_amount,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY policy_number 
            ORDER BY updated_at DESC, policy_id DESC
        ) AS rn
    FROM staging.stg_policies
)
SELECT * 
FROM ranked_policies 
WHERE rn = 1; -- Yalnız ən son təkrarsız sətir qalır!
```

#### 2. Yetim Xarici Açarların Karantinə Ayrılması (Quarantine Pattern):
Əgər `customer_id` mövcud müştəri dimensiyasında yoxdursa, onu əsas fakt cədvəlinə buraxmıram:
```sql
-- Dialect: PostgreSQL
-- Təmiz sətirlər:
INSERT INTO core.fact_policy_sales (...)
SELECT p.* 
FROM staging.deduped_policies p
JOIN core.dim_customer c ON p.customer_id = c.customer_id;

-- Karantinə düşənlər:
INSERT INTO quarantine.quarantine_orphan_policies (policy_id, customer_id, reason, created_at)
SELECT p.policy_id, p.customer_id, 'ORPHAN_CUSTOMER_ID', CURRENT_TIMESTAMP
FROM staging.deduped_policies p
LEFT JOIN core.dim_customer c ON p.customer_id = c.customer_id
WHERE c.customer_id IS NULL;
```

---

## Ssenari 5: Sığorta Zərərləri (Claims) üçün Lakehouse Dizaynı

### Kontekst
Atəşgah Sığortada iddialar 3 fərqli mənbədən gəlir:
1. Əsas SQL Server bazası (rəsmi qeydiyyata alınmış polislər və ödənişlər).
2. Kənar Ekspertiza Şirkətinin REST API-si (qəza fotoları və ilkin zərər qiymətləndirməsi).
3. Regional filiallardan həftəlik gələn əl ilə doldurulmuş Excel cədvəlləri.
Rəhbərlik bütün bu mənbələri vahid analitik platformada birləşdirmək istəyir.

### Məqsəd
MinIO (və ya AWS S3) üzərində Medallion Lakehouse platforması dizayn etmək.

### Memarlıq Həlli

```text
 [SQL Server]          [Ekspertiza REST API]         [Excel Siyahıları]
       │                         │                           │
       ▼ (Airflow DB Hook)       ▼ (Python API Extractor)    ▼ (S3 Ingestion Drop)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Bronze Qatı (MinIO / S3)                          │
 │  - raw/sql_server/claims/                                              │
 │  - raw/api_estimates/json/                                             │
 │  - raw/excel_branch_reports/csv/                                       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (PySpark Transformation & Schema Cast)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Silver Qatı (Delta Lake Format)                   │
 │  - Sxem uyğunlaşdırması və tiplərin korreksiyası                       │
 │  - Validasiya: ClaimDate <= CurrentDate AND Amount > 0                 │
 │  - SCD Type 2 ilə ekspertiza statuslarının dəyişmə tarixçəsi           │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼ (Kimball Model & Feature Engineering)
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      Gold Qatı (Curated Datamart)                      │
 │  - fact_claims_mart (Loss Ratio, İddia tezliyi, Filial zərərliliyi)    │
 │  - Direct SQL Engine: Trino / PostgreSQL Sink ──► Power BI Hesabat     │
 └────────────────────────────────────────────────────────────────────────┘
```

1. **Bronze Qatı:** Hər 3 mənbə heç bir dəyişiklik edilmədən öz ilkin formatında MinIO anbarına tarixlərə görə partisiya edilərək yazılır.
2. **Silver Qatı:** PySpark skripti Excel-dəki mətn tiplərini, API-dəki JSON strukturlarını və SQL Server məlumatlarını tək bir sığorta iddiaları sxeminə uyğunlaşdırır.
3. **Gold Qatı:** Anderrayterlər və rəhbərlik üçün əsas sığorta metrikləri:
   $$\text{Loss Ratio} = \frac{\sum \text{Ödənilmiş Zərər (Claims)}}{\sum \text{Toplanmış Mükafat (Premium)}} \times 100\%$$
   hesablanır və Power BI üçün sürətli oxunuşa təqdim olunur.
