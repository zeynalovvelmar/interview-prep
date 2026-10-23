---
id: "07-apache-spark-pyspark"
slug: "apache-spark-ve-pyspark"
order: 7
title: "Apache Spark & PySpark Əsasları"
category: "Big Data"
priority: "high"
readiness: "guclu"
vacancyLink: "Böyük həcmli məlumatların paylanmış şəkildə emalı və analitikası"
tags: ["Spark", "PySpark", "Driver", "Executor", "DAG", "Shuffle", "Catalyst"]
summary: "Spark arxitekturası, Lazy evaluation, Transformation vs Action, Shuffle optimizasiyası və Broadcast join."
---

# Apache Spark & PySpark Əsasları

## 1. Qısa Xülasə (150-250 Söz)

Apache Spark böyük həcmli məlumatları tək bir maşının RAM yaddaşına sığışdırmaq məcburiyyətində qalmadan, onlarla kompüterdən ibarət klaster üzərində paralel emal edən paylanmış hesablama mühərrikidir. Sistem **Master-Worker** prinsipi ilə işləyir: proqram kodunu qəbul edən və tapşırıqları planlayan **Driver**, hesablamaları fiziki icra edən isə işçi qovşaqlardakı **Executor** prosesləridir.

Spark iki növ əməliyyatla işləyir: **Transformations** (yeni DataFrame yaradan `filter`, `select`, `groupBy`) və **Actions** (faktiki icranı başladan `count`, `show`, `write`). Spark **Lazy Evaluation** tətbiq edir, yəni Action çağırılana qədər heç bir fiziki hesablama getmir; bu fasilədə daxili **Catalyst Optimizer** bütün əməliyyatları təhlil edib ən optimal icra planını (DAG) qurur.

Ən kritik performans amili **Shuffle** (şəbəkə üzərindən məlumat mübadiləsi) əməliyyatıdır. Dar asılılıqlarda (`filter`, `select`) hər partisiya öz executor-unda sürətlə işlənir. Geniş asılılıqlarda (`groupBy`, `join`) isə məlumatlar diskə yazılıb şəbəkə boyu paylanır. Şəbəkə darboğazının qarşısını almaq üçün kiçik cədvəllər böyüklərlə birləşdirilərkən **Broadcast Join** tətbiq olunur və shuffle sıfırlanır.

## 2. Praktik Kod Nümunəsi

```python
# PySpark ilə sığorta polislərinin oxunması, filtrlənməsi və Broadcast Join
from pyspark.sql import SparkSession
from pyspark.sql.functions import broadcast, col

spark = SparkSession.builder.appName("InsuranceSparkAnalytics").getOrCreate()

# Böyük fakt cədvəli (10M sətir) və kiçik filial dimensiyası (50 sətir)
df_policies = spark.read.parquet("s3a://insurance-lake/silver/policies")
df_branches = spark.read.parquet("s3a://insurance-lake/silver/branches")

# Broadcast Join ilə shuffle-ı aradan qaldıraraq aqreqasiya:
df_result = df_policies.filter(col("premium_amount") > 100) \
    .join(broadcast(df_branches), "branch_id", "inner") \
    .groupBy("branch_name") \
    .sum("premium_amount")

df_result.write.mode("overwrite").parquet("s3a://insurance-lake/gold/branch_kpi")
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: `df.count()` və `df.filter()` əmrlərindən hansı Transformation, hansı Action-dır və hesablama nə vaxt başlayır?
<!-- answer-start -->
**Cavab:** `filter()` Transformation-dır (sadəcə icra planına əlavə olunur, hesablama getmir). `count()` isə Action-dır və klasterdə faktiki paylanmış hesablamanı işə salan məhz odur.
<!-- answer-end -->

#### Sual 2: Broadcast Join nə vaxt istifadə olunur və ən böyük riski nədir?
<!-- answer-start -->
**Cavab:** Böyük cədvəllə kiçik ölçülü (adətən < 10MB) dimensiya cədvəlini birləşdirərkən şəbəkə shuffle-ını sıfıra endirmək üçün istifadə olunur. Ən böyük riski: əgər broadcast edilən cədvəl əslində nəhəngdirsə, Driver və Executor-larda yaddaş tükənərək OutOfMemory (OOM) xətası baş verər.
<!-- answer-end -->
