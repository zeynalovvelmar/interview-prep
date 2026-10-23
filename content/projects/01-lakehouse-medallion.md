---
id: "proj-lakehouse"
slug: "lakehouse-medallion"
title: "End-to-End Data Lakehouse (Medallion)"
subtitle: "PySpark, MinIO (S3-compatible) və Delta Lake ilə 3 Qatlı Analitik Göl Platforması"
date: "Fevral 2026"
role: "Data Mühəndisi (Bootcamp Layihəsi)"
tags: ["PySpark", "MinIO (S3)", "Delta Lake", "PostgreSQL", "Docker", "Git"]
---

# End-to-End Data Lakehouse (Medallion)

> [!NOTE]
> **Layihənin Xülasəsi:** Bu layihə müasir Lakehouse arxitekturasını praktiki mənimsəmək üçün qurduğum analitik məlumat platformasıdır. Obyekt anbarı olaraq S3-uyğun MinIO istifadə olunub, məlumat qatları (Bronze, Silver, Gold) PySpark və Delta Lake ilə idarə edilib, yekun analitik cədvəllər isə Spark JDBC vasitəsilə PostgreSQL-ə çıxarılıb.

---

## 1. 60 Saniyəlik Pitch (Qısa Təqdimat)

> "Salam. Mənim ilk böyük layihəm **PySpark, MinIO və Delta Lake** üzərində qurduğum **End-to-End Medallion Lakehouse** platformasıdır. 
> 
> Layihənin məqsədi xammal JSON və CSV formatındakı xaotik tranzaksiya məlumatlarını ucuz obyekt anbarında qəbul edib, mərhələli şəkildə biznes analitikasına hazır vəziyyətə gətirmək idi. 
> 
> Arxitekturanı 3 qatda təşkil etdim: **Bronze** qatında məlumatları dəyişdirilməz xammal kimi arxivlədim; **Silver** qatında PySpark ilə duplikatları sildim, sxem tiplərini standartlaşdırdım və biznes qaydalarını tətbiq etdim; **Gold** qatında isə Delta Lake cədvəlləri üzərində aqreqasiya olunmuş datamart qurdum. Məlumatların düzgünlüyünü təmin etdikdən sonra Spark JDBC ilə PostgreSQL relyasion bazasına köçürdüm. 
> 
> Bu layihə mənə həm paylanmış fayl sistemlərində ACID tranzaksiyaların necə işlədiyini, həm də real bulud mühitinə (AWS S3) tam uyğunlaşan S3A API prinsiplərini praktiki öyrətdi."

---

## 2. 3 Dəqiqəlik İzah (Addım-addım Axın və Detallar)

Bu layihəni 4 əsas mərhələdə həyata keçirmişəm:

### Mərhələ 1: İnfrastruktur və Obyekt Anbarı (MinIO S3)
* Bulud xərcləri yaratmamaq və lokal mühitdə rahat işləmək üçün **Docker Compose** üzərində S3-uyğun **MinIO** serveri qaldırdım.
* `insurance-lakehouse` adlı bucket yaratdım və daxilində `bronze/`, `silver/`, `gold/` prefiksləri ilə qovluq strukturu formalaşdırdım.
* PySpark-ın MinIO ilə əlaqəsi üçün `hadoop-aws` və `aws-java-sdk-bundle` kitabxanalarını konfiqurasiya etdim, `fs.s3a.endpoint`, `fs.s3a.path.style.access=true` və S3 credentials parametrlərini sazladım.

### Mərhələ 2: Xammal Qəbulu (Bronze Qatı)
* Mənbədən gələn gündəlik tranzaksiya və müştəri qeydləri (JSON və CSV) heç bir filtrləmə və ya dəyişiklik edilmədən append-only rejimində `s3a://insurance-lakehouse/bronze/` ünvanına yazıldı.
* Bu qatın əsas məqsədi "Single Source of Truth" (vahid həqiqət mənbəyi) rolunu oynamaq və gələcəkdə hər hansı hesablama məntiqi dəyişərsə, məlumatları ilkin vəziyyətdən təkrar emal etməyə (reprocessing) imkan yaratmaq idi.

### Mərhələ 3: Təmizləmə və Zənginləşdirmə (Silver Qatı)
* PySpark ilə Bronze qatından oxunan məlumatlar üzərində təmizləmə əməliyyatları apardım:
  * Null və boş açarlar (`policy_id IS NOT NULL`) filtrləndi.
  * Təkrarlanan sətirlər `dropDuplicates(['policy_id', 'transaction_date'])` ilə təmizləndi.
  * Mətn formatındakı tarixlər `to_timestamp()` ilə, məbləğlər isə `DecimalType(12, 2)` ilə dəqiq tiplərə çevrildi.
* Nəticə **Delta Lake** formatında `s3a://insurance-lakehouse/silver/` qovluğuna yazıldı. Delta Lake-in tranzaksiya loqu (`_delta_log`) sayəsində yazma zamanı nasazlıq olarsa yarımçıq faylların qalmasının qarşısı alındı.

### Mərhələ 4: Aqreqasiya və Relyasion Çıxarış (Gold Qatı & PostgreSQL)
* Silver qatındakı təmiz cədvəllər əsasında filiallar və məhsul növləri üzrə gündəlik KPI göstəriciləri (ümumi mükafat məbləği, polislərin sayı) hesablandı.
* Gold cədvəli Delta Lake-də partisiya üzrə saxlanıldı (`partitionBy('year', 'month')`).
* BI analitiklərinin və rəhbərliyin SQL ilə asan oxuması üçün PySpark-ın `write.format('jdbc')` imkanından istifadə edərək son datamart PostgreSQL relyasion bazasında yaradılmış `mart_policy_kpi` cədvəlinə yazıldı.

---

## 3. Arxitektura Diaqramı

```text
  [Mənbə Məlumatları]
  JSON / CSV Faylları (Satış, Polislər, Müştərilər)
          │
          ▼
 ┌─────────────────────────────────────────────────────────┐
 │               MinIO (S3-Compatible Storage)             │
 │                                                         │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Bronze Qatı (Raw Append-Only: JSON / CSV)         │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │                            ▼ (PySpark Cleaning & Cast)  │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Silver Qatı (Cleaned & Typed: Delta Lake Format)   │  │
 │  │  - Schema Enforcement, Deduplication, _delta_log   │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 │                            │                            │
 │                            ▼ (PySpark Aggregations)     │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Gold Qatı (Curated Datamarts: Delta Lake Format)  │  │
 │  │  - KPI Mart, Daily Aggregates, Z-Order Optimize   │  │
 │  └─────────────────────────┬─────────────────────────┘  │
 └────────────────────────────┼────────────────────────────┘
                              │
                              ▼ (Spark JDBC Batch Sink)
               ┌──────────────────────────────┐
               │    PostgreSQL DWH / Mart     │
               │   core.mart_policy_kpi       │
               │   (Power BI / SQL Hesabat)   │
               └──────────────────────────────┘
```

---

## 4. "Niyə bunu seçdim?" (Əsas Memarlıq Qərarları)

| Qərar | Alternativ | Niyə məhz bunu seçdim? (Əsaslandırma) |
| :--- | :--- | :--- |
| **MinIO (S3-compatible)** | Lokal disk və ya Real AWS S3 | AWS xərcləri çıxarmadan lokal Docker konteynerində real S3 API və S3A protokolu ilə işləmək təcrübəsi qazanmaq. Kod heç bir dəyişiklik edilmədən real AWS S3-ə köçürülə bilər. |
| **Delta Lake** | Sadə Parquet və ya CSV | Sadə Parquet-də ACID tranzaksiyalar yoxdur; yazma yarımçıq kəsilərsə zibil fayllar qalır. Delta Lake `_delta_log` ilə tranzaksiyanı tam edir, Schema Enforcement və Time Travel verir. |
| **PySpark** | Pandas | Məlumat həcmi böyüdükdə və paylanmış klaster mühitinə keçildikdə tək nüvəli Pandas yaddaş çatışmazlığı (OOM) verir. PySpark paylanmış emal və Spark SQL optimizasiyası (Catalyst) təmin edir. |
| **PostgreSQL JDBC Sink** | Delta üzərindən birbaşa oxumaq | Hələ bütün biznes analitikləri və köhnə BI alətləri birbaşa Delta Lake oxumağı dəstəkləmir. Standart PostgreSQL relasiyalı bazası analitiklərə tanış SQL mühiti təqdim edir. |

---

## 5. Müsahibə Sualları və Cavablar (14 Dərin Sual)

### S1: MinIO-da işləmisən. Bunu real AWS S3-ə köçürmək lazım gəlsə, kodda nələri dəyişərsən?
> **Model Cavab:** Kodun daxilindəki əsas transformasiyaları və PySpark məntiqini dəyişməyə heç bir ehtiyac qalmır. Yalnız SparkSession konfiqurasiyasındakı `spark.hadoop.fs.s3a.endpoint` parametrindən lokal MinIO ünvanını (`http://localhost:9000`) çıxarıram və AWS standart regional ünvanına yönləndirirəm. İkinci dəyişiklik autentifikasiyadır: lokal credential-lar yerinə istehsalat mühitində EC2 / EKS üçün IAM Role (`InstanceProfileCredentialsProvider`) təyin edirəm. `s3a://` prefixi və bütün oxuma-yazma əmrləri olduğu kimi işləyir.

### S2: Delta Lake-i niyə seçdin? Əgər sabah şirkət Apache Iceberg-ə keçmək istəsə nə dəyişər?
> **Model Cavab:** Delta Lake-i seçməyimin səbəbi PySpark ilə yerli (native) inteqrasiyasının ən yetkin olması və quraşdırılmasının sadəliyidir. Konseptual olaraq Iceberg də eyni problemi həll edir: Parquet üzərində ACID, snapshot izolyasiyası və Time Travel. Fərq odur ki, Delta Lake cədvəl qovluğundakı `_delta_log` fayllarına əsaslanır, Iceberg isə mərkəzi Kataloq (məsələn, AWS Glue və ya Nessie) və Avro manifest ağacı ilə işləyir. Əgər Iceberg-ə keçilsəydi, oxuma-yazma zamanı `.format("iceberg")` istifadə edərdim və arxada bir Kataloq konfiqurasiyası qurardım.

### S3: Bronze-dan Silver-ə keçərkən hansı konkret təmizləmələr apardın?
> **Model Cavab:** Üç əsas təmizləmə addımı icra etdim. Birincisi, struktur bütövlüyü: məcburi biznes açarlarının (`policy_number`, `customer_id`) NULL olduğu sətirləri süzdüm. İkincisi, təkrarlanmaların ləğvi: eyni tranzaksiya ID-sinə malik təkrarları `dropDuplicates()` ilə aradan qaldırdım. Üçüncüsü, tiplərin dəqiqləşdirilməsi: JSON-dan string kimi gələn tarixləri ISO timestamp formatına saldım və sığorta məbləğlərini float əvəzinə `DecimalType(12, 2)` tipinə çevirdim ki, yuvarlaqlaşdırma xətası olmasın.

### S4: PySpark JDBC ilə PostgreSQL-ə yazarkən hansı performans problemini gördün və necə optimallaşdırdın?
> **Model Cavab:** İlkin cəhddə tək bir bağlantı ilə yazdıqda proses çox ləng gedirdi və hər sətrə ayrıca INSERT olunurdu. Mən iki əsas konfiqurasiya tətbiq etdim: birincisi, `batchsize` parametrini 10,000 təyin etdim ki, verilənlər bazasına toplu şəkildə (bulk insert) göndərilsin. İkincisi, DataFrame-i yazmazdan əvvəl `repartition(4)` edərək PostgreSQL-in eyni vaxtda 4 paralel bağlantı ilə məlumatı qəbul etməsini təmin etdim. Bu, yazma müddətini dəfələrlə qısaltdı.

### S5: Layihədə Time Travel funksiyasını praktiki necə yoxlamısan?
> **Model Cavab:** Delta Lake-in versiyalama qabiliyyətini yoxlamaq üçün bilərəkdən Silver cədvəlində səhv bir yeniləmə (UPDATE) əməliyyatı icra etdim və ya test məqsədilə bəzi sətirləri sildim. Daha sonra PySpark-da `.option("versionAsOf", 0)` parametrini verərək ilkin versiyanı oxudum və sistemin həqiqətən əvvəlki dəqiq vəziyyətə qayıtdığını təsdiq etdim. Bu mexanizm istehsalatda xətalı ETL skriptləri işlədikdə fövqəladə bərpa üçün çox güclü vasitədir.

### S6: Mənbədən gələn JSON faylında yeni bir sütun peyda olsa, pipeline necə reaksiya verərdi?
> **Model Cavab:** Delta Lake susmaya görə ciddi Sxem Tələbi (Schema Enforcement) tətbiq edir, yəni sxemdə olmayan yeni sütun gəldikdə cədvəlin korlanmaması üçün yazma əməliyyatı xəta ilə dayanır. Əgər bu yeni sütun biznes tərəfindən təsdiqlənmiş qanuni dəyişiklikdirsə, yazma skriptinə `.option("mergeSchema", "true")` əlavə edərək Sxem İnkişafını (Schema Evolution) aktiv etdim. Bu zaman köhnə sətirlərə toxunulmadan yeni sütun cədvələ əlavə olunur və köhnə qeydlərdə həmin xana NULL kimi saxlanılır.

### S7: MinIO-da çoxlu kiçik fayllar (small files problem) yaranardısa nə edərdin?
> **Model Cavab:** Tez-tez append edilən işlərdə çoxlu kilobaytlıq fayllar yaranır və bu, obyekt anbarında metadata oxuma sürətini kəskin azaldır. Delta Lake-də bu problemi həll etmək üçün vaxtaşırı `OPTIMIZE table_name` əmrini icra etdim. Bu əmr xırda Parquet fayllarını birləşdirərək 128MB və ya 1GB-lıq optimal fayllara sıxır (Compaction). Eyni zamanda tez-tez filtr olunan sütunlar üçün `ZORDER BY (customer_id)` tətbiq edərək Data Skipping effektivliyini artırdım.

### S8: Bu arxitekturanı Atəşgah Sığortanın real polislər və iddialar (claims) datasına necə tətbiq edərdin?
> **Model Cavab:** Atəşgahın əsas SQL Server bazasından polislər və claims cədvəllərinin snapshot-larını Bronze qatına yığardım. Silver qatında sığorta biznes qaydalarını tətbiq edərdim: məsələn, zərərin baş vermə tarixi polisin qüvvədə olduğu tarixlər arasına düşməlidir (`claim_date BETWEEN start_date AND end_date`) və sığorta haqqı müsbət olmalıdır. Gold qatında isə anderrayterlər və rəhbərlik üçün əsas sığorta metriki olan Zərərlilik Nisbətini (Loss Ratio = Ödənilən İddialar / Toplanan Mükafatlar) hesablayan analitik datamart formalaşdırardım.

### S9: Obyekt anbarında məlumatların təhlükəsizliyi və ehtiyat nüsxəsi (Backup) necə düşünülmüşdü?
> **Model Cavab:** MinIO üzərində Bucket Policy və istifadəçi giriş hüquqlarını (Access Key və Secret Key) təcrid etdim; Bronze qatına yalnız ETL servisinin yazmaq icazəsi var idi, analitiklərə isə yalnız Gold qatına oxuma hüququ verilirdi. Ehtiyat nüsxə üçün isə Bronze qatı append-only rejimində saxlandığından ilkin xammal həmişə toxunulmaz qalırdı. Delta Lake-in VACUUM komandasını işə salarkən 7 günlük saxlama müddəti (retention period) qoydum ki, köhnə snapshot-lar təhlükəsizlik üçün dərhal silinməsin.

### S10: Əgər məlumat həcmi 100 qat artsaydı, ilk darboğaz harada yaranardı?
> **Model Cavab:** İlk darboğaz iki yerdə yaranardı: birincisi, tək qovşaqlı (single-node) MinIO və Docker mühitinin disk və şəbəkə I/O keçiriciliyi tükənərdi; bunu aradan qaldırmaq üçün paylanmış AWS S3-ə keçilməlidir. İkincisi, yekun PostgreSQL bazası 100 qat böyük analitik sorğuların altında ləngiyərdi; buna görə də Gold qatındakı analitikanı birbaşa Lakehouse üzərindən işləyən sorğu mühərrikinə (Trino və ya ClickHouse/Snowflake) yönləndirmək lazım gələrdi.

### S11: Layihəni qurarkən qarşılaşdığın ən çətin texniki xəta nə oldu və necə həll etdin?
> **Model Cavab:** Ən çox vaxtımı alan problem PySpark ilə MinIO arasında S3A bağlantısı zamanı baş verən `com.amazonaws.services.s3.model.AmazonS3Exception: 400 Bad Request` xətası oldu. Araşdırdıqda məlum oldu ki, MinIO lokal Docker-də subdomain stilini deyil, path-style müraciəti tələb edir və default olaraq Spark virtual-hosted bucket axtarır. Spark konfiqurasiyasına `spark.hadoop.fs.s3a.path.style.access = true` və uyğun `aws-java-sdk` versiyasını əlavə etdikdən sonra problem tam aradan qalxdı. Bu təcrübə mənə S3A arxitekturasının daxili mexanizmlərini dərindən öyrətdi.

### S12: Gold qatında hansı konkret aqreqat göstəricilərini saxladın?
> **Model Cavab:** Gold qatında biznes rəhbərliyinin tez-tez ehtiyac duyduğu 3 əsas göstərici üzrə cədvəl qurdum: 1) Filial və agentlər üzrə aylıq cəmi toplanmış sığorta mükafatı; 2) Sığorta məhsul növləri (KASKO, İcbari) üzrə aktiv polislərin ümumi sayı; 3) Müştərilərin risk qruplarına görə orta təminat məbləği. Bu göstəricilər qabaqcadan hesablandığı üçün BI hesabatları saniyənin onda biri müddətində açılırdı.

### S13: Layihədə kodun və konfiqurasiyanın versiya nəzarətini necə təşkil etmişdin?
> **Model Cavab:** Bütün ETL skriptlərini, Docker Compose fayllarını və SparkSession köməkçi modullarını Git repozitoriyasında saxladım. Şifrələri və S3 access key-ləri heç vaxt koda yazmayıb `.env` faylında saxladım və `.gitignore`-a əlavə etdim. `feature/silver-cleaning` və `feature/delta-lake-sink` kimi qollarda işləyib test etdikdən sonra əsas `main` qoluna birləşdirdim.

### S14: Bu layihəni bu gün sıfırdan yenidən qursaydın, nəyi fərqli edərdin?
> **Model Cavab:** İki mühüm təkmilləşdirmə edərdim: birincisi, skriptləri əl ilə növbə ilə işə salmaq əvəzinə, bütün prosesi **Apache Airflow** ilə orkestrasiya edərdim, asılılıqları və avtomatik retry-ları DAG içinə qoyardım. İkincisi, Silver-dən Gold-a keçid transformasiyalarını birbaşa kodda deyil, **dbt-core** vasitəsilə SQL modelləri kimi yazardım ki, həm data lineage avtomatik çıxsın, həm də sənədləşmə daha asan olsun.

---

## 6. Yadda Saxlanacaq Rəqəmlər Qutusu (Metrikalar)

> [!TIP]
> **Müsahibə üçün qısa metrikalar (Sahib tərəfindən redaktə edilə bilər):**
> * **Məlumat qatlarının sayı:** 3 qat (Bronze, Silver, Gold)
> * **Cədvəl sayı:** 5 əsas cədvəl (Müştərilər, Polislər, İddialar, Təminatlar, Gündəlik Mart)
> * **Saxlama formatı:** Delta Lake (Parquet + JSON Transaction Log)
> * **Partisiya strategiyası:** İllər və aylar üzrə (`year=2026/month=02/`)
> * **Spark JDBC Batch Size:** 10,000 sətir / batch
> * **Yazma paralelliyi:** 4 executor partisiya axını
> * **Test mühiti:** Docker Compose (MinIO + PySpark Local + PostgreSQL)
