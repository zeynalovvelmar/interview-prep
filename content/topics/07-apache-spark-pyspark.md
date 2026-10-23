---
id: "07-apache-spark-pyspark"
slug: "apache-spark-ve-pyspark"
order: 7
title: "Apache Spark & PySpark Əsasları"
category: "Big Data"
priority: "high"
readiness: "guclu"
vacancyLink: "Böyük həcmli sığorta tranzaksiyalarının və polislərin paylanmış şəkildə emalı, transformasiyası və analitikası"
tags: ["Spark", "PySpark", "Driver", "Executor", "DAG", "Shuffle", "Catalyst", "Broadcast Join", "Partitioning"]
summary: "Spark klaster memarlığı, Lazy evaluation, Narrow vs Wide dependencies, Catalyst Optimizer, Shuffle və yaddaş idarəsi, PySpark Window funksiyaları və OOM həlləri."
---

# Apache Spark & PySpark Əsasları

## 1. Qısa İzah və Analogiya

Böyük həcmli məlumatları (onlarla milyon sətir sığorta polisləri, ödəmələr və telemetriya datası) ənənəvi alətlərlə (məsələn, tək nüvəli Python Pandas və ya tək serverli bazalar) emal etmək mümkün deyil. Məlumat həcmi kompüterin RAM yaddaşını keçdikdə sistem `OutOfMemory (OOM)` xətası ilə dayanır.

**Apache Spark** böyük verilənləri tək bir maşında deyil, onlarla kompüterdən ibarət **klasterdə (Cluster)** paralel şəkildə emal edən paylanmış ümumi təyinatlı hesablama mühərrikidir.

> [!NOTE]
> **Analogiya:** Təsəvvür edin ki, 1 milyon səhifəlik sığorta arxivini yoxlamaq lazımdır. Əgər bir müfəttiş (tək server) bunu təkbaşına oxusa, aylar çəkər və masasında yer qalmaz (RAM tükənər). Spark isə bu arxivi 50 bərabər hissəyə bölür, 50 fərqli köməkçiyə (**Executors**) paylayır və bir rəhbər (**Driver**) onların işini planlaşdırıb nəticələri toplayır. İş cəmi bir neçə dəqiqəyə başa çatır.

Spark məlumatları diskə yazmadan birbaşa **RAM yaddaşında (In-Memory Computing)** emal etdiyi üçün köhnə Hadoop MapReduce arxitekturasından 10–100 dəfə daha sürətlidir.

---

## 2. Əsas Anlayışlar və Memarlıq Detalları

```
                          ┌───────────────────────────┐
                          │   DRIVER PROCESS          │
                          │   - SparkSession          │
                          │   - DAGScheduler          │
                          │   - TaskScheduler         │
                          └─────────────┬─────────────┘
                                        │
                         Sorğu planı və Tapşırıqlar (Tasks)
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
 ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
 │  EXECUTOR 1 (Node)  │     │  EXECUTOR 2 (Node)  │     │  EXECUTOR 3 (Node)  │
 │  ┌───────────────┐  │     │  ┌───────────────┐  │     │  ┌───────────────┐  │
 │  │ Task 1 Task 2 │  │     │  │ Task 3 Task 4 │  │     │  │ Task 5 Task 6 │  │
 │  └───────────────┘  │     │  └───────────────┘  │     │  └───────────────┘  │
 │  [Execution Memory] │     │  [Execution Memory] │     │  [Execution Memory] │
 │  [Storage (Cache) ] │     │  [Storage (Cache) ] │     │  [Storage (Cache) ] │
 └─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

### 2.1. Spark Klaster Memarlığı və Yaddaş Bölgüsü

Spark **Master-Worker** memarlığı ilə işləyir:

- **Driver:** Proqramın giriş nöqtəsidir (`SparkSession`). İstifadəçinin kodunu təhlil edir, icra qrafiki (**DAG**) qurur, tapşırıqları (**Tasks**) fiziki hissələrə bölür və klaster menecerindən (YARN, Kubernetes və ya Standalone) resurs tələb edir.
- **Executor:** Klasterin işçi qovşaqlarında (Worker Nodes) çalışan JVM prosesləridir. Driver-in göndərdiyi tapşırıqları icra edir, hesablamaları aparır və nəticələri Driver-ə qaytarır və ya birbaşa S3/HDFS/baza anbarına yazır.

#### Executor Yaddaşının Daxili Strukturu (JVM Heap)

| Yaddaş Sahəsi | Standart Pay (%) | Təyinatı və İş Mexanizmi |
| :--- | :--- | :--- |
| **Execution Memory** | ~30% | `JOIN`, `groupBy`, `sort` və `shuffle` kimi hesablama operatorlarının müvəqqəti məlumatları üçün ayrılır. |
| **Storage Memory** | ~30% | `cache()` və `persist()` edilmiş DataFrame-lərin RAM-da saxlanması üçün istifadə olunur. |
| **User Memory** | ~40% | Spark daxili strukturları, istifadəçi tərəfindən yazılmış UDF-lər və metadata üçün qalır. |
| **Overhead Memory** | Adətən 10% (min 384MB) | JVM-dən kənar (Off-heap) şəbəkə buferləri və PySpark Python prosesləri üçün ayrılmış OS yaddaşıdır. |

> [!TIP]
> **Unified Memory Manager:** Spark-da Execution və Storage yaddaşı vahid hovuzdadır (`spark.memory.fraction = 0.6`). Əgər heşləmə və ya çeşidləmə üçün çox yer lazımdırsa, Execution yaddaşı Storage-dən borc ala bilər; lakin hesablama başlayanda keşlənmiş məlumatlar diskə çıxarılır (eviction).

---

### 2.2. Lazy Evaluation, Transformations vs Actions

Spark əmrləri iki əsas kateqoriyaya bölünür:

#### 1. Transformations (Tənbəl Əməliyyatlar)
Mövcud DataFrame-dən yeni bir DataFrame törədir (`select`, `filter`, `withColumn`, `groupBy`, `join`). Spark bu əmrləri dərhal icra etmir! Yalnız icra planına (DAG) əlavə edir. Bu yanaşma **Lazy Evaluation (Tənbəl Hesablama)** adlanır.

#### 2. Actions (İcranı Başladan Əməliyyatlar)
Klasterdəki hesablamaları faktiki işə salan və nəticəni ya Driver-ə gətirən, ya da diskə yazan əmrlərdir (`count`, `show`, `collect`, `write.parquet()`, `saveAsTable`). Action çağırılana qədər heç bir sətir oxunmur və emal edilmir.

#### Narrow (Dar) vs Wide (Geniş) Asılılıqlar

| Xüsusiyyət | Narrow Dependencies (Dar Asılılıq) | Wide Dependencies (Geniş Asılılıq) |
| :--- | :--- | :--- |
| **Əməliyyat Nümunələri** | `filter()`, `map()`, `select()`, `withColumn()` | `groupBy()`, `distinct()`, `join()`, `repartition()` |
| **Məlumat Hərəkəti** | Hər partisiya yalnız öz executor-unun yaddaşında emal olunur. | Partisiyalar şəbəkə üzərindən digər qovşaqlara köçürülür (**Shuffle**). |
| **Şəbəkə və Disk Yükü** | Sıfır şəbəkə xərci, maksimum sürət. | Çox yüksək disk I/O və şəbəkə gecikməsi. |
| **Stage Sərhədi** | Eyni Stage daxilində paralel icra olunur (Pipelining). | **Yeni Stage başladır.** Shuffle bitənə qədər sonrakı stage gözləyir. |

---

### 2.3. Catalyst Optimizer və Project Tungsten

Spark SQL və DataFrame API-nin ən böyük gücü daxili **Catalyst Optimizer** mühərrikidir. Siz SQL və ya Python kodu yazarkən Catalyst arxa planda 4 pilləli optimizasiya aparır:

1. **Unresolved Logical Plan:** Kodun sintaksisi yoxlanılır (cədvəl və sütun adları hələ təsdiqlənməyib).
2. **Resolved Logical Plan:** Kataloqa (Catalog / Metastore) müraciət edilir, sütun tipləri və cədvəllər doğrulanır.
3. **Optimized Logical Plan:** İki fundamental optimizasiya tətbiq olunur:
   - **Predicate Pushdown:** Filtrlər (`WHERE premium > 500`) birbaşa saxlama qatına ötürülür. Parquet fayllarından yalnız şərtə uyğun bloklar oxunur.
   - **Column Pruning:** Cədvəldə 50 sütun olsa belə, sorğuda yalnız 3 sütun istifadə edilirsə, qalan 47 sütun diskdən heç oxunmur.
4. **Physical Plan & Code Generation (Tungsten):** Bir neçə fiziki icra planı tərtib olunur, xərc analizi (Cost-Based Optimizer) ilə ən optimalı seçilir və JVM bytecode səviyyəsində birbaşa maşın koduna kompilyasiya edilir.

---

### 2.4. Partitioning, Shuffle və Repartition vs Coalesce

Məlumatlar klasterdə hissələrə bölünərək saxlanılır; hər bir hissə **Partisiya (Partition)** adlanır. Hər bir Spark Task-ı eyni vaxtda dəqiq 1 partisiyanı emal edir.

- Standart shuffle partisiya sayı: `spark.sql.shuffle.partitions = 200`. Kiçik verilənlərdə 200 partisiya həddən artıq xırda tapşırıq yaradır; 100 GB-lıq nəhəng datada isə 200 partisiya azlıq təşkil edib hər taska çox böyük yük sala bilər.

#### Repartition vs Coalesce Müqayisəsi

| Əmr | Shuffle Baş Verirmi? | Partisiya Sayını Artırırmı? | Partisiya Sayını Azaldırmı? | Ən Yaxşı İstifadə Yeri |
| :--- | :--- | :--- | :--- | :--- |
| `df.repartition(n)` | **Bəli (Tam Full Shuffle)** | Bəli | Bəli | Məlumatları bərabər paylamaq və ya partisiya sayını artırmaq üçün. |
| `df.coalesce(n)` | **Xeyr (Shuffle-sız, eyni nodda birləşdirmə)** | Xeyr | **Bəli** | Fayla yazmazdan əvvəl kiçik fayl sayını azaltmaq üçün (`coalesce(1)` və ya `coalesce(4)`). |

> [!WARNING]
> Heç vaxt partisiya sayını artırmaq üçün `coalesce()` istifadə etməyin; Spark xəta vermədən əmri görməzdən gələcək və mövcud partisiya sayı dəyişməyəcəkdir. Partisiya artırmaq üçün yalnız `repartition()` tələb olunur.

---

### 2.5. Spark Join Strategiyaları

| Join Növü | İş Mexanizmi | Nə Vaxt Seçilir? | Üstünlüyü / Çatışmazlığı |
| :--- | :--- | :--- | :--- |
| **Broadcast Hash Join (BHJ)** | Kiçik cədvəl bütün executor-ların RAM-ına kopyalanır. | Cədvəllərdən biri kiçik olduqda (< 10MB default). | **Ən sürətli Join!** Heç bir Shuffle tələb etmir. |
| **Shuffle Sort-Merge Join (SMJ)** | Hər iki cədvəl join açarına görə şəbəkə boyu paylanır və çeşidlənir. | Hər iki cədvəl nəhəng olduqda (Default böyük join). | Çox etibarlıdır, lakin yüksək disk və şəbəkə shuffle xərci var. |
| **Shuffle Hash Join** | Cədvəllər partisiya üzrə bölünür və biri RAM-da heş cədvəli kimi saxlanılır. | Cədvəllər orta həcmdə olduqda və çeşidləmə bahalı olduqda. | Yaddaş çox tələb edir, OOM riski daşıyır. |

---

## 3. Praktik PySpark Kod Nümunələri

### 3.1. Sığorta Məlumatlarının Oxunması, Window Funksiyaları və Broadcast Join

```python
# Dialect: PySpark (Python 3.10+ / Spark 3.5+)
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, to_date, round, when, broadcast, 
    row_number, sum as _sum, avg as _avg
)
from pyspark.sql.window import Window
from pyspark.sql.types import DecimalType

# 1. SparkSession sazlanması (S3/MinIO və Lakehouse uyğun)
spark = SparkSession.builder \
    .appName("AteshgahInsuranceAnalytics") \
    .config("spark.sql.shuffle.partitions", "8") \
    .config("spark.sql.autoBroadcastJoinThreshold", "10485760") \
    .getOrCreate()

# 2. Xammal cədvəllərin S3-dən oxunması
df_policies = spark.read.parquet("s3a://insurance-lakehouse/silver/policies")
df_branches = spark.read.parquet("s3a://insurance-lakehouse/silver/branches")

# 3. Data Cleaning və Tip çevrilmələri
df_clean = df_policies \
    .filter(col("policy_id").isNotNull()) \
    .filter(col("premium_amount") > 0) \
    .withColumn("issue_date", to_date(col("issue_date"), "yyyy-MM-dd")) \
    .withColumn("premium_amount", col("premium_amount").cast(DecimalType(12, 2))) \
    .withColumn("status_flag", when(col("is_active") == True, "AKTIV").otherwise("PASSIV"))

# 4. Broadcast Join ilə kiçik filial cədvəlinin birləşdirilməsi (Shuffle-sız)
df_joined = df_clean.join(
    broadcast(df_branches),
    on="branch_id",
    how="inner"
)

# 5. Window funksiyası: Hər filial üzrə ən yüksək mükafatlı 3 polisi sıralamaq
branch_window = Window.partitionBy("branch_name").orderBy(col("premium_amount").desc())

df_top_policies = df_joined.withColumn("rank_in_branch", row_number().over(branch_window)) \
    .filter(col("rank_in_branch") <= 3)

# 6. Partisiya üzrə qənaətli saxlanış (Coalesce ilə kiçik faylların qarşısı alınır)
df_top_policies.coalesce(2).write \
    .mode("overwrite") \
    .partitionBy("branch_name") \
    .parquet("s3a://insurance-lakehouse/gold/top_branch_policies")
```

---

## 4. Tez-tez Edilən Səhvlər və Həll Yolları

### Səhv 1: `OutOfMemoryError: Java heap space` (Executor OOM)
- **Səbəb:** Executor-un yaddaşına sığmayan nəhəng partisiya oxunub, böyük cədvəl səhvən broadcast edilib və ya yaddaşa uyğun olmayan aqreqasiya aparılıb.
- **Həll Yolu:**
  1. `spark.executor.memory` həcmini artırın (məsələn, 2G-dən 4G-yə).
  2. Partisiya sayını artırmaq üçün `df.repartition(16)` tətbiq edin ki, hər partisiya kiçilsin.
  3. `broadcast()` funksiyasını yalnız cədvəlin bir neçə meqabayt olduğuna əmin olduqda tətbiq edin.

### Səhv 2: Data Skew (Məlumat Əyilməsi / Disbalans)
- **Səbəb:** Spark UI-da 199 tapşırıq 3 saniyəyə bitir, lakin 1 tapşırıq saatlarla ilişib qalır. Səbəb odur ki, join və ya groupBy açarında bir dəyər (məsələn, Bakı filialı və ya `NULL`) məlumatların 80%-ni təşkil edir və bütün bu sətirlər tək bir executor-a düşür.
- **Həll Yolu:**
  1. **Salting Texnikası:** Əyri açara təsadüfi nömrə (məsələn, `concat(branch_id, '_', rand(0, 4))`) əlavə edərək açarı süni parçalamaq.
  2. **Adaptive Query Execution (AQE):** Spark 3+ ilə `spark.sql.adaptive.skewJoin.enabled = true` parametrini aktiv etmək (Spark disbalansı avtomatik aşkarlayıb partisiyanı parçalayır).

### Səhv 3: Driver OOM (`df.collect()` və ya `toPandas()`)
- **Səbəb:** Klasterdəki 50 milyonluq cədvəli Driver qovşağına çağırmaq (`df.collect()`). Driver-in RAM-ı (1–2GB) dolur və bütün tətbiq çökür.
- **Həll Yolu:** Böyük məlumatları Driver-ə çəkməyin! Baxmaq üçün yalnız `df.take(10)` və ya `df.show(10)` istifadə edin. Fayla yazmanı isə `df.write` ilə birbaşa executor-lar vasitəsilə edin.

---

## 5. Vakansiya ilə Əlaqə və Müsahibədə Yanaşma (Atəşgah Sığorta)

Atəşgah Sığortada yüz minlərlə müştərinin tarixi polisləri, aylıq ödənişləri və zərər hadisələri toplanır. Bu məlumatlar əsasında Zərərlilik Nisbətinin (Loss Ratio) hesablanması, risk qruplarının seqmentasiyası və fırıldaqçılıq (fraud) analitikası PySpark-ın paylanmış hesablama gücünü tələb edir.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən layihələrimdə böyük həcmli sığorta və bazar məlumatlarını paylanmış emal etmək üçün **PySpark**-dan istifadə etmişəm. 
> 
> Mənim üçün ən önəmli mühəndislik prinsipləri:
> 1) **Shuffle xərcini minimuma endirmək:** Kiçik ölçü cədvəllərində mütləq `Broadcast Join` tətbiq edirəm.
> 2) **Catalyst Optimizer-dən düzgün faydalanmaq:** Filtrləri ən başda tətbiq edirəm ki, `Predicate Pushdown` ilə lazımsız sətirlər diskdən oxunmasın.
> 3) **Yaddaş və partisiya balansı:** `repartition` və `coalesce` fərqini dəqiq ayırıram; yazma mərhələsində kiçik fayl xaosunun qarşısını almaq üçün `coalesce` ilə fayl sayını optimallaşdırıram."

---

## 6. 3 Suallıq İnteraktiv Mini-Quiz

#### Sual 1: `df.repartition(10)` və `df.coalesce(10)` arasındakı fərq nədir və nə vaxt hansı seçilməlidir?
<!-- answer-start -->
**Cavab:** `repartition(10)` tam şəbəkə mübadiləsi (**Full Shuffle**) apararaq məlumatları sıfırdan bərabər paylayır; həm partisiya sayını artırmaq, həm də azaltmaq üçün işləyir. `coalesce(10)` isə shuffle aparmır, mövcud partisiyaları eyni qovşaq daxilində birləşdirir; yalnız partisiya sayını **azaltmaq** üçün işləyir. Verilənləri S3/diskə yazmazdan əvvəl xırda faylları azaltmaq üçün mütləq `coalesce()` seçilməlidir.
<!-- answer-end -->

#### Sual 2: PySpark-da Data Skew (məlumat əyilməsi) problemi nədir və Salting metodu bunu necə həll edir?
<!-- answer-start -->
**Cavab:** Data Skew zamanı bir join və ya qruplaşdırma açarı (məsələn, `branch_id = 1`) məlumatın böyük hissəsini təşkil etdiyi üçün həmin açara cavabdeh olan tək bir executor həddindən artıq yüklənir və bütün prosesi gecikdirir. **Salting** metodu ilə həmin əyri açara təsadüfi tam ədəd (məsələn, 0-dan 4-ə qədər) əlavə edilir (`branch_id_salted = branch_id + '_' + rand(0,4)`). Nəticədə tək bir nəhəng partisiya 5 fərqli executor arasında bərabər bölünür və hesablama paralelləşir.
<!-- answer-end -->

#### Sual 3: `cache()` və `persist()` metodlarının fərqi nədir və nə üçün istifadə bitdikdə `unpersist()` çağırılmalıdır?
<!-- answer-start -->
**Cavab:** `cache()` DataFrame-i susmaya görə yalnız RAM yaddaşında saxlayır (`MEMORY_ONLY`). `persist()` isə saxlama səviyyəsini (StorageLevel) seçməyə imkan verir (məsələn, `MEMORY_AND_DISK`, `MEMORY_ONLY_SER`). Keşlənmiş DataFrame-lə iş bitdikdən sonra `unpersist()` çağırılmazsa, həmin məlumatlar Executor-un Storage yaddaşını tutub saxlayır və növbəti emallar üçün Execution Memory çatışmazlığı və OOM yaranır.
<!-- answer-end -->
