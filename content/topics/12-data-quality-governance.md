---
id: "12-data-quality-governance"
slug: "data-quality-ve-governance"
order: 12
title: "Məlumat Keyfiyyəti, İdarəetmə & Etibarlılıq"
category: "Data Quality"
priority: "high"
readiness: "guclu"
vacancyLink: "Məlumatların bütövlüyü, etibarlılığı və arxitektura standartlarının qorunması"
tags: ["Data Quality", "Completeness", "Accuracy", "Quarantine", "PII Masking", "SLA"]
summary: "6 əsas keyfiyyət ölçüsü, Karantin modeli, Great Expectations, PII konfidensiallığı və Data SLA."
---

# Məlumat Keyfiyyəti, İdarəetmə & Etibarlılıq

## 1. Qısa Xülasə (150-250 Söz)

Məlumat Keyfiyyəti (Data Quality) və İdarəetməsi (Governance) boru kəmərlərinin təkcə işləməsinə deyil, həm də daxil olan rəqəmlərin biznes və tənzimləyici orqanlar üçün etibarlı olmasına zəmanət verir. Əsas 6 ölçü: **Completeness** (boşluqların olmaması), **Uniqueness** (təkrarsızlıq), **Validity** (formata uyğunluq), **Accuracy** (dəqiqlik), **Timeliness** (vaxtındalıq) və **Consistency** (müxtəlif sistemlər arasında ziddiyyətsizlik).

Xətalı məlumat aşkar edildikdə bütün boru kəmərini dayandırmaq yerinə **Quarantine Pattern** tətbiq olunur: təmiz sətirlər normal analitik qata keçir, problemli sətirlər isə xəta səbəbi ilə karantin cədvəlinə ayrılır. Məlumatın biznesə saat neçəyə qədər çatacağını təyin edən daxili öhdəlik isə **Data SLA** adlanır.

Sığorta və bank sahəsində xüsusilə **Fərdi Məlumatların (PII - FIN, telefon, kart nömrələri)** qorunması kritikdir. Analitik və test mühitlərinə məlumat çıxarılarkən bu sahələr mütləq biristiqamətli HASH (SHA-256) və ya maskalama (məsələn, `****1234`) ilə gizlədilməlidir.

## 2. Praktik Kod Nümunəsi

```sql
-- PostgreSQL: PII maskalama və etibarsız sətirləri Karantinə ayırmaq
-- 1. PII Maskalama Görünüşü (Analitiklər üçün):
CREATE OR REPLACE VIEW core.v_customers_masked AS
SELECT 
    customer_id,
    -- FIN kodun son 3 simvolunu gizlətmək:
    SUBSTRING(fin_code, 1, 4) || '***' AS fin_masked,
    -- Telefon nömrəsini maskalamaq:
    '+994** *** ** ' || RIGHT(phone, 2) AS phone_masked,
    city
FROM core.dim_customer;

-- 2. Biznes validasiyası: Sığorta tarixi məntiqi
-- StartDate həmişə EndDate-dən kiçik və ya bərabər olmalıdır:
ALTER TABLE core.fact_policy_sales 
  ADD CONSTRAINT chk_policy_dates CHECK (end_date >= start_date);
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: Məlumat boru kəmərində "Quarantine Pattern" (Karantin modeli) nə üçün lazımdır?
<!-- answer-start -->
**Cavab:** Bircə xətalı sətir və ya yetim xarici açar (orphan FK) üzündən bütün 1 milyonluq hesabatın çökməsinin qarşısını almaq üçün. Düzgün məlumatlar analitikaya davam edir, xətalı sətirlər isə kənara — karantin cədvəlinə yazılaraq sonradan araşdırılır.
<!-- answer-end -->

#### Sual 2: Data SLA (Service Level Agreement) nədir və pozulduqda nə edilir?
<!-- answer-start -->
**Cavab:** Data SLA məlumatın biznesə hansı vaxta qədər (məsələn, hər səhər saat 08:30) və hansı tamlıqda çatdırılacağını göstərən öhdəlikdir. Vaxt aşılarsa, avtomatik `sla_miss_callback` ilə növbətçi mühəndisə və komandaya həyəcan siqnalı (alert) göndərilir.
<!-- answer-end -->
