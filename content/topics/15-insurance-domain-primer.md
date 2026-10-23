---
id: "15-insurance-domain-primer"
slug: "sigorta-sahesi-primer"
order: 15
title: "Sığorta Sahəsi & Biznes Domeni Bələdçisi"
category: "Biznes Domeni"
priority: "high"
readiness: "guclu"
vacancyLink: "Atəşgah Sığorta Şirkətində Data Mühəndisi vəzifəsi üçün biznes anlayışı"
tags: ["Sığorta", "Polis", "Mükafat", "Zərər", "Loss Ratio", "Anderraytinq", "KASKO", "İcbari"]
summary: "Sığorta həyat dövrü, polislər, zərər iddiaları, Loss Ratio düsturu, anderraytinq və tənzimləyici qaydalar."
---

# Sığorta Sahəsi & Biznes Domeni Bələdçisi

## 1. Qısa Xülasə (150-250 Söz)

Data Mühəndisinin şirkətə real dəyər qatması üçün sığorta biznesinin təməl terminlərini və məlumat axınını bilməsi zəruridir. Əsas anlayışlar: **Sığortalı (Insured/Customer)**, sığorta müqaviləsi sayılan **Polis (Policy)**, müştərinin ödədiyi sığorta haqqı olan **Mükafat (Premium)** və qəza/hadisə baş verdikdə şirkətin ödədiyi kompensasiya olan **Zərər İddiası (Claim)**.

Biznes prosesi **Anderraytinq (Underwriting)** mərhələsi ilə başlayır: şirkət müştərinin riskini (avtomobilin yaşı, sürücülük təcrübəsi) qiymətləndirir və tarif təyin edir. Polis aktivləşdikdən sonra hadisə baş verərsə zərər tənzimlənməsi şöbəsi iddiaya baxır və ödəniş təsdiqlənir.

Sığorta şirkətinin gəlirliliyini və dayanıqlığını ölçən ən kritik KPI **Zərərlilik Nisbətidir (Loss Ratio)**:

**Loss Ratio (%) = (Ödənilmiş Zərərlər / Toplanmış Sığorta Haqları) × 100%**
Normal halda bu göstərici 50%-70% civarında olmalıdır; 100%-dən yuxarı olması şirkətin zərərlə işlədiyini göstərir. Data mühəndisinin qurduğu cədvəllər rəhbərliyə məhz bu nisbəti hər filial və məhsul üzrə anlıq görmək imkanı verir.

## 2. Praktik SQL Metriki Nümunəsi

```sql
-- Atəşgah Sığorta üçün əsas biznes KPI: Məhsullar üzrə Loss Ratio
SELECT 
    p.product_name,
    COUNT(DISTINCT p.policy_id) AS total_policies,
    SUM(p.premium_amount) AS total_premium_collected,
    COALESCE(SUM(c.claim_payout), 0) AS total_claims_paid,
    -- Loss Ratio faizi:
    ROUND(
        (COALESCE(SUM(c.claim_payout), 0) * 100.0) / NULLIF(SUM(p.premium_amount), 0),
        2
    ) AS loss_ratio_percent
FROM core.dim_policy p
LEFT JOIN core.fact_claims c ON p.policy_id = c.policy_id
GROUP BY p.product_name
ORDER BY loss_ratio_percent DESC;
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: Loss Ratio (Zərərlilik nisbəti) 115% olarsa, bu nə deməkdir?
<!-- answer-start -->
**Cavab:** Bu o deməkdir ki, şirkət həmin sığorta növündən (məsələn, KASKO) topladığı hər 100 manat sığorta haqqına qarşılıq 115 manat qəza kompensasiyası ödəyib, yəni birbaşa zərərlə işləyir. Anderraytinq tarifləri təcili artırılmalı və ya risk qəbulu sərtləşdirilməlidir.
<!-- answer-end -->

#### Sual 2: Sığorta cədvəllərində niyə `claim_date BETWEEN policy_start AND policy_end` yoxlanışı kritikdir?
<!-- answer-start -->
**Cavab:** Çünki sığorta şirkəti yalnız müqavilənin qüvvədə olduğu müddətdə baş vermiş hadisələrə görə ödəniş edir. Əgər qəza polisin müddəti bitdikdən sonra baş veribsə, bu sistemdə saxtakarlıq və ya məlumat daxiletmə xətasıdır.
<!-- answer-end -->
