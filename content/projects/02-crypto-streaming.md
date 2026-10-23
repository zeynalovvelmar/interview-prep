---
id: "proj-crypto"
slug: "crypto-streaming"
title: "Real-Time Cryptocurrency Streaming Pipeline"
subtitle: "Kafka (KRaft), PySpark Structured Streaming, PostgreSQL və Grafana ilə Canlı Analitika"
date: "Aprel 2026"
role: "Data Mühəndisi (Akademik Təcrübə Müdafiəsi)"
tags: ["Apache Kafka", "KRaft", "PySpark Streaming", "PostgreSQL", "Airflow", "Grafana", "Python"]
---

# Real-Time Cryptocurrency Streaming Pipeline

> [!NOTE]
> **Layihənin Xülasəsi:** Bu layihə real-time axınların (streaming) paylanmış mühitdə emalı və vizuallaşdırılması üçün hazırlanıb və akademik təcrübə müdafiəsi olaraq təqdim edilib. Xarici CoinGecko REST API-dən çəkilən valyuta qiymətləri multi-broker Kafka KRaft klasterinə ötürülüb, PySpark Structured Streaming ilə emal edilib, PostgreSQL-ə yazılıb və Grafana-da canlı monitorinq panelləri qurulub.

---

## 1. 60 Saniyəlik Pitch (Qısa Təqdimat)

> "Salam. Mənim ikinci böyük layihəm **Kafka, PySpark Structured Streaming, PostgreSQL və Grafana** istifadə edərək qurduğum **Real-Time Data Streaming Pipeline**-dır. 
> 
> Layihənin məqsədi kənar kriptovalyuta birjalarından (CoinGecko API) fasiləsiz daxil olan dəyişkən qiymət axınlarını qəbul edib, saniyələr daxilində təmizləyərək canlı analitik panellərə çatdırmaq idi. 
> 
> Memarlıqda ZooKeeper asılılığını aradan qaldırmaq üçün ən müasir **Kafka KRaft** rejimində multi-broker klaster qurdum. Python Producer ilə çəkilən yarı-strukturlaşdırılmış JSON hadisələrini Kafka mövzusuna göndərdim. **PySpark Structured Streaming** mühərriki ilə axını saniyəlik mikro-partiyalarla oxudum, sxemi təyin etdim, hərəkətli ortalama (moving average) göstəricilərini hesabladım və xətalara dözümlülük üçün Checkpoint mexanizmi ilə PostgreSQL bazasına yazdım. Yekunda isə Grafana-da saniyəbəsaniyə yenilənən canlı qiymət və volatillik panelləri təqdim etdim. Bu layihəni akademik təcrübə müdafiəsi kimi uğurla təqdim etmişəm."

---

## 2. 3 Dəqiqəlik İzah (Addım-addım Axın və Detallar)

Sistem 4 əlaqəli mərhələ üzrə işləyir:

### Mərhələ 1: İnvestisiya Məlumatlarının İnqestiyası (Python Producer)
* CoinGecko ictimai REST API-dən ən populyar kriptovalyuta cütlüklərinin (BTC, ETH, SOL) qiymət, 24 saatlıq həcm və bazar kapitalizasiyası məlumatlarını çəkən asinxron Python skripti yazdım.
* API rate limitlərini (dəqiqədə maksimum sorğu sayını) aşmamaq üçün eksponensial geri çəkilmə (`exponential backoff`) və fasilə mexanizmi qurdum.
* Alınan JSON payload-ları təmizlənərək `crypto-market-ticks` adlı Kafka mövzusuna (topic) JSON formatında göndərildi.

### Mərhələ 2: Hadisə Axını və Kafka Klasteri (KRaft Rejimi)
* Klasteri Docker mühitində 3 brokerli arxitektura ilə qurdum. ZooKeeper əvəzinə Kafka 3.x ilə gələn daxili **KRaft (Kafka Raft Metadata)** rejimindən istifadə etdim.
* Mövzu üçün 3 partisiya və 2 replikasiya faktoru təyin etdim ki, həm paralellik, həm də dözümlülük təmin olunsun.
* Producer tərəfində `acks='all'` və `enable.idempotence=True` tətbiq edərək şəbəkə qopması zamanı dublikatların və data itkisinin qarşısını aldım.

### Mərhələ 3: Axın Emalı (PySpark Structured Streaming)
* PySpark-ın axın oxuyucusu (`readStream`) vasitəsilə Kafka mövzusuna bağlandım.
* Gələn ikili (binary) mesaj dəyərini `from_json()` funksiyası və qabaqcadan təyin olunmuş `StructType` sxemi ilə strukturlaşdırdım.
* 1 dəqiqəlik və 5 dəqiqəlik sürüşən zaman pəncərələri (`tumbling & sliding windows`) tətbiq edərək valyutalar üzrə ortalama qiymət və qiymət dəyişkənliyi (volatility) hesabladım.
* Ən önəmlisi: `checkpointLocation` qeyd edərək emal olunan son Kafka ofsetlərinin vəziyyətini qorudum; bu, axın dayanıb yenidən başladıqda qaldığı yerdən davam etməyə imkan verdi.

### Mərhələ 4: Saxlama və Vizualizasiya (PostgreSQL & Grafana)
* Emal olunmuş təmiz sətirlər `foreachBatch` metodu ilə PostgreSQL-də yaradılmış `realtime_crypto_metrics` cədvəlinə yazıldı.
* Grafana paneli birbaşa PostgreSQL-ə qoşuldu və hər 5 saniyədən bir avtomatik sorğu göndərərək canlı qrafikləri yenilədi.
* Bütün infrastruktura və köməkçi batch təmizləmələrinə nəzarət üçün arxa planda Apache Airflow DAG-ı inteqrasiya olundu.

---

## 3. Arxitektura Diaqramı

```text
 ┌──────────────────────┐
 │   CoinGecko REST API │
 └──────────┬───────────┘
            │ (JSON over HTTPS)
            ▼
 ┌──────────────────────┐
 │ Python Event Producer│
 │ - Rate limiting      │
 │ - Retries & Backoff  │
 └──────────┬───────────┘
            │ (acks=all, Idempotent)
            ▼
 ┌────────────────────────────────────────────────────────┐
 │            Apache Kafka Cluster (KRaft Mode)           │
 │  Topic: crypto-market-ticks (3 Partitions, 2 Replicas) │
 │  ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐ │
 │  │ Broker 1 (Leader│ │    Broker 2     │ │  Broker 3 │ │
 │  └─────────────────┘ └─────────────────┘ └───────────┘ │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼ (readStream from Kafka)
 ┌────────────────────────────────────────────────────────┐
 │            PySpark Structured Streaming                │
 │  - Schema Parsing (StructType)                         │
 │  - Windowed Aggregation (1-min / 5-min sliding)        │
 │  - Checkpointing (MinIO / Local Disk state store)      │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼ (foreachBatch Upsert)
 ┌────────────────────────────────────────────────────────┐
 │               PostgreSQL Serving Database              │
 │               public.realtime_crypto_metrics           │
 └──────────────────────────┬─────────────────────────────┘
                            │
                            ▼ (SQL 5s Auto-refresh)
 ┌────────────────────────────────────────────────────────┐
 │                    Grafana Dashboard                   │
 │           (Canlı Qiymətlər, Həcm, Siqnallar)          │
 └────────────────────────────────────────────────────────┘
```

---

## 4. "Niyə bunu seçdim?" (Əsas Memarlıq Qərarları)

| Qərar | Alternativ | Niyə məhz bunu seçdim? (Əsaslandırma) |
| :--- | :--- | :--- |
| **Kafka KRaft Rejimi** | ZooKeeper ilə Kafka | ZooKeeper əlavə bir klaster idarəetməsi, əlavə RAM və şəbəkə gecikməsi tələb edir. KRaft rejimi daha yüngüldür, Kafka daxili Raft konsensusu ilə işləyir və müasir standartdır. |
| **PySpark Structured Streaming** | Təmiz Python Kafka Consumer | Təmiz Python tək thread-də işləyir və çoxlu partisiya olduqda miqyaslanmır. PySpark klaster boyu pəncərə aqreqasiyalarını (windowing) və paylanmış emalı yerli dəstəkləyir. |
| **Checkpointing** | Yaddaşda vəziyyət (In-memory) | Əgər streaming pod və ya skript çöksəydi, hansı Kafka ofsetində qaldığımız itərdi və bərpa zamanı ya data itkisi, ya da dublikasiya yaranardı. Checkpoint disklə tam bərpa təmin edir. |
| **PostgreSQL Sink** | NoSQL (MongoDB / Redis) | Analitik SQL sorğuları, join-lər və Grafana-nın PostgreSQL daxili qoşulma dəstəyi çox sabitdir. Junior səviyyəsində relyasion bazanın indeksləri ilə yüksək performans almaq mümkündür. |

---

## 5. Müsahibə Sualları və Cavablar (14 Dərin Sual)

### S1: PySpark Structured Streaming-də Checkpoint necə işləyir və nə üçün vacibdir?
> **Model Cavab:** Checkpointing axın emalında xətalara qarşı dözümlülüyü (fault-tolerance) təmin edən əsas mexanizmdir. Spark hər bir mikro-partiya bitdikdən sonra iki şeyi diskə (və ya S3-ə) qeyd edir: birincisi, həmin partiyada oxunan Kafka ofset aralığını (`offset log`); ikincisi, pəncərə aqreqasiyalarının aralıq vəziyyətini (`state store`). Əgər axın prosesi elektrik kəsilməsi və ya JVM xətası səbəbindən çöksə, yenidən başladıqda həmin checkpoint qovluğundan son commit olunmuş ofsetləri oxuyur və eyni məlumatı təkrar etmədən tam qaldığı yerdən davam edir.

### S2: Əgər hədəf PostgreSQL bazası 10 dəqiqəliyə sönsəydi, axına nə olardı?
> **Model Cavab:** PySpark axını `writeStream` zamanı bazaya qoşula bilmədiyi üçün növbəti mikro-partiyanı commit edə bilməyəcək və `PSQLException: Connection refused` xətası ilə dayanacaq. Lakin məlumat itkisi baş verməyəcək, çünki Kafka Broker mesajları öz diskində (retention policy üzrə) təhlükəsiz saxlayır. Bu müddətdə Kafka-da sadəcə Consumer Lag artacaq. PostgreSQL bərpa olunduqdan sonra PySpark skriptini yenidən başlatdıqda, o, checkpoint-dəki sonuncu uğurlu ofsetdən oxumağa başlayacaq və yığılmış lag-i sürətlə əridərək qrafikləri çatdıracaq.

### S3: Consumer Lag nədir və sən layihəndə lag-i necə müşahidə edirdin?
> **Model Cavab:** Consumer Lag — Kafka mövzusuna daxil olan ən sonuncu mesajın ofseti (Log End Offset) ilə bizim oxuyub bitirdiyimiz ofset arasındakı fərqdir; bu, istehlakçının nə qədər geridə qaldığını göstərir. Mən CLI üzərindən `kafka-consumer-groups.sh --describe` əmri ilə partisiyaların cari ofsetlərini və lag rəqəmlərini yoxlayırdım. Normal halda lag 0-a yaxın olmalıdır; əgər lag dayanmadan artırsa, deməli ya mikro-partiya emalı çox ləng gedir, ya da bazaya yazma darboğaz yaradır.

### S4: Niyə təmiz Python Consumer əvəzinə PySpark Structured Streaming seçdin?
> **Model Cavab:** Təmiz Python skripti kiçik və sadə işlər üçün yaxşı olsa da, onda pəncərə üzrə sürüşən aqreqasiyaları (məsələn, son 5 dəqiqənin ortalaması) əl ilə yaddaşda saxlamaq, state idarə etmək və xəta anında bərpa mexanizmi qurmaq çox mürəkkəbdir. PySpark isə Catalyst Optimizer mühərriki, `groupBy(window(...))` funksionallığı və avtomatlaşdırılmış paylanmış vəziyyət idarəetməsi (stateful streaming) təklif edir. Həmçinin bir neçə partisiya olduqda Spark onları worker-lər arasında paralel bölüşdürür.

### S5: Layihəndə Kafka mövzusunda neçə partisiya açmışdın və bu sayı nəyə görə seçdin?
> **Model Cavab:** Mövzu üçün 3 partisiya təyin etmişdim. Səbəbi odur ki, lokal test mühitimdə 3 broker qaldırmışdım və hər brokerə bir partisiya liderliyi düşməsini istəyirdim. Bu, gələcəkdə istehlakçıların sayını 3 paralel instansiyaya qədər artırmağa imkan verirdi. İstehsalatda isə partisiya sayı saniyədə daxil olan məlumat həcminə və hədəf oxuma paralelliyinə görə hesablanır.

### S6: Mesaj açarından (Message Key) istifadə etmisənmi və o nə üçün lazımdır?
> **Model Cavab:** Bəli, Producer-dən mesaj göndərərkən kriptovalyutanın simvolunu (məsələn, 'BTC', 'ETH') mesaj açarı (`key`) kimi təyin etdim. Kafka eyni açara malik bütün mesajları həmişə eyni partisiyaya yönləndirir (murmur2 heş alqoritmi ilə). Bu çox vacib idi, çünki qiymət dəyişikliklərini dəqiq xronoloji ardıcıllıqla izləmək üçün konkret bir valyutanın bütün hadisələri eyni partisiya daxilində sıralı saxlanılmalı idi.

### S7: Streaming zamanı gecikmiş məlumatlar (late-arriving data) necə idarə olunurdu?
> **Model Cavab:** Şəbəkə gecikmələri səbəbindən bəzi qiymət hadisələri sistemə hadisə vaxtından (event time) xeyli gec çata bilər. PySpark-da yaddaşın sonsuz şişməsinin qarşısını almaq üçün `withWatermark("event_time", "2 minutes")` tətbiq etdim. Bu təlimat Spark-a bildirir ki, ən son görülmüş hadisə vaxtından 2 dəqiqədən daha gec gələn köhnə məlumatları nəzərə almasın və köhnə pəncərələrin vəziyyətini yaddaşdan təmizləsin.

### S8: Bu axın arxitekturasını Atəşgah Sığortanın real ssenarilərinə necə uyğunlaşdırmaq olar?
> **Model Cavab:** Sığortada iki böyük real-time tətbiq sahəsi var. Birincisi, **Sığorta fırıldaqçılığının (Fraud Detection) aşkarlanması:** mobil tətbiq və ya vebsayt üzərindən daxil olan zərər iddiaları dərhal Kafka-ya atılır və PySpark Streaming qaydaları ilə (məsələn, eyni şəxsin 1 saat içində müxtəlif yerlərdən qəza bildirməsi) anında siqnal generasiya olunur. İkincisi, **Telematika və KASKO:** avtomobillərə quraşdırılmış GPS/IoT sensorlarından gələn sürət və əyləc məlumatları real-time emal olunaraq dinamik sığorta tarifi təyin edilə bilər.

### S9: PostgreSQL-ə yazarkən hansı yazma rejimindən (outputMode) istifadə etdin?
> **Model Cavab:** Structured Streaming-də üç rejim var: Append, Complete və Update. Mən pəncərə aqreqasiyaları və hər dəqiqənin yekun ortalama qiymətlərini yazmaq üçün `outputMode("update")` rejimindən istifadə etdim. Bu rejim yalnız dəyəri dəyişən və ya yeni tamamlanmış pəncərə sətirlərini PostgreSQL-ə `foreachBatch` vasitəsilə göndərir və bazaya lüzumsuz təkrar yük düşməsinin qarşısını alır.

### S10: Layihədə Grafana-nın monitorinqini necə qurdun?
> **Model Cavab:** Grafana-da PostgreSQL Data Source əlavə etdim. SQL sorğusu yazaraq `time_bucket('10s', event_time)` üzrə hər bir valyutanın qiymət dinamikasını və həcmini `Time Series` qrafiklərində vizuallaşdırdım. Həmçinin qiymət 5% kəskin düşdükdə və ya axından 30 saniyə ərzində yeni sətir gəlmədikdə ekranda qırmızı xəbərdarlıq yandıran Alert qaydası təyin etdim.

### S11: Kafka Producer tərəfində `acks='all'` nə üçün qoyuldu?
> **Model Cavab:** Susmaya görə `acks=1` yalnız lider brokerin mesajı qəbul etməsini gözləyir; əgər lider təsdiq edən kimi çökərsə və digər brokerlər replikasiya çatdırmayıbsa, mesaj itir. `acks='all'` qoyduqda isə lider mesajın bütün aktiv replikalara (ISR - In-Sync Replicas) yazıldığından əmin olduqdan sonra təsdiq qaytarır. Bu, maliyyə və qiymət məlumatlarında sıfır data itkisinə zəmanət verir.

### S12: Layihəni hazırlayarkən hansı gözlənilməz çətinliklə üzləşdin?
> **Model Cavab:** Ən böyük çətinlik CoinGecko API-nin pulsuz planda sərt sorğu limiti (rate limiting: dəqiqədə 30 sorğu) tətbiq etməsi və HTTP 429 xətası verməsi oldu. Əvvəlcə Producer dayanmadan sorğu atdığı üçün bloklanırdı. Çözüm olaraq Python kodunda dinamik `sleep` və `requests` sessiyalarında avtomatik `Retry` adapteri qurdum. Məlumatları tək-tək deyil, bir neçə valyutanı vahid URL parametrində yığaraq sorğu sayını 4 dəfə azaltdım.

### S13: Kafka KRaft rejiminin adi ZooKeeper-li rejimdən üstünlüyünü nə zaman hiss etdin?
> **Model Cavab:** Docker mühitində klasteri qaldırarkən və test edərkən. Əvvəllər ZooKeeper-in qalxmasını gözləmək, zookeeper id-ləri ilə kafka id-lərini uyğunlaşdırmaq və ikiqat RAM ayırmaq lazım gəlirdi. KRaft rejimində isə sadəcə `kafka-storage.sh format` ilə vahid cluster-id təyin edib brokerləri birbaşa işə saldım; brokerlərdən birini söndürüb test edəndə metadata bərpası saniyələr içində baş verdi.

### S14: Bu layihəni istehsalat mühitində 100 qat böyük axın üçün necə miqyaslayardın?
> **Model Cavab:** Üç əsas addım atardım: birincisi, Kafka-da partisiya sayını 3-dən 24-ə qədər artırardım və Spark klasterində executor sayını çoxaldardım. İkincisi, PostgreSQL tək server olduğundan saniyədə onminlərlə yazma yükünü qaldıra bilməz; buna görə də analitik sink olaraq yüksək sürətli columnar baza olan **ClickHouse** və ya **TimescaleDB** istifadə edərdim. Üçüncüsü, Spark Streaming əvəzinə sub-saniyəlik gecikmələr üçün **Apache Flink** mühərrikini araşdırardım.

---

## 6. Yadda Saxlanacaq Rəqəmlər Qutusu (Metrikalar)

> [!TIP]
> **Müsahibə üçün qısa metrikalar (Sahib tərəfindən redaktə edilə bilər):**
> * **Kafka Broker Sayı:** 3 broker (Multi-broker KRaft klasteri)
> * **Topic Partisiyaları:** 3 partisiya, Replication Factor: 2
> * **Producer Parametrləri:** `acks='all'`, `enable.idempotence=True`
> * **Streaming Emal İntervalı:** 5 saniyəlik mikro-partiyalar (`trigger(processingTime='5 seconds')`)
> * **Watermark Dəyəri:** 2 dəqiqəlik gecikmə dözümlülüyü (`withWatermark`)
> * **Grafana Yenilənmə Tezliyi:** Hər 5 saniyədən bir canlı yenilənmə
> * **İzlənən Cütlüklər:** 5 əsas valyuta (BTC, ETH, SOL və s.)
