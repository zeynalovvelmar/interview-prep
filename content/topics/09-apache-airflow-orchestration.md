---
id: "09-apache-airflow-orchestration"
slug: "apache-airflow-orkestrasiya"
order: 9
title: "Apache Airflow ilə İş Axınlarının Orkestrasiyası"
category: "Orkestrasiya"
priority: "high"
readiness: "guclu"
vacancyLink: "Apache Airflow vasitəsilə ETL boru kəmərlərinin planlaşdırılması, idarə edilməsi və monitorinqi"
tags: ["Airflow", "DAG", "Scheduler", "Idempotency", "XCom", "Sensors", "Catchup"]
summary: "DAG strukturu, Scheduler və Metadata DB, Idempotency prinsipləri, XCom məhdudiyyətləri, poke vs reschedule sensorları."
---

# Apache Airflow ilə İş Axınlarının Orkestrasiyası

## 1. Qısa Xülasə (150-250 Söz)

Apache Airflow mürəkkəb məlumat boru kəmərlərini (ETL/ELT) kod kimi (**Workflows as Code**) idarə edən və izləyən orkestrasiya platformasıdır. Mərkəzi komponentləri: iş qrafiklərini yoxlayan **Scheduler**, icra vəziyyətlərini saxlayan **Metadata Database** (PostgreSQL), monitorinq üçün **Webserver** və tapşırıqları icra edən **Worker**-lərdir.

İş axınları **DAG** (Directed Acyclic Graph) şəklində tərtib olunur; qapalı dövrənin olmaması tapşırıqların sonsuz ilişməsinin qarşısını alır. DE-də ən vacib prinsip **İdempotentlikdir**: hər hansı tapşırıq xəta verib yenidən işə salındıqda (retry), sistemin son vəziyyəti dəyişməməli və duplikat yaranmamalıdır. Bunun üçün Airflow-un verdiyi məntiqi `{{ ds }}` tarixi ilə partisiya təmizlənib yenidən yazılır (`overwrite partition`).

Tapşırıqlar arasında kiçik metadata ötürülməsi üçün **XCom** mövcuddur; lakin XCom bazada saxlandığından ora böyük həcmli data qoymaq qəti qadağandır. Xarici fayl və ya cədvəli gözləyərkən worker resurslarını dondurmamaq üçün **Sensor-lar** mütləq `mode="reschedule"` rejimində işlədilməlidir.

## 2. Praktik Kod Nümunəsi

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'elmar',
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

def extract_and_load(ds, **kwargs):
    print(f"İdempotent icra tarixi: {ds}")
    # ds parametri ilə partisiya overwrite edilir, heç bir duplikat qalmır

with DAG(
    dag_id='insurance_claims_etl',
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule='@daily',
    catchup=False  # Keçmiş günləri kütləvi işə salmamaq üçün
) as dag:
    task_etl = PythonOperator(
        task_id='run_daily_claims',
        python_callable=extract_and_load
    )
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: Niyə XCom vasitəsilə 500 meqabaytlıq Pandas DataFrame ötürmək olmaz?
<!-- answer-start -->
**Cavab:** Çünki XCom məlumatları birbaşa Airflow-un tranzaksiya Metadata Bazasında (PostgreSQL cədvəlində) saxlayır. Böyük həcm bazanı doldurar və Scheduler-in işini iflic edər. Datanın özü S3/MinIO-ya yazılmalı, XCom-da yalnız fayl yolu ötürülməlidir.
<!-- answer-end -->

#### Sual 2: FileSensor-da `mode="poke"` əvəzinə niyə `mode="reschedule"` seçilməlidir?
<!-- answer-start -->
**Cavab:** `poke` rejimində sensor fayl gələnə qədər worker slotunu daimi tutub saxlayır və digər real ETL işləri resurs çatışmazlığından ilişib qalır (worker starvation). `reschedule` isə yoxlamadan sonra worker-i dərhal azad edir və növbəti yoxlamaya qədər yatır.
<!-- answer-end -->
