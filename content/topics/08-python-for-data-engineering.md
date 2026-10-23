---
id: "08-python-for-data-engineering"
slug: "python-data-engineering-ucun"
order: 8
title: "Data Engineering üçün Python Əsasları"
category: "Proqramlaşdırma"
priority: "high"
readiness: "guclu"
vacancyLink: "Məlumatların emalı, kənar sistemlərlə inteqrasiya, avtomatlaşdırma və ETL boru kəmərlərinin Python ilə qurulması"
tags: ["Python", "Generators", "yield", "SQLAlchemy", "Connection Pool", "Decorators", "GIL", "Asyncio", "Pydantic"]
summary: "Generatorlar və yaddaş qənaəti, @retry dekoratorları, SQLAlchemy Connection Pool, GIL və paralellik (Threading vs Multiprocessing), Context Managers və xəta idarəsi."
---

# Data Engineering üçün Python Əsasları

## 1. Qısa İzah və Analogiya

Python Data Mühəndisliyində boru kəmərlərinin (ETL/ELT) avtomatlaşdırılması, REST API-lərdən məlumatların çəkilməsi, təmizlənməsi və verilənlər bazalarına köçürülməsi üçün universal əsas dildir. Lakin Data Engineering üçün Python sadəcə skript yazmaq deyil; ən vacib prinsip **Yaddaş Qənaəti (Memory Efficiency)** və **Davamlılıqdır (Fault Tolerance)**.

> [!NOTE]
> **Analogiya:** Təsəvvür edin ki, bir göldən (böyük fayl və ya baza) digər hovuza 10 ton su köçürməlisiniz. Əgər bütün suyu nəhəng bir çənə yığıb bir dəfəyə qaldırmağa cəhd etsəniz (məsələn, bütün 10 GB CSV-ni Python `list`-ə oxumaq), kran qırılar və sistem çökər (`MemoryError: Out Of Memory`). Mühəndislik yanaşması isə **boru xətti çəkməkdir (Generator & `yield`)**: su fasiləsiz axır, yaddaşda hər an yalnız bir stəkan su qalır və sistem heç vaxt aşmır.

Data Mühəndisi Python-da xətti kodlar əvəzinə təkrar istifadə olunan modullar, avtomatik təkrar cəhd (**Retry**) mexanizmləri və sızmayan baza bağlantıları (**Connection Pools**) qurmalıdır.

---

## 2. Əsas Anlayışlar və Memarlıq Detalları

### 2.1. Yaddaş İdarəsi: Generatorlar, `yield` və Iterators

Böyük fayllarla işləyərkən ən böyük səhv bütün sətirləri yaddaşa yığan `list comprehension` istifadə etməkdir:

- **List (`[...]`):** Bütün elementləri dərhal RAM-da yaradır və saxlayır ($O(n)$ yaddaş).
- **Generator (`(...)` və ya `yield`):** Dəyərləri əvvəlcədən yaddaşda saxlamır. Hər çağırışda yalnız növbəti elementi hesablayıb təqdim edir (**Lazy Evaluation**, $O(1)$ yaddaş).

#### List vs Generator Yaddaş Müqayisəsi

| Xüsusiyyət | Python Siyahısı (`List`) | Generator (`yield` / Generator Expression) |
| :--- | :--- | :--- |
| **Yaddaş Tələbi (RAM)** | $O(n)$ — 10 milyon sətir üçün ~1–2 GB RAM tələb edir. | **$O(1)$ — Element sayından asılı olmayaraq sabit bir neçə bayt!** |
| **Hesablama Vaxtı** | Əvvəlcədən bütün siyahı hesablanıb qurtarmalıdır. | Tələb olunduqca anında icra olunur (`next()`). |
| **Təkrar İstifadə** | Dəfələrlə oxuna və indekslənə bilər (`list[0]`). | **Birdəfəlikdir (Exhausted)!** Dövrə bitdikdən sonra boş qalır. |
| **Uyğun Ssenari** | Kiçik konfiqurasiyalar və tez-tez axtarış tələb olunan siyahılar. | Nəhəng CSV/JSON faylları, baza kursorları və API səhifələməsi. |

---

### 2.2. Dekoratorlar və ETL İdarəsi (`@retry`, `@timer`)

Data boru kəmərlərində xarici sistemlərlə (API-lər, verilənlər bazası, bulud anbarı) əlaqə qurarkən şəbəkə qırılmaları və keçici xətalar (Transient Faults) qaçılmazdır. Hər funksiyanın içinə təkrar-təkrar `try...except` və `while` yazmamaq üçün **Dekoratorlardan** istifadə olunur.

Dekorator mövcud funksiyanın kodunu dəyişmədən onun davranışını genişləndirən xüsusi funksiyadır:
- `@retry`: Xəta baş verdikdə funksiyanı eksponensial geri çəkilmə (Exponential Backoff) ilə təkrar işə salır.
- `@timer`: Funksiyanın icra müddətini hesablayıb loqlara qeyd edir (Profiling).
- `@functools.wraps`: Orijinal funksiyanın adını (`__name__`) və sənədləşməsini (`__doc__`) qorumaq üçün məcburidir.

---

### 2.3. Verilənlər Bazası Əlaqələri: SQLAlchemy Connection Pooling

Verilənlər bazasına hər sorğu göndərəndə sıfırdan TCP və SSL bağlantısı yaratmaq (Handshake) çox bahalı əməliyyatdır və bazanın `max_connections` limitini tez tükəndirir.

**SQLAlchemy Connection Pool** mühərriki açılmış bağlantıları bağlamır, onları xüsusi hovuzda saxlayır. Sorğu gəldikdə hovuzdan hazır bağlantı götürülür, iş bitdikdə isə hovuza qaytarılır.

| Parametr | Təyinatı | İstehsalat Tövsiyəsi |
| :--- | :--- | :--- |
| `pool_size` | Hovuzda hər zaman açıq saxlanılan sabit bağlantı sayı. | 5–10 (Worker başına) |
| `max_overflow` | Yüksək yüklənmə anında əlavə açıla bilən maksimum bağlantı sayı. | 10–20 |
| `pool_timeout` | Bütün bağlantılar məşğul olduqda yeni sorğunun gözləmə müddəti (saniyə). | 30 saniyə |
| `pool_recycle` | Köhnə bağlantıların baza tərəfindən kəsilməməsi üçün vaxtaşırı yenilənməsi. | 1800 saniyə (30 dəqiqə) |
| `pool_pre_ping=True` | **Çox kritik parametr!** Bağlantını istifadəyə verməzdən əvvəl `SELECT 1` göndərib canlı olduğunu yoxlayır. | **Həmişə True olmalıdır** |

> [!WARNING]
> Baza bağlantılarını heç vaxt əl ilə açıb qoymayın. Həmişə **Context Manager (`with engine.connect() as conn:`)** istifadə edin. `with` bloku bitdikdə xəta baş versə belə bağlantı avtomatik hovuza qaytarılır və Connection Leak-in qarşısı alınır.

---

### 2.4. Python-da Paralellik: Threading vs Multiprocessing vs Asyncio və GIL

Python-un standart CPython icra mühərrikində **GIL (Global Interpreter Lock)** mövcuddur. GIL eyni vaxtda yalnız bir yerli OS ipinin (thread) Python baytkodunu icra etməsinə icazə verir.

| Model | GIL Təsiri | Ən Yaxşı İstifadə Ssenarisi | Nümunə Kitabxana |
| :--- | :--- | :--- | :--- |
| **Multithreading (`threading`)** | GIL səbəbindən eyni vaxtda yalnız 1 CPU nüvəsi işləyir. | **I/O-Bound əməliyyatlar:** Diskdən oxuma, fayl endirmə, bazanı gözləmə. | `concurrent.futures.ThreadPoolExecutor` |
| **Multiprocessing (`multiprocessing`)** | **GIL-i aşır!** Hər prosesin öz ayrıca Python interpretatoru və RAM-ı var. | **CPU-Bound əməliyyatlar:** Böyük məlumat heşləmə, şifrələmə, riyazi hesablamalar. | `multiprocessing.Pool`, `ProcessPoolExecutor` |
| **Asynchronous (`asyncio`)** | Tək ip (single-thread), kooperativ multitasking (Event Loop). | **Yüksək şəbəkə I/O:** Eyni anda 1000-lərlə kənar REST API endpoint-inə sorğu atmaq. | `httpx`, `aiohttp` |

---

## 3. Praktik Python Kod Nümunələri

### 3.1. Generator ilə Nəhəng Fayl Oxuma və SQLAlchemy Connection Pool

```python
# Dialect: Python (Python 3.10+)
import time
import logging
from typing import Generator, Dict, Any, List
from functools import wraps
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataPipeline")

# 1. Eksponensial Geri Çəkilmə ilə İstehsalat @retry Dekoratoru
def retry_with_backoff(retries: int = 3, backoff_in_seconds: int = 2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 1
            delay = backoff_in_seconds
            while attempt <= retries:
                try:
                    return func(*args, **kwargs)
                except Exception as err:
                    if attempt == retries:
                        logger.error(f"'{func.__name__}' üçün bütün {retries} cəhd uğursuz oldu: {err}")
                        raise
                    logger.warning(f"Xəta: {err}. {delay} saniyə sonra təkrar cəhd {attempt + 1}/{retries}...")
                    time.sleep(delay)
                    delay *= 2  # Eksponensial artım: 2s -> 4s -> 8s
                    attempt += 1
        return wrapper
    return decorator

# 2. Generator: Nəhəng sığorta faylını sətirbəsətir yaddaşı doldurmadan oxumaq
def stream_insurance_records(file_path: str) -> Generator[Dict[str, Any], None, None]:
    with open(file_path, mode="r", encoding="utf-8") as f:
        header = [col.strip() for col in f.readline().split(",")]
        for line in f:
            values = [val.strip() for val in line.split(",")]
            if len(values) == len(header):
                row_dict = dict(zip(header, values))
                # Sadə təmizləmə və filtrləmə
                if row_dict.get("policy_id"):
                    yield row_dict

# 3. SQLAlchemy Connection Pooling və Toplu Yazılış (Batch Insert)
DATABASE_URL = "postgresql://elmar:secret@localhost:5432/ateshgah_dwh"

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,      # Ölü bağlantıları avtomatik bərpa edir
    pool_recycle=1800
)

@retry_with_backoff(retries=3, backoff_in_seconds=2)
def insert_batch_policies(batch: List[Dict[str, Any]]) -> None:
    if not batch:
        return
    query = text("""
        INSERT INTO core.stg_policies (policy_id, customer_id, premium_amount, issue_date)
        VALUES (:policy_id, :customer_id, :premium_amount, :issue_date)
        ON CONFLICT (policy_id) DO NOTHING;
    """)
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(query, batch)
    logger.info(f"{len(batch)} ədəd sığorta polisi uğurla bazaya yazıldı.")
```

---

## 4. Tez-tez Edilən Səhvlər və Həll Yolları

### Səhv 1: Dəyişkən Standart Arqumentlər (Mutable Default Arguments)
- **Problem:** `def process_records(record, records_list=[])` yazdıqda `records_list` funksiya hər çağırılanda yenidən yaradılmır; funksiyanın obyektində tək bir siyahı kimi qalır və köhnə məlumatlar yeni çağırışlara qarışır.
- **Həll Yolu:**
  ```python
  def process_records(record, records_list=None):
      if records_list is None:
          records_list = []
      records_list.append(record)
      return records_list
  ```

### Səhv 2: Generatorun Bitməsi (Exhausted Generator)
- **Problem:** Generator funksiyasından çıxan nəticəni `len(gen)` və ya iki fərqli `for` dövrəsində oxumağa çalışmaq. İlk dövrədən sonra generator boşalır və ikinci dövrə heç bir sətir emal etmir.
- **Həll Yolu:** Əgər eyni məlumat bir neçə dəfə oxunmalıdırsa, ya fayl kursorunu yenidən açın, ya da `itertools.tee(gen, 2)` vasitəsilə generatoru iki müstəqil axına bölün.

### Səhv 3: Connection Leak (Bağlantı Sızması)
- **Problem:** `conn = engine.connect()` yazıb sonda `conn.close()` çağırmaq. Əgər aradakı sorğuda SQL sintaksis xətası baş verərsə, `conn.close()` icra olunmur və bağlantı açıq qalır. 100 belə xətadan sonra baza bağlantı qəbul etmir (`too many clients already`).
- **Həll Yolu:** Həmişə `with engine.connect() as conn:` kontekstindən istifadə edin.

---

## 5. Vakansiya ilə Əlaqə və Müsahibədə Yanaşma (Atəşgah Sığorta)

Atəşgah Sığortada kənar sığorta agentlikləri, bank tərəfdaşları və Dövlət İcbari Sığorta Bürosu (İSB) ilə API inteqrasiyaları mühüm yer tutur. Data Mühəndisi bu xarici sistemlərdən məlumatları fasiləsiz çəkən, xəta olduqda avtomatik təkrar yoxlayan və verilənlər bazasına təhlükəsiz köçürən Python skriptləri qurmalıdır.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən Python-u yalnız verilənləri çevirmək üçün deyil, bütöv və dözümlü ETL servisləri qurmaq üçün istifadə edirəm. 
> 
> Əsas yanaşmalarım:
> 1) **Yaddaş optimizasiyası:** Böyük faylları və API axınlarını RAM-a doldurmamaq üçün `generator` və `yield` arxitekturasından istifadə edirəm.
> 2) **Şəbəkə dözümlülüyü:** Kənar API və DB bağlantılarında mütləq eksponensial geri çəkilməli `@retry` mexanizmləri qururam.
> 3) **Resurs təhlükəsizliyi:** Baza əlaqələrində `SQLAlchemy Connection Pool` və `pool_pre_ping=True` tətbiq edərək bağlantı sızmalarının və 'ölü socket' xətalarının qarşısını alıram."

---

## 6. 3 Suallıq İnteraktiv Mini-Quiz

#### Sual 1: `yield` açar sözü funksiyanın daxilində nə edir və Generator-un `return`-dən fərqi nədir?
<!-- answer-start -->
**Cavab:** `return` funksiyanın icrasını tam dayandırır, nəticəni qaytarır və lokal dəyişənləri yaddaşdan silir. `yield` isə hesablanmış dəyəri çağırana qaytarır, lakin funksiyanın vəziyyətini (state, lokal dəyişənlər və kod sətirini) dondurur. Növbəti dəfə `next()` çağırılanda funksiya sıfırdan başlamır, məhz `yield`-dən sonrakı sətirdən davam edir.
<!-- answer-end -->

#### Sual 2: SQLAlchemy-də `pool_pre_ping=True` parametri nə üçündür və şəbəkə qırılmalarında necə qoruyur?
<!-- answer-start -->
**Cavab:** Verilənlər bazası və ya firewall müəyyən müddət hərəkətsiz (idle) qalan TCP bağlantılarını birtərəfli bağlaya bilər. Əgər bu parametr olmasa, tətbiq hovuzdakı ölü bağlantı ilə sorğu göndərməyə çalışar və `OperationalError: SSL connection has been closed unexpectedly` xətası ilə çökər. `pool_pre_ping=True` parametri bağlantını tətbiqə verməzdən əvvəl arxa planda sürətli yoxlama sorğusu (`SELECT 1`) göndərir; əgər əlaqə ölüdürsə, onu dərhal atıb təzə bağlantı açır.
<!-- answer-end -->

#### Sual 3: Python-da 100 fərqli sığorta filialının REST API-dən eyni vaxtda məlumat çəkmək üçün `multiprocessing`, yoxsa `asyncio`/`threading` daha uyğundur?
<!-- answer-start -->
**Cavab:** **`asyncio` və ya `threading`** qat-qat daha uyğundur. Çünki REST API çağırışları **I/O-Bound** (şəbəkə gözləməsi) əməliyyatıdır; vaxtın 99%-i uzaq serverin cavabını gözləməklə keçir və CPU yükü demək olar ki, sıfırdır. `multiprocessing` hər filial üçün ayrı OS prosesi və ayrıca RAM açdığı üçün sistem resurslarını boş yerə tükədər. `asyncio` isə tək bir nüvədə minlərlə sorğunu asinxron idarə edir.
<!-- answer-end -->
