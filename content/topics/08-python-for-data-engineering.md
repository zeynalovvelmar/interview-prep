---
id: "08-python-for-data-engineering"
slug: "python-data-engineering-ucun"
order: 8
title: "Data Engineering üçün Python Əsasları"
category: "Proqramlaşdırma"
priority: "high"
readiness: "guclu"
vacancyLink: "Məlumatların emalı, avtomatlaşdırılması və ETL boru kəmərlərinin qurulması üçün Python"
tags: ["Python", "Generators", "Pandas", "SQLAlchemy", "Decorators", "GIL", "Logging"]
summary: "Generatorlar və yield, yaddaş optimizasiyası, dekoratorlar, verilənlər bazası bağlantıları və REST API çəkmələri."
---

# Data Engineering üçün Python Əsasları

## 1. Qısa Xülasə (150-250 Söz)

Python Data Mühəndisliyində boru kəmərlərinin (ETL/ELT) avtomatlaşdırılması, kənar API-lərdən məlumatların çəkilməsi və verilənlər bazaları arasında körpü yaradılması üçün əsas proqramlaşdırma dilidir. Sadə skript yazmaqla yanaşı, DE üçün ən vacib prinsip **resurs və yaddaş qənaəti** (memory efficiency) təmin etməkdir.

Böyük fayllarla işləyərkən bütün məlumatı `list`-ə oxumaq RAM-ı doldurur (OOM xətası). Bunun qarşısını almaq üçün **Generatorlar** və `yield` açar sözündən istifadə olunur; generator sətirləri tək-tək (stream) oxuyur və yaddaşı boş saxlayır. Sürətli axtarış üçün isə $O(n)$ xərcli siyahı yerinə $O(1)$ xərcli `set` və `dict` heş strukturları seçilir.

Verilənlər bazasına qoşularkən hər sorğu üçün sıfırdan TCP bağlantısı açmamaq məqsədilə **SQLAlchemy Connection Pooling** tətbiq olunur. Boru kəmərlərində xətaların idarəsi üçün `@retry` və icra vaxtını ölçən `@timer` kimi **Dekoratorlar** yazılır. Python-un daxili **GIL (Global Interpreter Lock)** məhdudiyyətinə görə CPU-ağır işlərdə `multiprocessing`, şəbəkə və I/O gözləmələrində isə `threading` və ya `asyncio` tətbiq edilir.

## 2. Praktik Kod Nümunəsi

```python
import time
import requests
from functools import wraps

# ETL üçün avtomatik təkrar cəhd (Retry) dekoratoru
def retry(max_attempts=3, delay_sec=2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as err:
                    attempts += 1
                    print(f"Xəta baş verdi: {err}. Cəhd {attempts}/{max_attempts}...")
                    time.sleep(delay_sec)
            raise RuntimeError(f"{func.__name__} {max_attempts} cəhddən sonra uğursuz oldu!")
        return wrapper
    return decorator

@retry(max_attempts=3, delay_sec=1)
def fetch_insurance_rates():
    resp = requests.get("https://api.ateshgah.com/v1/rates", timeout=5)
    resp.raise_for_status()
    return resp.json()
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: 10 Giqabaytlıq CSV faylını emal edərkən niyə list comprehension əvəzinə generator expression istifadə edilməlidir?
<!-- answer-start -->
**Cavab:** List comprehension bütün 10GB-ı dərhal RAM yaddaşına yükləməyə çalışır və yaddaş çatışmazlığı (MemoryError/OOM) yaradır. Generator isə `yield` məntiqi ilə hər dəfə yalnız tələb olunan cari sətiri yaddaşda saxlayır və RAM-a demək olar ki, yük salmır.
<!-- answer-end -->

#### Sual 2: Python-da Connection Pooling nə üçün lazımdır?
<!-- answer-start -->
**Cavab:** Hər bir DB sorğusunda TCP və SSL bağlantısı açmaq böyük vaxt itkisi yaradır və bazanın bağlantı limitini (`max_connections`) tez doldurur. Connection Pool hazır bağlantıları açıq saxlayır və onları təkrar istifadəyə verərək performansı dəfələrlə artırır.
<!-- answer-end -->
