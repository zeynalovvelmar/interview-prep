---
id: "gaps-strategy"
title: "Boşluqlarla Necə İşləməli (Gap Strategy)"
subtitle: "CV-də olmayan texnologiyalar üzrə dürüst, inamlı və strukturlu müsahibə yanaşması"
---

# Boşluqlarla Necə İşləməli (Gap Strategy)

> [!IMPORTANT]
> **Ən Vacib Qayda (Dürüstlük):** Heç vaxt görmədiyin təcrübəni iddia etmə. Junior namizəddən hər şeyi bilmək yox, **dürüstlük**, **möhkəm təməl prinsiplər**, **öyrənmə sürəti** və **strukturlaşdırılmış mühəndis düşüncəsi** tələb olunur. Bir şeyi bilməyəndə *"Production-da etməmişəm, amma nəzəriyyəsini və prinsiplərini yaxşı bilirəm, yanaşmam belə olardı..."* qəlibindən istifadə et.

---

## 1. Boşluq 1: İstehsalat (Production) MS SQL Server Təcrübəsi

### Vəziyyət
* **Həqiqət:** T-SQL sintaksisini, indeksləri, tranzaksiyaları, DMV-ləri və arxitekturanı dərindən öyrənmisən, lakin illərlə böyük müəssisə SQL Server prod mühitini idarə etməmisən.

### İnamlı və Dürüst Cavab Skripti
> "Dürüst desəm, illərlə canlı istehsalat (production) mühitində 7/24 SQL Server DBA və ya mühəndisi kimi işləməmişəm. Lakin mən SQL Server-in daxili arxitekturasını — Data və Log fayllarının işini, Buffer Pool-u, Clustered və Non-Clustered indeks fərqlərini və Query Store mexanizmini dərindən öyrənmişəm. 
> 
> Əgər mənə mövcud SQL Server bazasını təhlil etmək tapşırılsa, ilk növbədə `sys.dm_exec_query_stats` ilə ən çox CPU və I/O yeyən ləng sorğuları taparam, `sys.dm_db_missing_index_details` ilə çatışmayan indeksləri aşkarlayaram və `sys.sql_expression_dependencies` ilə prosedurlar arasındakı asılılıq xəritəsini çıxararam. PostgreSQL təcrübəmdəki optimallaşdırma prinsipləri SQL Server-də də eyni məntiqlə tətbiq olunur."

### Layihələrdən Transfer Olunan Bacarıqlar
* **PostgreSQL sorğu optimallaşdırması:** B-Tree indeksləmə, Execution Plan (I/O, Cost) analizi birbaşa SQL Server-ə transfer olunur.
* **PySpark JDBC inteqrasiyası:** Verilənlər bazasına toplu (batch) qoşulmalar və şəbəkə darboğazlarının idarəsi.

### Müsahibəyə Qədər 1 Saatlıq Məşq (Lab)
* Docker-də `mcr.microsoft.com/mssql/server:2022-latest` qaldır, `WideWorldImporters` və ya kiçik test bazası yarat. `sys.dm_exec_query_stats` sorğusunu bir dəfə əl ilə işlət.

### Əsla Demə! (Qadağan İfadələr)
* ❌ *"SQL Server-də hər şeyi illərdir edirəm, AlwaysOn klasterləri qurmuşam."*
* ❌ *"SQL Server ilə Postgres tam eynidir, heç bir fərqi yoxdur."*

---

## 2. Boşluq 2: Real SQL Server $\rightarrow$ PostgreSQL Müəssisə Miqrasiyası

### Vəziyyət
* **Həqiqət:** Şirkət miqyasında 2 TB-lıq canlı bazanı təkbaşına köçürməmisən, amma data tiplərinin uyğunlaşdırılmasını, T-SQL $\rightarrow$ PL/pgSQL sintaksis fərqlərini, CDC və Cutover addımlarını bilirsən.

### İnamlı və Dürüst Cavab Skripti
> "Mən böyük şirkətdə canlı sistemin təkbaşına miqrasiyasını aparmamışam. Lakin miqrasiya prosesinin bütün mərhələlərini və risklərini addım-addım təhlil etmişəm. 
> 
> Yanaşmam 4 fazadan ibarətdir: 
> 1) **İnventar və Analiz:** data tiplərinin (DATETIME2 $\rightarrow$ TIMESTAMPTZ, BIT $\rightarrow$ BOOLEAN, IDENTITY $\rightarrow$ GENERATED AS IDENTITY) xəritələnməsi; 
> 2) **Test mühitində DDL və Skriptlərin tətbiqi:** T-SQL xüsusiyyətlərinin (TOP $\rightarrow$ LIMIT, ISNULL $\rightarrow$ COALESCE, MERGE $\rightarrow$ ON CONFLICT) PL/pgSQL-ə çevrilməsi; 
> 3) **Məlumatın köçürülməsi və CDC:** böyük həcm üçün ilkin snapshot yükləmə və fasiləsiz CDC sinxronizasiyası; 
> 4) **Validasiya:** sətir sayı, MD5/SHA256 heş və biznes yekunlarının tutuşdurulması. Hər bir addımda mütləq Rollback və Cutover planı hazırlayaram."

### Layihələrdən Transfer Olunan Bacarıqlar
* **Bank layihəsindəki Data Quality və Karantin:** Məlumat tiplərinin və formatlarının validasiyası miqrasiyadakı data bütövlüyü yoxlamaları ilə eynidir.
* **Lakehouse relasion sxem yoxlanışı:** MinIO-dan PostgreSQL-ə məlumat çıxararkən DDL uyğunsuzluqlarını həll etmək təcrübəsi.

### Əsla Demə!
* ❌ *"Miqrasiya çox sadədir, pgloader-ə verirsən 5 dəqiqəyə hər şeyi özü köçürür."* (Prosedurlar və collation xətaları partlayar!)

---

## 3. Boşluq 3: Apache Iceberg İstehsalatda (Səndə Delta Lake Təcrübəsidir)

### Vəziyyət
* **Həqiqət:** MinIO üzərində Delta Lake layihəsi qurmusan, lakin Iceberg-i canlı şirkət layihəsində işlətməmisən.

### İnamlı və Dürüst Cavab Skripti
> "Mənim birinci layihəmdə əsas fokusum Delta Lake üzərində olub və orada `_delta_log` vasitəsilə ACID tranzaksiyaların, Time Travel və Schema Evolution mexanizmlərinin necə işlədiyini praktiki görmüşəm. Apache Iceberg-i istehsalatda canlı tətbiq etməmişəm, lakin konseptual memarlığını araşdırmışam. 
> 
> Iceberg-in kataloq əsaslı (Catalog Pointer $\rightarrow$ metadata.json $\rightarrow$ Manifest List $\rightarrow$ Manifest Files $\rightarrow$ Parquet) arxitekturasını və Gizli Partisiyalanma (Hidden Partitioning) üstünlüyünü çox yaxşı başa düşürəm. Delta Lake-də öyrəndiyim cədvəl formatı prinsipləri 90% Iceberg-ə keçərlidir; iş mühitində Iceberg-ə adaptasiya olmağım cəmi bir neçə gün çəkər."

### Layihələrdən Transfer Olunan Bacarıqlar
* Delta Lake ACID, compaction (OPTIMIZE), snapshot izolyasiyası və Time Travel anlayışları birbaşa Iceberg-in analoji xüsusiyyətləri ilə eyni mühəndislik məqsədinə xidmət edir.

---

## 4. Boşluq 4: Real AWS Bulud İnfrastrukturu (Səndə MinIO və Docker-dir)

### Vəziyyət
* **Həqiqət:** Layihələri lokal Docker konteynerində MinIO ilə etmisən, real AWS konsolunda S3/IAM hesabın olmayıb.

### İnamlı və Dürüst Cavab Skripti
> "Layihələrimdə xərclərdən yayınmaq və lokal təcrid olunmuş mühit yaratmaq üçün S3 ilə 100% API-uyğun olan MinIO obyekt anbarından istifadə etmişəm. Kod səviyyəsində PySpark-da `s3a://` drayveri və S3A protokolu ilə işləmişəm. 
> 
> Real AWS S3-ə keçərkən kodda heç bir dəyişiklik tələb olunmur; sadəcə endpoint lokal hostdan AWS regional ünvanına dəyişdirilir və autentifikasiya üçün statik açarlar yerinə IAM Role (`InstanceProfileCredentialsProvider`) təyin edilir. AWS S3-ün bucket, prefix, storage classes (Standard vs Glacier) və lifecycle idarəetmə prinsiplərini yaxşı bilirəm."

### Layihələrdən Transfer Olunan Bacarıqlar
* S3A konfiqurasiyaları, path-style vs virtual-hosted müraciət, Hadoop AWS bundle və partisiya yolları.

---

## 5. Boşluq 5: Müəssisə NoSQL Bazaları (MongoDB, Redis)

### Vəziyyət
* **Həqiqət:** Təcrübən əsasən relational (PostgreSQL, SQL Server) və Lakehouse üzərindədir; NoSQL-i sadəcə nəzəri bilirsən.

### İnamlı və Dürüst Cavab Skripti
> "Mənim əsas güclü tərəfim relyasion bazalar, Data Warehouse modelləşdirməsi və Lakehouse analitikasıdır; NoSQL sistemləri ilə gündəlik istehsalat təcrübəm azdır. 
> 
> Lakin konseptual olaraq Document (MongoDB), Key-Value (Redis) və Columnar modellər arasındakı fərqləri, CAP teoremini və nə vaxt NoSQL seçilməli olduğunu bilirəm. Əgər Atəşgah Sığortada kənar tətbiqlərdən və ya mobil tətbiqdən MongoDB-də toplanan yarı-strukturlaşdırılmış loqları Lakehouse-a çəkmək lazım gələrsə, Python və ya Airflow konnektorları ilə həmin JSON sənədlərini Bronze qatına yığıb, PySpark-da sxem açaraq (flattening) analitikaya hazırlamaq yanaşmasını tətbiq edərəm."

---

## 6. Boşluq 6: Müstəqil Memarlıq Qərarlarına Rəhbərlik Etmək

### Vəziyyət
* **Həqiqət:** Junior vəzifəsinə müraciət edirsən, təkbaşına şirkət miqyasında 5 illik texnoloji strategiya müəyyən etməmisən.

### İnamlı və Dürüst Cavab Skripti
> "Vakansiyada müstəqil memarlıq qərarları tələbi qeyd olunub. Mən dərk edirəm ki, Junior mühəndis olaraq ilk gündən təkbaşına qlobal memarlıq qərarları vermək məsuliyyətsizlik olardı. 
> 
> Mənim yanaşmam belədir: Mən verilən tapşırığın texniki alternativlərini araşdırıram, müsbət və mənfi cəhətlərini (trade-offs), xərclərini və risklərini cədvəl halına salıram (ADR - Architecture Decision Record formatında) və komanda rəhbərinə əsaslandırılmış təkliflə gedirəm. Verilən yekun qərarı isə ən yüksək mühəndislik keyfiyyəti ilə icra etməyə cavabdeh oluram."

---

## 7. Əgər İşi Qəbul Etsəm: 30 / 60 / 90 Günlük Fəaliyyət Planım

### İlk 30 Gün (Adaptasiya və İnventar)
* Atəşgah Sığortanın mövcud SQL Server infrastrukturunu, verilənlər bazası sxemlərini, əsas cədvəllərini və biznes terminologiyasını (Polis, KASKO, İddia, Təminat) öyrənmək.
* Mövcud Stored Procedure və Airflow/SSIS borularının asılılıq xəritəsini (Dependency Map) çıxarmaq.
* Komandadakı böyük mühəndislərin kodlaşdırma standartlarını və CI/CD mühitini mənimsəmək; ilk kiçik bugfix və ya köməkçi ETL skriptini deploy etmək.

### 60 Gün (Aktiv İştirak və Miqrasiya Sınaqları)
* Test mühitində SQL Server-dən PostgreSQL-ə köçürüləcək pilot modulların DDL uyğunlaşdırmasını və data type mapping testlərini icra etmək.
* Məlumat keyfiyyəti (Data Quality) və validasiya yoxlama sorğularını avtomatlaşdırmaq.
* PySpark və ya Python borularında performans darboğazlarını aradan qaldırmaqda komandaya dəstək olmaq.

### 90 Gün (Müstəqillik və Töhfə)
* Müəyyən olunmuş ETL və ya miqrasiya modullarını müstəqil şəkildə uçdan-uca icra etmək.
* Məlumat platformasında monitorinq və alerting (SLA nəzarəti) panellərini zənginləşdirmək.
* Sənədləşməni (Data Dictionary və Memarlıq qərarlarını) tam və aktual saxlamaq.
