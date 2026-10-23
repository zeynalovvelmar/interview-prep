---
id: "09-apache-airflow-orchestration"
slug: "apache-airflow-orkestrasiya"
order: 9
title: "Apache Airflow ilə İş Axınlarının Orkestrasiyası"
category: "Orkestrasiya"
priority: "high"
readiness: "guclu"
vacancyLink: "Apache Airflow vasitəsilə ETL/ELT boru kəmərlərinin planlaşdırılması, idarə edilməsi, monitorinqi və avtomatlaşdırılması"
tags: ["Airflow", "DAG", "Scheduler", "Idempotency", "XCom", "Sensors", "TaskFlow", "Backfill", "Catchup"]
summary: "Airflow memarlığı, Workflows as Code, İdempotent DAG dizaynı, {{ ds }} və Backfill, poke vs reschedule sensorları, TaskFlow API və XCom məhdudiyyətləri."
---

# Apache Airflow ilə İş Axınlarının Orkestrasiyası

## 1. Qısa İzah və Analogiya

Data mühəndisliyində onlarla fərqli tapşırıq (faylları S3-dən yükləmək, təmizləmək, modelləşdirmək, hesabat çıxarmaq) bir-birindən asılı şəkildə müəyyən qrafiklə işləməlidir. Köhnə dövrlərdə istifadə olunan sadə Linux `cron` cədvəlləri mürəkkəb asılılıqları (Dependencies), tapşırıq xətalarını, təkrar cəhdləri (**Retries**) və monitorinqi idarə edə bilmir.

**Apache Airflow** məlumat boru kəmərlərini kod kimi (**Workflows as Code**) Python-da tərtib edən, planlayan və izləyən sənaye standartı orkestrasiya platformasıdır.

> [!NOTE]
> **Analogiya:** Airflow-u beynəlxalq hava limanının **Dispetçer Qülləsinə (Scheduler)** bənzətmək olar. Təyyarələr (ETL tapşırıqları) havaya qalxmazdan əvvəl yanacaq doldurulmalı, sərnişinlər minməli və uçuş zolağı boşalmalıdır (Asılılıqlar zənciri). Əgər hava dumanlıdırsa (məlumat faylı hələ hazır deyilsə), dispetçer təyyarəni gözləmə xəttinə çəkir (**Sensor**); nasazlıq olarsa dərhal ehtiyat təyyarə ayırır (**Retry**). Bütün proses dispetçer panelində (**Webserver UI**) canlı görünür.

Airflow məlumatın özünü emal edən bir mühərrik (Execution Engine) deyil; o, digər mühərriklərin (Spark, SQL Server, PostgreSQL, dbt, Bash) nə vaxt və hansı ardıcıllıqla işləyəcəyini idarə edən **orkestratorudur**.

---

## 2. Əsas Anlayışlar və Memarlıq Detalları

```
  ┌──────────────────────────────────────────────────────────────┐
  │                        WEB SERVER                            │
  │            (UI Paneli, DAG Statusları, Loqlar)               │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────┐
  │                     METADATA DATABASE                        │
  │        (PostgreSQL: DAG qrafikləri, Task statusları, XCom)   │
  └──────────────────────────────▲───────────────────────────────┘
                                 │
  ┌──────────────────────────────┴───────────────────────────────┐
  │                         SCHEDULER                            │
  │     (DAG qovluğunu oxuyur, tapşırıqları növbəyə qoyur)       │
  └──────────────┬───────────────────────────────┬───────────────┘
                 │                               │
                 ▼                               ▼
      ┌─────────────────────┐         ┌─────────────────────┐
      │   CELERY / K8S      │         │     TRIGGERER       │
      │   EXECUTOR WORKERS  │         │   (Asinxron sensor  │
      │  (Fiziki Task İcrası)│         │     və təxirəsalma) │
      └─────────────────────┘         └─────────────────────┘
```

### 2.1. Airflow Memarlıq Komponentləri

| Komponent | Əsas Rolu və Məsuliyyəti | Kritik İstehsalat Qaydası |
| :--- | :--- | :--- |
| **Scheduler** | Bütün iş axınlarının ürəyidir. DAG-ları təhlil edir, asılılıqları yoxlayır və vaxtı çatmış tapşırıqları icraya göndərir. | Çoxlu Scheduler quraşdırılaraq High Availability (HA) təmin edilməlidir. |
| **Metadata Database** | Airflow-un bütün vəziyyətini (state), icra tarixçəsini, istifadəçiləri və XCom-u saxlayan PostgreSQL relyasion bazasıdır. | Scheduler-in ləngiməməsi üçün baza mütəmadi olaraq təmizlənməlidir (`airflow db clean`). |
| **Webserver** | Mühəndislərə boru kəmərlərini vizual görmək, loqları oxumaq və düymə ilə işə salmaq imkanı verən Flask veb tətbiqidir. | Yalnız monitorinq üçündür; Webserver sönsə belə boru kəmərləri dayanmır. |
| **Worker / Executor** | Tapşırıqların fiziki kodunu icra edən hesablama qovşaqlarıdır (`CeleryExecutor` və ya `KubernetesExecutor`). | İstehsalatda heç vaxt `SequentialExecutor` (SQLite) istifadə olunmur! |
| **Triggerer** | Asinxron (Deferrable) sensorları tək bir prosesdə gözlədərək worker resurslarını azad edən xidmətdir. | Uzunmüddətli fayl və ya sorğu gözləmələri üçün vacibdir. |

---

### 2.2. DAG Strukturu və Ən Yaxşı Təcrübələr

Airflow-da iş axını **DAG (Directed Acyclic Graph — Yönləndirilmiş Dövrəsiz Qraf)** adlanır:
- **Yönləndirilmiş (Directed):** Tapşırıqlar dəqiq istiqamət üzrə icra olunur (`A >> B >> C`).
- **Dövrəsiz (Acyclic):** Qrafikdə heç vaxt sonsuz dövrə (Loop: `A >> B >> A`) ola bilməz.

#### DAG Yazılışında Qızıl Qaydalar
1. **Top-Level Code Qadağası:** DAG faylının əsas gövdəsində (task funksiyalarından kənarda) heç vaxt verilənlər bazasına sorğu göndərməyin, HTTP API çağırmayın və ya böyük kitabxana yükləməyin. Çünki Scheduler hər 30 saniyədən bir bütün DAG fayllarını sıfırdan oxuyur; xarici çağırışlar Scheduler-i iflic edir.
2. **`catchup=False` Tənzimləməsi:** Əgər DAG-ın başlama tarixi (`start_date`) 1 il əvvələ qoyulubsa və `catchup=True` olarsa, Airflow keçmiş 365 gün üçün eyni anda yüzlərlə iş axını başladaraq sistemi çökdürər.

---

### 2.3. İdempotentlik və `{{ ds }}` Parametri

Data Engineering-də ən kritik keyfiyyət meyarı **İdempotentlikdir**: Eyni tapşırıq eyni giriş parametrləri ilə 1 dəfə və ya 10 dəfə işlədilməsindən asılı olmayaraq, sistemin son vəziyyəti dəyişməməli və bazada heç vaxt dublikat yaranmamalıdır.

> [!WARNING]
> **Heç vaxt `datetime.now()` istifadə etməyin!**
> Əgər ETL skriptiniz cari sistem saatını (`datetime.today()`) götürürsə, keçmiş 3 günün xətalı məlumatını yenidən hesablamaq (Backfill) qeyri-mümkün olacaqdır; çünki skript həmişə bugünkü tarixi emal edəcəkdir.

Həll: Həmişə Airflow-un təqdim etdiyi məntiqi icra tarixindən — **`{{ ds }}`** (format: `YYYY-MM-DD`) istifadə edin:
```sql
-- İdempotent yazılış: Əvvəlcə həmin günün məlumatı təmizlənir, sonra yazılır
DELETE FROM core.fact_daily_claims WHERE claim_date = '{{ ds }}';
INSERT INTO core.fact_daily_claims (...) SELECT ... WHERE claim_date = '{{ ds }}';
```

---

### 2.4. XCom və Müasir TaskFlow API (`@task`)

**XCom (Cross-Communication):** Tapşırıqlar arasında kiçik məlumat parçalarını (məsələn, status kodu, generasiya olunmuş fayl adı, cərgə sayı) ötürmək üçün daxili mexanizmdir.

- **Məhdudiyyət:** XCom məlumatları birbaşa Airflow-un PostgreSQL metadata bazasında saxlayır. Buna görə də XCom vasitəsilə böyük DataFrame, nəhəng JSON və ya fayl məzmunu ötürmək qəti qadağandır!
- **Düzgün Naxış (Pattern):** Məlumatı S3/MinIO-ya Parquet kimi yazın, XCom-da isə yalnız həmin faylın ünvanını (`s3://bucket/data_2026_10_24.parquet`) növbəti taska ötürün.

Airflow 2.0+ ilə gələn **TaskFlow API** ənənəvi `PythonOperator` əvəzinə təmiz Python funksiyalarını `@task` dekoratoru ilə birbaşa DAG tapşırığına çevirir.

---

### 2.5. Sensorlar: Poke vs Reschedule Rejimi

Sensor xarici hadisənin baş verməsini (məsələn, S3-ə faylın yüklənməsini, cədvələ yeni sətirlərin gəlməsini) gözləyən xüsusi tapşırıq növüdür (`FileSensor`, `SqlSensor`, `S3KeySensor`).

| Rejim (`mode`) | İş Mexanizmi | Problem / Üstünlük | Nə Vaxt Seçilməlidir? |
| :--- | :--- | :--- | :--- |
| **`mode="poke"` (Default)** | Tapşırıq bütün gözləmə müddətində Worker slotunu (CPU/RAM) tutub saxlayır və hər 60 saniyədən bir yoxlayır. | **Worker Starvation:** Əgər 10 sensor 2 saat fayl gözləyirsə, klasterin bütün işçi slotları tükənir və digər real ETL işləri növbədə ilişib qalır! | Yalnız gözləmə müddətinin 1–2 dəqiqədən az olduğuna əmin olduqda. |
| **`mode="reschedule"`** | Yoxlama aparır; fayl hazır deyilsə, Worker slotunu dərhal azad edir (Up for reschedule) və növbəti yoxlamaya qədər yatır. | **Resurs dostudur!** Digər tapşırıqlar həmin worker slotunda rahat işləyir. | **İstehsalatda demək olar ki, həmişə bu rejim seçilməlidir.** |

---

## 3. Praktik Airflow DAG Kod Nümunəsi

### 3.1. Sığorta Məlumatlarının İdempotent TaskFlow Boru Kəməri

```python
# Dialect: Apache Airflow (Python 3.10+ / Airflow 2.8+)
from datetime import datetime, timedelta
from airflow.decorators import dag, task
from airflow.sensors.filesystem import FileSensor

# Standart DAG tənzimləmələri
default_args = {
    "owner": "elmar",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=1)
}

@dag(
    dag_id="ateshgah_daily_claims_pipeline",
    default_args=default_args,
    description="Gündəlik sığorta iddialarının S3-dən qəbulu və DWH-a yüklənməsi",
    schedule="0 2 * * *",              # Hər gecə saat 02:00-da (UTC)
    start_date=datetime(2026, 1, 1),
    catchup=False,                     # Keçmiş günləri kütləvi işə salmamaq üçün
    max_active_runs=1,                 # Eyni vaxtda yalnız 1 icra icazəlidir
    tags=["insurance", "claims", "production"]
)
def claims_processing_pipeline():

    # 1. Sensor: Gecə gəlməli olan xammal faylını yoxlamaq (reschedule rejimində!)
    wait_for_claims_file = FileSensor(
        task_id="wait_for_claims_csv",
        filepath="/opt/airflow/landing/claims_{{ ds }}.csv",
        poke_interval=120,             # Hər 2 dəqiqədən bir yoxla
        timeout=3600,                  # Maksimum 1 saat gözlə
        mode="reschedule"              # Worker slotunu dondurmur!
    )

    # 2. Xammal məlumatın təmizlənməsi və S3/MinIO-ya yazılması
    @task
    def process_and_clean_claims(ds: str = None) -> str:
        """
        'ds' parametri vasitəsilə icra günü təyin olunur (İdempotentlik).
        Nəticə olaraq XCom-a yalnız fayl yolu ötürülür, böyük data yox!
        """
        import os
        source_file = f"/opt/airflow/landing/claims_{ds}.csv"
        target_s3_path = f"s3a://insurance-lakehouse/silver/claims/year={ds[:4]}/date={ds}/data.parquet"
        
        # Simulyasiya: Məlumat oxunur, təmizlənir və Parquet kimi yazılır
        print(f"[{ds}] üçün xammal fayl emal edilir: {source_file}")
        print(f"Təmiz məlumat S3-ə köçürülür: {target_s3_path}")
        
        return target_s3_path

    # 3. PostgreSQL DWH-da analitik cədvəlin idempotent yenilənməsi
    @task
    def load_to_postgres_dwh(s3_path: str, ds: str = None) -> None:
        print(f"[{ds}] DWH yükləməsi başlayır. Mənbə fayl: {s3_path}")
        # İdempotent strategiya: Həmin günün köhnə məlumatı silinir və yenisi yazılır
        sql_statement = f"""
            DELETE FROM core.fact_claims WHERE claim_date = '{ds}';
            -- INSERT INTO core.fact_claims SELECT ... FROM external_s3_table;
        """
        print(f"İcra olunan SQL: {sql_statement}")

    # Tapşırıqlar arası asılılıq zənciri (Dependencies)
    s3_output_path = process_and_clean_claims()
    wait_for_claims_file >> s3_output_path >> load_to_postgres_dwh(s3_output_path)

# DAG instansiyasının yaradılması
claims_dag = claims_processing_pipeline()
```

---

## 4. Tez-tez Edilən Səhvlər və Həll Yolları

### Səhv 1: Top-Level Code Parsing Overhead
- **Problem:** DAG faylının başında `import pandas`, `engine.connect()` və ya `requests.get()` yazmaq. Scheduler hər 30 saniyədən bir bu faylı sintaksis analizindən keçirəndə CPU 100%-ə qalxır və digər DAG-lar gecikir.
- **Həll Yolu:** Ağır kitabxanaları (`pandas`, `pyspark`, `requests`) və şəbəkə bağlantılarını yalnız `@task` və ya `python_callable` funksiyasının **daxilində** import edin.

### Səhv 2: Backfill Fəlakəti (`catchup=True` və köhnə `start_date`)
- **Problem:** DAG yazılarkən `start_date=datetime(2025, 1, 1)` qoyulub və `catchup=True` unudulub. DAG aktivləşdirilən anda Airflow ötən 1 ilin hər günü üçün 365 paralel DAGRun başladır, verilənlər bazası və şəbəkə tıxanır.
- **Həll Yolu:** Standart olaraq həmişə `catchup=False` yazın. Əgər tarixi məlumatı köçürmək lazımdırsa, Airflow CLI vasitəsilə idarə olunan tək-tək backfill edin:
  ```bash
  airflow dags backfill -s 2026-01-01 -e 2026-01-10 --reset-dagruns ateshgah_daily_claims_pipeline
  ```

### Səhv 3: XCom ilə Böyük Həcmli Məlumat Ötürmək
- **Problem:** Task 1-də `return df.to_json()` yazıb Task 2-də onu XCom ilə oxumaq. PostgreSQL metadata bazası şişir, RAM tükənir və Scheduler çökür.
- **Həll Yolu:** Datanın özünü MinIO/S3-ə yazın, XCom-da yalnız faylın `s3://...` ünvanını ötürün.

---

## 5. Vakansiya ilə Əlaqə və Müsahibədə Yanaşma (Atəşgah Sığorta)

Atəşgah Sığortada müxtəlif sistemlər (Mərkəzi Sığorta Bazasında polislər, bank ödəniş sistemində ödəmələr və qəza iddiaları) mövcuddur. Hər gecə saat 02:00-da bu məlumatların avtomatik toplanması, validasiyadan keçirilməsi və səhər 08:00-da rəhbərliyin hesabat masasına hazır çatdırılması üçün Apache Airflow əsas dirək rolunu oynayır.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən layihələrimdə boru kəmərlərinin orkestrasiyası üçün **Apache Airflow**-dan istifadə etmişəm.
> 
> Mənim üçün 3 təməl Airflow prinsipi var:
> 1) **Mütləq İdempotentlik:** Tapşırıqlarda heç vaxt `datetime.now()` işlətmirəm; Airflow-un təmin etdiyi `{{ ds }}` tarixi ilə partisiya təmizləyib yazıram ki, xəta baş verəndə təhlükəsiz retry olunsun.
> 2) **Resurs qənaəti:** Xarici faylları gözləyərkən worker resurslarını bloklamamaq üçün sensorları həmişə `mode='reschedule'` ilə qururam.
> 3) **Scheduler gigiyenası:** Top-level kod yazmıram, ağır kitabxanaları task daxilində çağırıram və XCom-da böyük data əvəzinə yalnız S3 fayl yollarını ötürürəm."

---

## 6. 3 Suallıq İnteraktiv Mini-Quiz

#### Sual 1: Nə üçün Sensor-larda `mode="poke"` əvəzinə `mode="reschedule"` seçilməlidir?
<!-- answer-start -->
**Cavab:** `mode="poke"` rejimində sensor fayl və ya şərt hazır olana qədər worker slotunu (CPU və RAM) fasiləsiz zəbt edir. Əgər fayl 2 saat gecikərsə, həmin worker digər heç bir işi icra edə bilmir və sistemdə **Worker Starvation** (resurs aclığı) yaranır. `mode="reschedule"` rejimində isə sensor yoxlamanı edir, fayl yoxdursa worker-i dərhal azad edir və növbəti yoxlamaya qədər yuxu rejiminə keçir.
<!-- answer-end -->

#### Sual 2: Airflow-da `logical_date` (əvvəlki `execution_date` / `{{ ds }}`) ilə real sistem saatı (`datetime.now()`) arasındakı fərq nədir və niyə `datetime.now()` idempotentliyi pozur?
<!-- answer-start -->
**Cavab:** `logical_date` həmin DAGRun-ın əhatə etdiyi məntiqi məlumat dövrünün başlanğıc vaxtıdır və zaman keçsə belə heç vaxt dəyişmir. `datetime.now()` isə cari saatı göstərir. Əgər kodda `datetime.now()` istifadə olunarsa, 5 gün əvvəlki xətalı işi təkrar işə saldıqda (Backfill/Retry), sistem 5 gün əvvəlin yox, bugünün məlumatını emal edəcək və tarixi audit tamamilə korlanacaq. İdempotentlik üçün yalnız `{{ ds }}` istifadə olunmalıdır.
<!-- answer-end -->

#### Sual 3: DAG faylının yuxarı hissəsində (top-level) xarici REST API çağırışı və ya baza bağlantısı qurmaq hansı təhlükəni yaradır?
<!-- answer-start -->
**Cavab:** Airflow Scheduler hər bir neçə saniyədən bir DAG qovluğundakı bütün Python fayllarını icra edərək daxili qrafiki yeniləyir. Əgər faylın başında xarici API və ya DB çağırışı varsa, Scheduler hər dövrədə həmin uzaq serveri sorğulayacaq, şəbəkə gecikməsi səbəbindən Scheduler-in dövrəsi (Heartbeat) donacaq və digər heç bir DAG vaxtında başlaya bilməyəcək.
<!-- answer-end -->
