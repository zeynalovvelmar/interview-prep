---
id: "proj-banking"
slug: "banking-batch"
title: "Banking Batch Pipeline (Medallion & Star Schema)"
subtitle: "PySpark, Airflow və MinIO ilə İdempotent Batch ETL, 5 Məlumat Qüsuru Qapısı və SCD Type 2"
date: "Sentyabr 2026"
role: "Data Mühəndisi (Bootcamp Buraxılış Layihəsi)"
tags: ["PySpark", "Apache Airflow", "MinIO (S3)", "Kimball Star Schema", "SCD Type 2", "Data Quality", "Docker"]
---

# Banking Batch Pipeline (Medallion & Star Schema)

> [!NOTE]
> **Layihənin Xülasəsi:** Bu layihə bank tranzaksiyaları və müştəri profilləri üzərində qurulmuş, sənaye standartlarına uyğun qabaqcıl Batch Data Platformasıdır. Apache Airflow tərəfindən idempotent idarə olunan ETL boru kəməri Bronze/Silver/Gold qatlarından keçir, 5 xüsusi Data Quality qapısı ilə xətalı məlumatları karantinə ayırır və Ralph Kimball metodologiyasına uyğun SCD Type 2 tarixi saxlayan Star Schema qurur.

---

## 1. 60 Saniyəlik Pitch (Qısa Təqdimat)

> "Salam. Mənim üçüncü və ən əhatəli layihəm **PySpark, Apache Airflow və MinIO** istifadə edərək hazırladığım **Banking Batch Pipeline & Kimball Star Schema** layihəsidir. 
> 
> Layihənin məqsədi bank sistemindən daxil olan çirkli tranzaksiya və müştəri məlumatlarını təmizləmək, audit üçün tam tarixçəni qorumaq və rəhbərlik üçün dəqiq analitik məlumat anbarı (DWH) formalaşdırmaq idi. 
> 
> Sistem **Bronze, Silver və Gold** qatları üzrə bölünüb və **Apache Airflow** ilə tam avtomatlaşdırılıb. Boru kəmərində 5 kritik məlumat qüsurunu aşkar edən Data Quality qapıları qurdum: duplikatları təmizlədim, null açarları və etibarsız formatları süzdüm, mövcud olmayan xarici açarları (orphan FK) xüsusi Karantin cədvəlinə yönləndirdim. Məlumat modelində isə müştəri ünvan və profil dəyişikliklərini izləmək üçün **SCD Type 2** tətbiq etdim və fakt cədvəllərini vaxta həssas (time-aware) birləşdirdim. Bütün boru kəməri idempotent qurulduğu üçün istənilən günün hesabatını təkrar işlətsəniz belə, heç bir duplikat yaranmır."

---

## 2. 3 Dəqiqəlik İzah (Addım-addım Axın və Detallar)

Layihə 4 əsas fazadan ibarətdir:

### Faza 1: Xammal İnqestiyası və Bronze Qatı

- Bank filiallarından və əsas bank sistemindən (Core Banking) gündəlik ixrac olunan müştəri profilləri, hesab qalıqları və kart tranzaksiyaları MinIO S3 anbarına `bronze/year=YYYY/month=MM/day=DD/` partisiya strukturu ilə arxivləndi.
- Airflow DAG-ı hər gecə saat 02:00-da işə düşərək yalnız müvafiq icra gününün (`{{ ds }}`) fayllarını hədəfə götürdü.

### Faza 2: Data Quality Qapıları və 5 Qüsurun İdarəsi (Silver Qatı)

Xammal məlumat birbaşa etibarlı sayılmadığı üçün PySpark ilə 5 səviyyəli keyfiyyət filtri tətbiq etdim:

1. **Deduplication (Təkrarsızlıq):** Eyni tranzaksiya identifikatoruna malik təkrarlar çıxarıldı.
2. **Null Handling (Boşluqların İdarəsi):** Məcburi biznes xanaları (müştəri ID, tranzaksiya məbləği) boş olan sətirlər ləğv edildi.
3. **Format & Domain Checks (Domen Yoxlamaları):** Hesab nömrələri və FIN formatları regex ilə yoxlandı, mənfi məbləğlər süzüldü.
4. **Orphan FK Quarantine (Yetim Xarici Açarlar Karantini):** Əgər tranzaksiya qeydindəki müştəri ID-si mövcud müştəri reyestrində tapılmadısa, pipeline sınmadı; bu sətirlər araşdırılmaq üçün `quarantine_transactions` qovluğuna ayrıldı.
5. **Timestamp Normalization:** Müxtəlif filiallardan fərqli saat qurşaqlarında gələn vaxtlar vahid UTC timestamp-ə çevrildi.

Təmizlənmiş məlumatlar Silver qatında Parquet formatında saxlanıldı.

### Faza 3: Kimball Star Schema və SCD Type 2 (Gold Qatı)

- Analitik anbar üçün Ralph Kimball-ın DWH metodologiyası əsasında model qurdum:
  - **Dimensiyalar:** `dim_customer`, `dim_account`, `dim_branch`, `dim_date`.
  - **Fakt Cədvəli:** `fact_banking_transactions` (Grain: hər bir fərdi maliyyə tranzaksiyası).
- Müştəri dimensiyasında **SCD Type 2** tətbiq etdim: müştəri filialını və ya statusunu dəyişdikdə köhnə sətrin `end_date`-i qapadıldı (`is_current = false`) və yeni Surrogate Key ilə cari sətir əlavə edildi.
- Fakt cədvəlini dimensiya ilə birləşdirərkən tranzaksiya vaxtında qüvvədə olan dəqiq müştəri versiyasını tapmaq üçün vaxta həssas (`transaction_timestamp BETWEEN effective_date AND end_date`) JOIN tətbiq etdim.

### Faza 4: Airflow Orkestrasiyası və İdempotentlik

- Bütün axın Apache Airflow DAG-ı daxilində tapşırıqlar zəncirinə bağlandı: `wait_for_files >> ingest_bronze >> dq_silver >> build_scd2_gold >> run_audit`.
- İdempotentliyi təmin etmək üçün hər bir task hədəf partisiya üzrə əvvəlcə həmin günün məlumatlarını təmizləyib (`overwrite partition`) sonra yazırdı. Nəticədə DAG-ı ardıcıl 5 dəfə təkrar işlətsək belə, yekun rəqəmlər tam sabit qalırdı.

---

## 3. Arxitektura Diaqramı

```text
 ┌────────────────────────────────────────────────────────┐
 │           Core Banking & Branch Source Feeds           │
 │       (Müştəri Profilləri, Hesablar, Tranzaksiyalar)   │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼ (Airflow Orchestrated Ingestion)
 ┌────────────────────────────────────────────────────────┐
 │               MinIO (S3-Compatible Storage)             │
 │                                                         │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Bronze: Raw Dumps (Partitioned by Date)           │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │                            ▼ (PySpark Data Quality)     │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ 5 Data Quality Gates:                             │  │
 │  │  - Deduplication         - Domain Validation      │  │
 │  │  - Null Handling         - UTC Standardization    │  │
 │  └─────────────┬─────────────────────────┬───────────┘  │
 │                │                         │              │
 │                ▼ (Valid Data)            ▼ (Orphans)    │
 │  ┌─────────────────────────┐   ┌─────────────────────┐  │
 │  │ Silver: Cleaned Parquet │   │ Quarantine / DLQ    │  │
 │  └─────────────┬───────────┘   └─────────────────────┘  │
 │                │                                        │
 │                ▼ (Kimball Modeling & SCD Type 2)        │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Gold: Star Schema (Kimball DWH)                   │  │
 │  │  - dim_customer (SCD Type 2: effective, end_date) │  │
 │  │  - dim_account, dim_branch, dim_date              │  │
 │  │  - fact_banking_transactions (Time-aware Join)    │  │
 │  └───────────────────────────────────────────────────┘  │
 └────────────────────────────────────────────────────────┘
```

---

## 4. "Niyə bunu seçdim?" (Əsas Memarlıq Qərarları)

| Qərar | Alternativ | Niyə məhz bunu seçdim? (Əsaslandırma) |
| :--- | :--- | :--- |
| **SCD Type 2** | SCD Type 1 (Köhnənin üstünə yazmaq) | Bank və sığortada audit tələbləri sərtdir. Əgər müştəri keçən il Gəncədə yaşayarkən əməliyyat edibsə, bu gün Bakıya köçməsi onun keçmiş filial hesabatını dəyişməməlidir. Type 2 tam tarixi saxlayır. |
| **Karantin Qapısı (Quarantine Pattern)** | Bütün pipeline-ı dayandırmaq (Fail-Fast) | 1 milyon tranzaksiyadan cəmi 5 dənəsində yetim xarici açar (orphan FK) var deyə bütün səhər rəhbərlik hesabatını dayandırmaq biznes üçün böyük itkidir. Düzgünlər davam edir, xətalılar karantində araşdırılır. |
| **Kimball Star Schema** | 3NF Normallaşdırılmış relyasion sxem | Star Schema analitik sorğularda JOIN sayını kəskin azaldır, BI alətləri (Power BI, Tableau) üçün intuitivdir və aqreqasiya sürətini qat-qat artırır. |
| **Idempotent Partition Overwrite** | Append Mode | Append rejimində gecə xəta baş verib task retry edildikdə bütün məlumatlar ikinci dəfə yazılır və balanslar 2 qat artır. `overwrite` rejimi eyni günün məlumatını təhlükəsiz yeniləyir. |

---

## 5. Müsahibə Sualları və Cavablar (15 Dərin Sual)

### S1: Batch pipeline-da tam idempotentliyi necə təmin etdin?
> **Model Cavab:** İdempotentliyi təmin etmək üçün iki qızıl qayda tətbiq etdim: birincisi, heç bir taskda 'cari sistem saatından' (`datetime.now()`) asılı olmadım; bütün hesablama və filtrlər yalnız Airflow-un verdiyi məntiqi `{{ ds }}` icra tarixi ilə aparıldı. İkincisi, fayl və ya verilənlər bazasına yazarkən kor-koranə 'append' etmədim. MinIO-da həmin günün qovluğu üzərinə `mode("overwrite")` ilə yazdım; verilənlər bazasında isə əvvəlcə həmin günün mövcud qeydlərini təmizləyib sonra daxil etdim (`DELETE WHERE date = :run_date`). Beləliklə, eyni gün üçün boru kəmərini 10 dəfə də işə salsaq, nəticə həmişə eyni qalır.

### S2: SCD Type 2 tətbiq edərkən PySpark-da köhnə və yeni sətirləri necə birləşdirdin (Merge məntiqi)?
> **Model Cavab:** Mövcud müştəri dimensiyası ilə yeni gələn günlük müştəri axınını Natural Key (`customer_id`) üzrə FULL OUTER JOIN etdim. Dəyişikliyi təyin etmək üçün müştəri atributlarının (ünvan, telefon, risk qrupu) heş dəyərini (`sha2`) müqayisə etdim. Əgər heş dəyişibsə: köhnə sətrin `end_date`-ini cari tarixə bərabərləşdirib `is_current = false` etdim, eyni zamanda yeni atributlarla yeni bir sətir formalaşdırıb `effective_date = run_date`, `end_date = 9999-12-31`, `is_current = true` və yeni Surrogate Key ilə cədvələ əlavə etdim. Dəyişməyən sətirlərə isə toxunmadım.

### S3: Vaxta həssas birləşmə (Time-Aware Join) nədir və niyə vacibdir?
> **Model Cavab:** Fakt cədvəlini SCD Type 2 dimensiyası ilə birləşdirərkən ən böyük səhv sadəcə `WHERE is_current = true` yazmaqdır; çünki bu zaman keçmişdə baş vermiş hadisə müştərinin indiki cari ünvanına bağlanır və tarixi audit pozulur. Time-Aware Join zamanı faktın tranzaksiya tarixi dimensiyanın etibarlılıq intervalı ilə tutuşdurulur: `ON f.customer_id = d.customer_id AND f.transaction_date >= d.effective_date AND (f.transaction_date < d.end_date OR d.end_date IS NULL)`. Nəticədə fakt cədvəlinə həmin tranzaksiyanın baş verdiyi andakı dəqiq Surrogate Key yazılır.

### S4: Karantin (Quarantine) qapısında hansı qüsurları ayırdın və proses necə davam etdi?
> **Model Cavab:** Ən təhlükəli qüsur yetim xarici açarlar (orphan FK) idi — yəni tranzaksiya faylında elə bir `customer_id` gəlirdi ki, müştəri reyestrində ümumiyyətlə yox idi. Əgər bu sətirləri fakt cədvəlinə yazsaydıq, referensial bütövlük pozulacaq və INNER JOIN zamanı pullar hesabatdan itəcəkdi. Mən bu sətirləri `quarantine_transactions` qovluğuna ayırdım və yanına `reason = 'ORPHAN_CUSTOMER_ID'` qeydini qoydum. Qalan 99.9% təmiz tranzaksiyalar isə normal şəkildə Gold qatına keçdi. Bu, biznesin vaxtında hesabat almasını təmin etdi.

### S5: Layihəndə Surrogate Key-ləri paylanmış PySpark mühitində necə yaratdın?
> **Model Cavab:** Relyasion bazalarda avtomatik artan IDENTITY(1,1) açarları rahat olsa da, paylanmış PySpark klasterində `monotonically_increasing_id()` tək-tək ardıcıl ədədlər vermir, partisiyalar arası böyük boşluqlar yaradır. Mən ardıcıl və sabit Surrogate Key üçün ya `row_number().over(Window.orderBy('customer_id', 'effective_date'))` pəncərə funksiyasından istifadə etdim, ya da təbii açar və tarixin birləşməsindən deterministik HASH (`sha2(concat(customer_id, effective_date), 256)`) açarı generasiya etdim.

### S6: Ralph Kimball-a görə Conformed Dimension nədir və sən hansı conformed dimensiyaları qurdun?
> **Model Cavab:** Conformed Dimension — şirkət daxilində birdən çox fakt cədvəli tərəfindən eyni məna və vahid atributlarla paylaşılan ortaq dimensiyadır. Mənim modelimdə `dim_date` və `dim_customer` conformed dimensiyalar idi. Bu o deməkdir ki, həm gündəlik kart əməliyyatları faktı (`fact_banking_transactions`), həm də ay sonu hesab qalıqları faktı (`fact_monthly_balances`) eyni vahid müştəri və tarix cədvəlinə bağlanırdı; beləliklə, müştərinin həm əməliyyatlarını, həm də balansını tək bir hesabatda kəsişdirmək mümkün oldu.

### S7: Airflow-da Backfill və Catchup parametrlərini necə idarə etmisən?
> **Model Cavab:** Layihəni ilk dəfə deploy edərkən `catchup=False` təyin etdim ki, DAG işə düşən kimi keçmiş ayların hamısı üçün eyni anda yüzlərlə task başladıb sistemi çökdürməsin. Əgər keçmiş 10 günün məlumatını ardıcıl bərpa etmək lazım gəlirdisə, bunu idarəolunan şəkildə Airflow CLI vasitəsilə `airflow dags backfill -s 2026-09-01 -e 2026-09-10 dag_id` əmri ilə icra etdim.

### S8: Bu layihə təcrübəni Atəşgah Sığortanın sisteminə necə proyeksiya edərdin?
> **Model Cavab:** Sığortada bu yanaşma birəbir tətbiq oluna bilər. Məsələn, sığortalı şəxslərin risk qrupunun, yaşayış yerinin və ya avtomobilinin dəyişməsi mütləq `dim_insured_client` daxilində SCD Type 2 ilə qorunmalıdır ki, keçmiş qəza hadisələri köhnə risk sinfi ilə hesablansın. İkincisi, zərər iddiaları (claims) daxil olarkən əgər zərər qeydindəki polis nömrəsi bazada tapılmırsa, onu karantinə atıb anderraytinq və təhqiqat komandasına bildiriş göndərən qapı qurmaq olar.

### S9: Əgər gündəlik daxil olan tranzaksiya həcmi 50 milyon sətrə çatsaydı, nələri optimallaşdırardın?
> **Model Cavab:** Birincisi, MinIO üzərində Parquet fayllarını `year/month/day` partisiya strukturu ilə yanaşı, `transaction_type` üzrə də daxili partisiya edərdim. İkincisi, PySpark-da `spark.sql.shuffle.partitions` sayını default 200-dən 800-ə qaldırardım ki, hər partisiya təxminən 128MB olsun və yaddaş dolmasın. Üçüncüsü, kiçik ölçülü `dim_branch` və `dim_account` cədvəllərini faktla birləşdirərkən şəbəkə mübadiləsini (shuffle) sıfırlamaq üçün `broadcast()` join istifadə edərdim.

### S10: Airflow DAG-ında tapşırıqların xəta cəhdləri (Retries) və SLA necə qurulmuşdu?
> **Model Cavab:** Şəbəkənin qopması və ya S3 anbarının müvəqqəti cavab verməməsi riskinə qarşı `default_args` daxilində `retries: 3` və `retry_delay: timedelta(minutes=5)` təyin etdim. Həmçinin hər bir tapşırığın maksimum 30 dəqiqə ərzində bitməsi üçün `sla=timedelta(minutes=30)` qoydum; əgər vaxt aşılarsa, `sla_miss_callback` funksiyası vasitəsilə loqlara xəbərdarlıq yazılır və komandaya bildiriş ötürülür.

### S11: Parquet formatının bu layihədə CSV-yə nisbətən faydası nə oldu?
> **Model Cavab:** İki nəhəng faydası oldu: birincisi, sıxılma (Snappy kompressiyası) sayəsində 10GB-lıq xammal CSV MinIO-da təxminən 1.8GB yer tutdu, diskə və şəbəkəyə 80% qənaət olundu. İkincisi, Parquet sütunlu (columnar) format olduğu üçün sonrakı Gold hesabatlarında sorğu atarkən yalnız tələb olunan 3 sütun (`amount`, `customer_key`, `date_key`) oxundu, yerdə qalan 20 lazımsız sütun diskdən oxunmadı (Projection Pruning), bu da oxuma sürətini 5-10 dəfə artırdı.

### S12: Layihə zamanı qarşılaşdığın ən maraqlı məntiqi xəta nə idi?
> **Model Cavab:** Ən maraqlı xəta SCD Type 2 tətbiq edərkən baş verdi: bəzi müştərilərin atributları dəyişmədiyi halda, hər gün onlar üçün yeni SCD2 sətri yaranırdı və cədvəl şişirdi. Səbəbi araşdırdıqda məlum oldu ki, mənbədən gələn telefon nömrələrində bəzən boşluq (trailing space) olurdu və PySpark hər iki string-i fərqli heşləyirdi. Həll olaraq heş hesablamazdan əvvəl bütün string sütunlara `trim()` və `lower()` funksiyaları ilə standartlaşdırma tətbiq etdim, bundan sonra duplikasiya tam dayandı.

### S13: Factless Fact Table bu modeldə lazım oldumu?
> **Model Cavab:** Əsas modeldə maliyyə məbləğləri olan klassik fakt cədvəli qurdum. Lakin əlavə olaraq müştərilərin internet bankçılığa və mobil tətbiqə daxil olma hadisələrini izləmək üçün `fact_customer_login_events` adlı Factless Fact cədvəli dizayn etdim; orada heç bir məbləğ yoxdur, sadəcə `customer_key`, `date_key`, `device_key` və `channel_key` saxlanılır. Bu, biznesə hansı müştərilərin aktiv olduğunu təhlil etmək imkanı verir.

### S14: Karantinə düşən məlumatların sonrakı taleyi necə həll olunurdu?
> **Model Cavab:** Karantin qovluğu sadəcə zibilxana deyil, audit və bərpa zonası idi. Hər bir karantin qeydinin yanında xətanın səbəbi və daxilolma vaxtı yazılırdı. Həftəlik olaraq Data Steward və ya biznes analitiklər bu siyahını nəzərdən keçirir, mənbə sistemdə qeydiyyatı gecikmiş müştərilər reyestrə əlavə olunduqdan sonra xüsusi 'Re-drive' Airflow skripti ilə həmin karantin tranzaksiyaları yenidən emal borusuna qaytarılırdı.

### S15: Bu layihədə öyrəndiyin ən vacib mühəndislik dərsi nə oldu?
> **Model Cavab:** Ən vacib dərs odur ki, Data Engineering təkcə SQL sorğusu yazmaq və ya PySpark kodu işə salmaq deyil; ən vacib məsələ **sistemin dayanıqlığı (resilience)** və **təkrarlana bilən etibarlılığıdır (idempotency)**. Xammal məlumat heç vaxt ideal olmur, şəbəkə həmişə qopa bilər. Əsas məharət qüsurlu məlumat gələndə belə çökməyən, özünü qoruyan və istənilən vaxt təhlükəsiz bərpa olunan arxitektura dizayn etməkdir.

---

## 6. Yadda Saxlanacaq Rəqəmlər Qutusu (Metrikalar)

> [!TIP]
> **Müsahibə üçün qısa metrikalar (Sahib tərəfindən redaktə edilə bilər):**
> * **Məlumat Qatları:** 3 qat (Bronze -> Silver -> Gold Star Schema)
> * **Məlumat Qüsur Qapıları:** 5 qapı (Deduplication, Null, Format, Orphan FK, Timestamp)
> * **Orphan FK Faiz Həddi:** < 0.1% (Karantinə yönləndirilən)
> * **Model Növü:** Kimball Star Schema (1 Fakt, 4 Dimensiya)
> * **Tarix İdarəetməsi:** SCD Type 2 (`effective_date`, `end_date`, `is_current`)
> * **Orkestrasiya Tezliyi:** Gündəlik `@daily` (Gecə saat 02:00 UTC)
> * **İdempotentlik Mexanizmi:** Partition overwrite + Jinja `{{ ds }}` parametrizasiyası
> * **Saxlama Formatı:** MinIO üzərində Snappy ilə sıxılmış Parquet
