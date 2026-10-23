---
id: "13-architecture-standards-decisions"
slug: "arxitektura-standartlari-ve-qerarlar"
order: 13
title: "Məlumat Arxitekturası Standartları & ADR"
category: "Arxitektura"
priority: "high"
readiness: "orta"
vacancyLink: "Məlumatların saxlanması, emalı və inteqrasiyası üzrə arxitektura standartlarının müəyyən edilməsi və tətbiqi"
tags: ["Architecture", "ADR", "ETL vs ELT", "Data Standards", "Naming Conventions", "Trade-offs"]
summary: "Memarlıq qərarlarının qeydiyyatı (ADR), adlandırma və qat standartları, ETL vs ELT müqayisəsi və kompromislər."
---

# Məlumat Arxitekturası Standartları & ADR

## 1. Qısa Xülasə (150-250 Söz)

Məlumat platformasının uzunmüddətli dayanıqlılığı və komanda daxilində xaosun qarşısının alınması üçün vahid **Arxitektura Standartları** təyin olunmalıdır. Standartlara: cədvəl və sütun adlandırma qaydaları (məsələn, `stg_`, `dim_`, `fact_` prefiksləri, snake_case), qatlaşdırma (Bronze → Silver → Gold), saxlama formatları (Parquet/Delta) və partisiya strategiyaları (`year/month/day`) daxildir.

Böyük texnoloji seçimlər (məsələn, "Niyə Iceberg əvəzinə Delta Lake seçdik?" və ya "Niyə ELT yanaşmasına keçdik?") **ADR (Architecture Decision Record)** sənədlərində qeyd olunur. ADR dörd hissədən ibarətdir: **Status**, **Context** (problem), **Decision** (seçim) və **Consequences** (müsbət və mənfi nəticələr).

Müasir bulud və Lakehouse platformalarında ənənəvi ETL yerinə **ELT (Extract-Load-Transform)** üstünlük təşkil edir. Məlumatlar xammal olaraq anbara və ya gölə yüklənir, transformasiya isə platformanın daxili gücü ilə SQL və ya PySpark vasitəsilə aparılır; bu, xammal datanın itirilməsinin qarşısını alır.

## 2. Praktik ADR Nümunəsi

```markdown
# ADR 003: Analitik Qat Üçün Cədvəl Formatının Seçimi

## Status: Təsdiqlənib (Accepted)

## Kontekst (Context):
S3 üzərində qurulan Lakehouse-da ACID tranzaksiyaları, Time Travel və kiçik fayl optimizasiyası lazımdır. Namizədlər: Delta Lake və Apache Iceberg.

## Qərar (Decision):
PySpark ilə ən yetkin inteqrasiyaya malik olduğu və komandamızın təcrübəsi olduğu üçün Delta Lake seçildi.

## Nəticələr (Consequences):
- Müsbət: _delta_log sayəsində tam ACID təmin olunur, Spark ilə performans yüksəkdir.
- Mənfi: Trino və Flink inteqrasiyasında Iceberg qədər çoxşaxəli açıq icma dəstəyi yoxdur.
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: ADR (Architecture Decision Record) nə üçün yazılır?
<!-- answer-start -->
**Cavab:** Texniki qərarların səbəbini, alternativləri və qəbul edilən riskləri (trade-offs) komanda yaddaşında sənədləşdirmək üçün. Bu, 1 il sonra komandaya yeni mühəndis gəldikdə "Niyə məhz bu texnologiya seçilib?" sualına dərhal aydın cavab verir.
<!-- answer-end -->

#### Sual 2: Müasir platformalarda niyə klassik ETL əvəzinə ELT üstün tutulur?
<!-- answer-start -->
**Cavab:** Çünki müasir bulud anbarlarında saxlama xərcləri çox ucuzlaşıb və bazaların hesablama gücü kəskin artıb. Xammal məlumat birbaşa bazaya yükləndiyi üçün (EL), sonradan istənilən vaxt yeni biznes məntiqi ilə təkrar transformasiya (T) etmək mümkündür və məlumat itmir.
<!-- answer-end -->
