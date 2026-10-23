---
id: "11-nosql-and-rest-apis"
slug: "nosql-ve-rest-apiler"
order: 11
title: "NoSQL Verilənlər Bazaları & REST API İnqestiyası"
category: "İnteqrasiya"
priority: "medium"
readiness: "orta"
vacancyLink: "SQL və NoSQL verilənlər bazalarından, xarici API-lərdən məlumatların çəkilməsi"
tags: ["NoSQL", "MongoDB", "Redis", "REST API", "JSON Flattening", "CAP Teoremi"]
summary: "Sənəd və Key-Value bazaları, CAP teoremi, REST API çəkmələrində pagination və rate limit, JSON flattening."
---

# NoSQL Verilənlər Bazaları & REST API İnqestiyası

## 1. Qısa Xülasə (150-250 Söz)

Relyasion bazalar sərt cədvəl sxemi tələb etdiyi halda, NoSQL sistemləri yüksək çeviklik, sürət və horizontal miqyaslanma üçün fərqli modellər təklif edir. Əsas növlər: JSON formatlı yarı-strukturlaşdırılmış sənədləri saxlayan **Document Store** (MongoDB), RAM-da çalışan və mikrosaniyəlik keşləmə təmin edən **Key-Value Store** (Redis) və böyük analitik sütun bazalarıdır.

Paylanmış sistemlərdə **CAP Teoreminə** görə sistem eyni vaxtda üç şərtdən (Consistency, Availability, Partition Tolerance) yalnız ikisini tam təmin edə bilər. Şəbəkə kəsintiləri qaçılmaz olduğundan (P), NoSQL bazaları adətən ya C (MongoDB), ya da A (Cassandra/CouchDB) tərəfini seçir.

Data Engineering-də xarici REST API-lərdən və NoSQL-dən məlumat çəkərkən iki əsas problem həll olunur: **Pagination** (səhifələmə ilə bütün datanı çəkmək və rate limiti aşmamaq) və **JSON Flattening** (daxili iç-içə massivləri və obyektləri analitik cədvəl üçün yastı sütunlara çevirmək). Xammal JSON əvvəlcə Bronze qatına atılır, sonra PySpark ilə strukturlaşdırılır.

## 2. Praktik Kod Nümunəsi

```python
import json
import pandas as pd

# İç-içə (nested) sığorta JSON cavabını analitik cədvələ çevirmək (Flattening):
nested_api_response = {
    "policy_id": "POL-99",
    "customer": {"name": "Elmar", "city": "Bakı"},
    "coverages": [
        {"type": "KASKO", "limit": 50000},
        {"type": "Tibb", "limit": 10000}
    ]
}

# pandas.json_normalize ilə massivləri açmaq:
df = pd.json_normalize(
    nested_api_response, 
    record_path=['coverages'], 
    meta=['policy_id', ['customer', 'name'], ['customer', 'city']]
)
print(df[['policy_id', 'customer.name', 'type', 'limit']])
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: CAP teoreminə görə bir paylanmış sistem eyni anda həm Consistency, həm Availability, həm də Partition Tolerance təmin edə bilərmi?
<!-- answer-start -->
**Cavab:** Xeyr. Şəbəkə paylanması (Partition Tolerance) fiziki reallıq olduğundan, sistem kəsinti anında ya ardıcıllığı (Consistency - sorğuları xəta ilə rədd etmək), ya da əlçatanlığı (Availability - köhnə məlumat olsa belə cavab qaytarmaq) seçməlidir.
<!-- answer-end -->

#### Sual 2: Xarici REST API-dən məlumat çəkərkən HTTP 429 status kodu nəyi bildirir və necə idarə olunmalıdır?
<!-- answer-start -->
**Cavab:** HTTP 429 'Too Many Requests' deməkdir, yəni API provayderinin sorğu limiti (rate limit) aşılıb. Dərhal ardıcıl sorğular dayandırılmalı, eksponensial fasilə (exponential backoff) verilməli və 'Retry-After' başlığına uyğun gözlənilməlidir.
<!-- answer-end -->
