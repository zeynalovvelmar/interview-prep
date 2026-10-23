---
id: "10-kafka-realtime-streaming"
slug: "kafka-realtime-streaming"
order: 10
title: "Apache Kafka & Real-Time Axın Əsasları"
category: "Streaming"
priority: "high"
readiness: "guclu"
vacancyLink: "Real-time sığorta hadisələrinin, onlayn polislərin və telemetriya məlumatlarının fasiləsiz qəbulu və axın emalı"
tags: ["Kafka", "Streaming", "KRaft", "Topic", "Partition", "Offset", "Consumer Group", "Lag", "Spark Streaming"]
summary: "Broker və Topic arxitekturası, Partisiyalar və Offset, KRaft rejimi, Consumer Group və Lag idarəsi, Exactly-once semantikası və PySpark Structured Streaming inteqrasiyası."
---

# Apache Kafka & Real-Time Axın Əsasları

## 1. Qısa İzah və Analogiya

Ənənəvi məlumat boru kəmərləri toplu rejimdə (Batch Processing — məsələn, gecə saat 02:00-da) işləyir. Lakin müasir bizneslərdə — xüsusilə onlayn sığorta satışı, bank tranzaksiyaları və qəza bildirişlərində hadisə baş verən anda (sub-second) reaksiya vermək tələb olunur.

**Apache Kafka** yüksək həcmli, paylanmış, üfüqi miqyaslanan və xətalara dözümlü **Hadisə Axını Platformasıdır (Event Streaming Platform)**. Kafka sadəcə mesaj ötürən müvəqqəti növbə (RabbitMQ kimi) deyil; o, daxil olan bütün hadisələri diskdə ardıcıl saxlayan paylanmış **Commit Log** sistemidir.

> [!NOTE]
> **Analogiya:** Ənənəvi poçt qutusunda məktubu götürəndə o yox olur. Kafka isə nəhəng bir **Notariat Kitabına (Immutable Log)** bənzəyir: hər bir hadisə (yeni polis satışı, qəza qeydi) kitabın sonuna silinməz mürəkkəblə və artan səhifə nömrəsi ilə (**Offset**) yazılır. Onlarla fərqli şöbə (Risk idarəsi, Muhasibat, Fırıldaqçılıq monitorinqi) eyni kitaba baxa bilər; hər şöbə öz əlfəcini (**Consumer Offset**) saxlayır və istədiyi sürətlə oxuyur. Biri ləngisə belə, digərlərinə heç bir maneə yaratmır.

---

## 2. Əsas Anlayışlar və Memarlıq Detalları

```
                          ┌───────────────────────────┐
                          │   PRODUCERS (Apps / APIs) │
                          └─────────────┬─────────────┘
                                        │ (write with Key)
                                        ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      KAFKA CLUSTER (KRaft Quorum)                      │
 │                                                                        │
 │  TOPIC: "insurance-events"                                             │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ Partition 0: [0] [1] [2] [3] [4] [5] ... (Append-only Log)       │  │
 │  ├──────────────────────────────────────────────────────────────────┤  │
 │  │ Partition 1: [0] [1] [2] [3] [4] ...     (Append-only Log)       │  │
 │  ├──────────────────────────────────────────────────────────────────┤  │
 │  │ Partition 2: [0] [1] [2] [3] ...         (Append-only Log)       │  │
 │  └──────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────┬───────────────────────────────┬─────────┘
                                │                               │
                                ▼                               ▼
                 ┌─────────────────────────────┐ ┌────────────────────────┐
                 │ CONSUMER GROUP A (Claims)   │ │ CONSUMER GROUP B (DWH) │
                 │ - Consumer 1 -> Part 0, 1   │ │ - Spark Streaming      │
                 │ - Consumer 2 -> Part 2      │ │   (Micro-batch to S3)  │
                 └─────────────────────────────┘ └────────────────────────┘
```

### 2.1. Əsas Tikinti Blokları

| Anlayış | Təyinatı və İş Mexanizmi | Data Engineering Qaydası |
| :--- | :--- | :--- |
| **Broker** | Kafka klasterində çalışan server prosesidir. Mesajları qəbul edir, diskə yazır və istehlakçılara ötürür. | İstehsalatda minimum 3 broker quraşdırılır. |
| **Topic** | Oxşar tipli hadisələrin kateqoriyasıdır (məsələn, `customer-registrations`, `claims-feed`). | Biznes domenlərinə görə ayrılır. |
| **Partition** | Topic-in fiziki parçalarıdır. Paralelliyin və miqyaslanmanın təməl vahididir. | Bir topic-də partisiya sayı istehlakçıların maksimum sayını müəyyən edir. |
| **Offset** | Partisiya daxilində hər bir mesaja verilən unikal, artan 64-bitlik tam ədəddir (0, 1, 2...). | Offset sayəsində consumer qaldığı dəqiq yeri bilir. |
| **Producer** | Hadisələri yaradıb Kafka mövzularına göndərən tətbiqlərdir. | Mesaj açarı (`Key`) verilərsə, eyni açarlı məlumatlar həmişə eyni partisiyaya düşür. |
| **Consumer** | Kafka-dan hadisələri oxuyan və emal edən xidmətlərdir. | Mesajları oxumaq onları silmir (Retention Policy). |

---

### 2.2. KRaft Konsensus Rejimi vs ZooKeeper

Köhnə Kafka versiyaları klaster metadatasını (mövzular, broker siyahısı, icazələr) xarici **Apache ZooKeeper** sistemində saxlayırdı. Bu, ikiqat şəbəkə mürəkkəbliyi və metadata gecikməsi yaradırdı.

Kafka 3.x ilə gələn **KRaft (Kafka Raft Metadata)** arxitekturası ZooKeeper-i tamamilə ləğv etdi:
- Brokerlər öz daxillərində **Raft Konsensusu** ilə xüsusi Metadata Korumu (Metadata Quorum) təşkil edirlər.
- Klaster saniyələr ərzində açılır, milyonlarla partisiyanı idarə edə bilir və xarici asılılıq olmadan tək `docker-compose` ilə rahat işə salınır.

---

### 2.3. Consumer Groups və Partisiya Balansı

Bir neçə consumer vahid **Consumer Group** (`group.id`) adı altında birləşərək bir mövzunun partisiyalarını öz aralarında bölüşürlər:

- **1 Partisiya = Qrup daxilində eyni vaxtda yalnız 1 Consumer!**
- Əgər mövzuda 3 partisiya varsa və qrupda 3 consumer işləyirsə: Hərəsi 1 partisiyanı paralel oxuyur (Tam balans).
- Əgər qrupda 5 consumer qoşularsa: 3 consumer partisiyaları oxuyur, qalan 2 consumer isə **bekar (idle)** gözləyir.
- Əgər consumer-lərdən biri sıradan çıxarsa: Kafka avtomatik olaraq **Rebalance** aparır və boş qalmış partisiyanı sağ qalan consumer-lərə təhkim edir.

#### Consumer Lag Nədir?
**Consumer Lag** = Partisiyadakı ən son yazılmış mesaj ofseti ilə consumer-in oxuyub təsdiqlədiyi (commit etdiyi) ofset arasındakı fərqdir.
- Lag = 0: İstehlakçı real vaxtla tam ayaqlaşır.
- Lag kəskin artırsa: İstehlakçı daxil olan axından geri qalır (Darboğaz). Həll: Partisiya sayını və consumer sayını artırmaq və ya emal kodunu optimallaşdırmaq.

---

### 2.4. Çatdırılma Zəmanətləri (Delivery Semantics)

| Semantika | Təyinatı | Tənzimləmə Parametrləri | Risk / Üstünlük |
| :--- | :--- | :--- | :--- |
| **At-Most-Once** (Maksimum 1 dəfə) | Mesaj emal olunmazdan əvvəl ofset dərhal commit edilir. | `enable.auto.commit = true` | **Data itkisi riski var!** Xəta baş versə mesaj itir; heç vaxt maliyyə sistemində istifadə olunmur. |
| **At-Least-Once** (Minimum 1 dəfə) | Mesaj tam emal edildikdən sonra ofset commit olunur. Şəbəkə xətası olarsa təkrar göndərilir. | `acks='all'`, `auto.commit=false` | **Data itkisi sıfırdır**, lakin dublikat sətirlər yarana bilər (İstehlakçı idempotent olmalıdır). |
| **Exactly-Once (EOS)** (Dəqiq 1 dəfə) | Nə data itkisi, nə də dublikat yaranır. | `enable.idempotence=true`, Transactional API | **Ən etibarlı sənaye standartı!** Producer və Consumer tranzaksiya koordinasiyası ilə işləyir. |

> [!TIP]
> **Idempotent Producer:** `enable.idempotence=True` edildikdə Kafka hər bir producer-ə unikal `Producer ID (PID)` və hər mesaja artan `Sequence Number` təyin edir. Əgər şəbəkə qopması səbəbindən producer eyni mesajı iki dəfə göndərərsə, broker bunu dərhal aşkarlayır və dublikat yazılışı rədd edir.

---

## 3. Praktik Kod Nümunələri

### 3.1. İdempotent Python Producer

```python
# Dialect: Python (kafka-python / confluent-kafka)
import json
import logging
from kafka import KafkaProducer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KafkaProducer")

# 1. Tam etibarlı və idempotent Producer konfiqurasiyası
producer = KafkaProducer(
    bootstrap_servers=["localhost:9092"],
    acks="all",                      # Bütün replikaların yazılışı təsdiqləməsini gözlə
    enable_idempotence=True,         # Dublikatların qarşısını al
    retries=5,                       # Keçici xətalarda təkrar göndər
    max_in_flight_requests_per_connection=5,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    key_serializer=lambda k: str(k).encode("utf-8")
)

# 2. Sığorta hadisəsinin göndərilməsi
def publish_insurance_claim(claim: dict):
    topic = "ateshgah-claims-stream"
    # Müştəri ID açar (Key) kimi verilir: Eyni müştərinin bütün hadisələri 
    # dəqiq eyni partisiyaya düşür və xronoloji ardıcıllıq qorunur!
    key = claim["customer_id"]
    
    future = producer.send(topic, key=key, value=claim)
    try:
        record_metadata = future.get(timeout=10)
        logger.info(f"Hadisə yazıldı: Topic={record_metadata.topic}, "
                    f"Part={record_metadata.partition}, Offset={record_metadata.offset}")
    except Exception as e:
        logger.error(f"Mesaj göndərilərkən kritik xəta: {e}")

# Nümunə sığorta hadisəsi
sample_claim = {
    "claim_id": "CLM-9921",
    "customer_id": 4021,
    "policy_id": "POL-108",
    "claim_amount": 1450.00,
    "event_time": "2026-10-24T14:30:00Z"
}

publish_insurance_claim(sample_claim)
producer.flush()
```

### 3.2. PySpark Structured Streaming ilə Real-Time İstehlak

```python
# Dialect: PySpark Structured Streaming (Spark 3.5+)
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, window
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType, IntegerType

spark = SparkSession.builder \
    .appName("AteshgahKafkaRealtimeStreaming") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0") \
    .getOrCreate()

# 1. Kafka-dan fasiləsiz axının oxunması
df_kafka_stream = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "localhost:9092") \
    .option("subscribe", "ateshgah-claims-stream") \
    .option("startingOffsets", "latest") \
    .load()

# 2. JSON sxeminin təyin edilməsi
claim_schema = StructType() \
    .add("claim_id", StringType()) \
    .add("customer_id", IntegerType()) \
    .add("policy_id", StringType()) \
    .add("claim_amount", DoubleType()) \
    .add("event_time", TimestampType())

# 3. İkili (binary) dəyərin JSON-dan strukturlaşdırılması
df_parsed = df_kafka_stream.selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
    .select(from_json(col("value"), claim_schema).alias("data")) \
    .select("data.*")

# 4. 10 dəqiqəlik sürüşən pəncərə üzrə zərərlərin toplanması (Watermark ilə)
df_aggregated = df_parsed \
    .withWatermark("event_time", "5 minutes") \
    .groupBy(
        window(col("event_time"), "10 minutes", "5 minutes"),
        col("policy_id")
    ) \
    .sum("claim_amount")

# 5. CheckpointLocation ilə etibarlı yazılış
query = df_aggregated.writeStream \
    .format("console") \
    .outputMode("update") \
    .option("checkpointLocation", "s3a://insurance-lakehouse/checkpoints/claims_stream") \
    .start()

query.awaitTermination()
```

---

## 4. Tez-tez Edilən Səhvlər və Həll Yolları

### Səhv 1: Rebalance Storm və `max.poll.interval.ms` Aşıntısı
- **Problem:** Consumer bir partiyada (`max.poll.records = 500`) çoxlu mesaj çəkir, lakin hər mesajın emalı 1 saniyə çəkdiyi üçün növbəti `poll()` çağırışına qədər 5 dəqiqə keçir (`max.poll.interval.ms = 300000`). Kafka brokeri bu consumer-in öldüyünü düşünür, onu qrupdan çıxarır və bütün klasterdə **Rebalance Storm** başlayır; iş dayanır.
- **Həll Yolu:** `max.poll.records` parametrini azaldın (məsələn, 50-yə salın) və ya ağır hesablama aparan kodun sürətini artırın ki, consumer vaxtında növbəti mesaj partiyasını istəsin.

### Səhv 2: Null Key İstifadəsi və Ardıcıllığın Pozulması
- **Problem:** Producer mesajları açarsız (`key=None`) göndərir. Kafka mesajları dəyirmi üsulla (Round-Robin) bütün partisiayalara səpələyir. Nəticədə bir müştərinin "Polis Yaradıldı" hadisəsi Partisiya 0-a, "Polis Ləğv Edildi" hadisəsi isə Partisiya 2-yə düşür. İstehlakçı ləğv edilməni yaradılmadan qabaq oxuya bilər!
- **Həll Yolu:** Həmişə biznes identifikatorunu (`customer_id` və ya `policy_id`) açar kimi verin; eyni açarlı hadisələr həmişə dəqiq eyni partisiyaya gedir və ardıcıllıq 100% qorunur.

### Səhv 3: Checkpoint Göstərmədən Streaming İşə Salmaq
- **Problem:** Spark Streaming işə salınarkən `checkpointLocation` qeyd edilmir. Klaster söndükdə hansı Kafka ofsetlərinin emal edildiyi itir və axın ya sıfırdan başlayaraq köhnə məlumatları dublikat edir, ya da son mesajları itirir.
- **Həll Yolu:** Həmişə paylanmış dayanıqlı saxlama qatında (`s3a://.../checkpoints/`) checkpoint təyin edin.

---

## 5. Vakansiya ilə Əlaqə və Müsahibədə Yanaşma (Atəşgah Sığorta)

Atəşgah Sığortada rəqəmsallaşma ilə yanaşı, veb saytdan və mobil tətbiqdən anlıq KASKO sorğuları, bank kartı ilə ödəmələr və qəza yerindən göndərilən şəkillər daxil olur. Bu hadisələrin dərhal Kafka-ya axıdılması, risk qiymətləndirmə mikroservislərinə və analitik Lakehouse-a ötürülməsi Data Mühəndisinin əsas işidir.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən Layihə 2-də real-time axınların qəbulu və emalı üçün **Apache Kafka (KRaft)** və **PySpark Structured Streaming** arxitekturasından istifadə etmişəm.
> 
> Əsas yanaşmalarım:
> 1) **Hadisə ardıcıllığı:** Müştəri hadisələrinin qarışmaması üçün hər zaman biznes açarı (`customer_id`) ilə partisiya yönləndirməsi tətbiq edirəm.
> 2) **Exactly-once təminatı:** Producer tərəfində `enable.idempotence=True` və `acks='all'` işlədərək şəbəkə təkrarında dublikatların qarşısını alıram.
> 3) **Dözümlülük və Monitorinq:** Consumer Lag göstəricisini izləyirəm və Spark axınlarında ofsetlərin təhlükəsizliyi üçün mütləq `checkpointLocation` tətbiq edirəm."

---

## 6. 3 Suallıq İnteraktiv Mini-Quiz

#### Sual 1: Mövzuda (Topic) 4 partisiya varsa, eyni Consumer Group daxilində 6 consumer prosesi qoşularsa nə baş verir?
<!-- answer-start -->
**Cavab:** 4 consumer prosesi hərəsi 1 fərdi partisiyanı paralel olaraq oxuyacaq, qalan 2 consumer prosesi isə **tam bekar (idle)** qalacaq. Çünki vahid Consumer Group daxilində bir partisiyanı eyni anda yalnız 1 consumer oxuya bilər (partisiya daxili ofset ardıcıllığını təmin etmək üçün). Paralelliyi artırmaq üçün ilk növbədə Topic-də partisiya sayı artırılmalıdır.
<!-- answer-end -->

#### Sual 2: Kafka-da Consumer Lag nədir və istehsalatda lag kəskin artmağa başlayanda hansı diaqnostika addımları atılmalıdır?
<!-- answer-start -->
**Cavab:** Consumer Lag mövzudakı ən son mesaj ilə consumer-in oxuyub təsdiqlədiyi ofset arasındakı fərqdir (istehlakçının nə qədər geridə qaldığını göstərir). Lag kəskin artarsa: 1) İlk olaraq `kafka-consumer-groups.sh --describe` ilə hansı xüsusi partisiyada lag yarandığını yoxlayıram; 2) İstehlakçı kodunun xarici bazanı və ya API-ni gözləyib darboğaz yaratdığını (I/O bottleneck) araşdırıram; 3) Əgər CPU tükənibsə, partisiyaların sayını və uyğun olaraq Consumer Group-dakı consumer sayını artıraraq paralelliyi genişləndirirəm.
<!-- answer-end -->

#### Sual 3: Producer tərəfində `enable.idempotence=true` parametri nəyi təmin edir və şəbəkə təkrarında dublikatları necə bloklayır?
<!-- answer-start -->
**Cavab:** Bu parametr aktiv edildikdə Kafka brokeri hər bir producer-ə daxili unikal identifikator (`Producer ID / PID`) və göndərilən hər mesaja artan ardıcıl nömrə (`Sequence Number`) verir. Əgər producer mesajı göndərdikdən sonra şəbəkə qopsa və təsdiq (ACK) almayıb həmin mesajı təkrar göndərsə, broker gələn Sequence Number-in artıq qeyd edildiyini görür; mesajı diskə ikinci dəfə yazmır, lakin producer-ə uğurlu cavab qaytarır. Beləliklə, şəbəkə problemlərində tam dublikatsız yazılış təmin olunur.
<!-- answer-end -->
