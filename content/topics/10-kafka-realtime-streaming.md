---
id: "10-kafka-realtime-streaming"
slug: "kafka-realtime-streaming"
order: 10
title: "Apache Kafka & Real-Time Axın Əsasları"
category: "Streaming"
priority: "high"
readiness: "guclu"
vacancyLink: "Məlumat axınlarının (streaming) qəbul edilməsi və emalı mexanizmləri"
tags: ["Kafka", "KRaft", "Topic", "Partition", "Consumer Group", "Lag", "Offset"]
summary: "Broker, Topic və Partisiyalar, Consumer Group balansı, KRaft konsensus rejimi, Lag analizi və çatdırılma zəmanətləri."
---

# Apache Kafka & Real-Time Axın Əsasları

## 1. Qısa Xülasə (150-250 Söz)

Apache Kafka paylanmış, hadisələrə əsaslanan (event-driven) və yüksək buraxılış qabiliyyətinə malik real-time axın platformasıdır. Mərkəzi anlayışlar: hadisələrin göndərildiyi **Topic**, miqyaslanma və paralelliyi təmin edən **Partisiyalar**, mesajları yazan **Producer** və oxuyan **Consumer**-lərdir. Mesajlar partisiya daxilində append-only commit log kimi unikal **Offset** nömrəsi ilə sıralı saxlanılır.

Oxuma miqyaslanması **Consumer Group** vasitəsilə həyata keçirilir: qrup daxilində hər partisiya eyni vaxtda yalnız bir consumer tərəfindən oxuna bilər. Əgər daxil olan ən son mesaj ilə oxunan ofset arasındakı fərq (**Consumer Lag**) artırsa, deməli istehlakçı axına çata bilmir və paralelliyi artırmaq lazımdır.

Müasir Kafka 3+ arxitekturasında xarici ZooKeeper ləğv edilmiş və daxili konsensus təmin edən **KRaft (Kafka Raft Metadata)** rejiminə keçilmişdir; bu, quraşdırmanı yüngülləşdirir və milyonlarla partisiyanı dəstəkləyir. Məlumat itkisinin qarşısını almaq üçün Producer tərəfində `acks='all'` və duplikatları aradan qaldıran `enable.idempotence=True` tətbiq olunur.

## 2. Praktik Kod Nümunəsi

```python
import json
from kafka import KafkaProducer

# Sığorta hadisələrini Kafka-ya göndərən Idempotent Producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    acks='all',                  # Bütün replikaların təsdiqini gözlə
    enable_idempotence=True,     # Dublikat göndərişlərin qarşısını al
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8')
)

# Eyni müştərinin hadisələrinin eyni partisiyaya düşməsi üçün key təyin olunur:
event = {'claim_id': 884, 'customer_id': 101, 'claim_amount': 2500.0}
producer.send('insurance-claims', key=str(event['customer_id']), value=event)
producer.flush()
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: Mövzuda (Topic) 4 partisiya varsa, eyni Consumer Group daxilində 6 consumer qoşularsa nə baş verir?
<!-- answer-start -->
**Cavab:** 4 consumer hərəsi 1 partisiyanı paralel oxuyacaq, qalan 2 consumer isə bekar (idle) qalacaq; çünki vahid qrup daxilində 1 partisiyanı eyni vaxtda yalnız 1 consumer oxuya bilər.
<!-- answer-end -->

#### Sual 2: Kafka-da ZooKeeper əvəzinə KRaft rejiminin gəlməsi hansı əsas üstünlüyü verdi?
<!-- answer-start -->
**Cavab:** Xarici ZooKeeper klasterini saxlamaq məcburiyyətini və ikiqat RAM/şəbəkə xərcini aradan qaldırdı. Kafka brokerləri daxili Raft konsensusu ilə metadatanı özləri idarə edir, klaster daha sürətli açılır və bərpa müddəti qısalır.
<!-- answer-end -->
