# QA_AUDIT_PLAN.md — Sayt Məzmununun Peşəkar Yoxlanılması və Standartlaşdırılması Planı

Bu sənəd saytdakı bütün dərs izahlarının, kodların və praktiki məşqlərin sıfırdan sistemli şəkildə yoxlanılması, qarışıq siyahıların təmizlənməsi, oxunaqlı pedaqoji formata salınması və texniki səhvlərin aradan qaldırılması üçün rəsmi yol xəritəsidir. Hər addım tamamlandıqdan sonra status bu faylda yenilənəcəkdir.

---

## Məzmun və Format Standartı (Hər bir dərs üçün məcburi qaydalar)

1. **Qadağandır:** Çoxqatlı iç-içə `- **Başlıq**: - **Alt**: - Dəyər` kimi sıx siyahılar.
2. **Tələb olunur:**
   - Hər bir konsept üçün aydın yarımbaşlıq (`###`, `####`).
   - 2-4 cümləlik oxunaqlı, təbii izah abzası (paragraph).
   - Parametrlər və müqayisələr üçün səliqəli Markdown cədvəli (`| Parametr | Təyinatı | Standart Dəyər | Məsləhət |`).
   - Yalnız zəruri hallarda vurğulama (hər sözü `**` ilə bold etməmək).
   - Kritik qeydlər üçün vizual qutular (`[!NOTE]`, `[!TIP]`, `[!WARNING]`).
   - Bütün kod bloklarında dialekt göstərilməsi (`-- Dialect: T-SQL`, `-- Dialect: PostgreSQL`, `PySpark`, `Python`).
   - Heç bir uydurma funksiya və ya əmr olmamalıdır; əmin olunmayan yerdə `"yoxla"` qeyd edilməlidir.

---

## Yoxlama Mərhələləri və İcra Statusu

### Mərhələ 1: Ən Böyük M2 Dərsləri (Mövzu 01 - 06) — İLKİNDİR
Ən çox qarışıq siyahıların və sıx terminlərin olduğu əsas təməl dərslər:
- [x] **Addım 1.1: `03-postgresql-internals.md` (Tamamlandı)**
  - Postmaster prosesi və yaddaş sahələrini (`shared_buffers`, `work_mem`, `maintenance_work_mem`) cədvəl və abzaslarla yenidən formatlandı.
  - MVCC, `xmin`/`xmax`, Dead Tuples, VACUUM və Autovacuum tənzimləmələri səliqəli şəkildə strukturlaşdırıldı.
  - B-tree, GIN, GiST, BRIN indeksləri və partisiya növləri cədvəl halına salındı.
- [x] **Addım 1.2: `05-data-modelling-warehousing.md` (Tamamlandı)**
  - Fakt və Ölçü cədvəllərinin daxili qarışıq siyahıları ləğv edildi, səliqəli alt-bölmələrə və müqayisə cədvəllərinə ayrıldı.
  - Transactional, Periodic Snapshot, Accumulating Snapshot fakt növləri sığorta nümunələri ilə sadə cədvəldə izah edildi.
  - SCD Type 0, 1, 2, 3 fərqləri və Surrogate Key-in 3 zəruri səbəbi aydın şəkildə strukturlaşdırıldı.
- [x] **Addım 1.3: `01-sql-fundamentals-advanced.md` (Tamamlandı)**
  - JOIN növləri, Window sıralama funksiyaları və ACID izolyasiya səviyyələri müqayisə cədvəllərinə salındı.
  - T-SQL və PostgreSQL dialekt tabları və kod sintaksisləri təsdiqləndi.
- [x] **Addım 1.4: `02-microsoft-sql-server.md` (Tamamlandı)**
  - Buffer Pool, Data/Log faylları, T-SQL obyektləri və Tempdb strukturları detallı cədvəllərlə yenidən tərtib edildi.
  - DMV-lər, Wait Stats və ilk 2 həftəlik inventarizasiya planı səliqəli dərslik formasına salındı.
- [x] **Addım 1.5: `04-sql-server-postgresql-miqrasiya.md` (Tamamlandı)**
  - Data type mapping cədvəli, T-SQL $\rightarrow$ PL/pgSQL çevrilmələri, çətin obyektlər və 4 səviyyəli Data Validation cədvəli səliqəyə salındı.
  - CDC Near-Zero Downtime, Cutover qrafiki və Rollback strategiyası aydın təlimat şəklinə gətirildi.
- [x] **Addım 1.6: `06-lakehouse-table-formats.md` (Tamamlandı)**
  - Amazon S3 saxlama sinifləri, Row vs Columnar və Iceberg 3-qatlı metadata arxitekturası müqayisə cədvəllərinə salındı.
  - Delta Lake (`_delta_log`), Medallion diaqramı və Small Files həlləri səliqəli vizual bloklarla strukturlaşdırıldı.

---

### Mərhələ 2: Yığcam Mövzular (Mövzu 07 - 15)
Hər biri 1 səhifəlik xülasə formatında olan dərslərin auditi:
- [ ] **Addım 2.1: `07-apache-spark-pyspark.md`** (Driver, Executor, Catalyst, Shuffle, Broadcast)
- [ ] **Addım 2.2: `08-python-for-data-engineering.md`** (Generators, Decorators, Pool, GIL)
- [ ] **Addım 2.3: `09-apache-airflow-orchestration.md`** (DAG, Idempotency, Sensors, XCom)
- [ ] **Addım 2.4: `10-kafka-realtime-streaming.md`** (KRaft, Partitions, Lag, Consumer Groups)
- [ ] **Addım 2.5: `11-nosql-and-rest-apis.md`** (MongoDB, Redis, CAP, Flattening)
- [ ] **Addım 2.6: `12-data-quality-governance.md`** (Quality dimensions, Quarantine, PII)
- [ ] **Addım 2.7: `13-architecture-standards-decisions.md`** (ADR, Standards, ELT vs ETL)
- [ ] **Addım 2.8: `14-docker-linux-git-infra.md`** (Docker compose, Linux commands, Git)
- [ ] **Addım 2.9: `15-insurance-domain-primer.md`** (Atəşgah sığorta biznes anlayışları, Loss Ratio)

---

### Mərhələ 3: 3 CV Layihəsinin Məzmun Auditi
- [ ] **Addım 3.1: `01-lakehouse-medallion.md`** (60s pitch, 3m izah, diaqram, qərarlar cədvəli, 14 sual-cavab, metrikalar)
- [ ] **Addım 3.2: `02-crypto-streaming.md`** (Kafka KRaft, Spark Streaming, Checkpoint, 14 sual-cavab)
- [ ] **Addım 3.3: `03-banking-batch-star-schema.md`** (5 DQ qapısı, Karantin, SCD2, Kimball Star Schema, 15 sual-cavab)

---

### Mərhələ 4: Praktiki Bölmələr və Məşqlər
- [ ] **Addım 4.1: `gaps.md`** (6 boşluq üzrə dürüst yanaşma, qadağan ifadələr, 30/60/90 plan)
- [ ] **Addım 4.2: `scenarios.md`** (5 istehsalat ssenarisinin model həlləri)
- [ ] **Addım 4.3: `sql-practice.json`** (10 SQL tapşırığının T-SQL və PostgreSQL həllərinin doğruluğu)
- [ ] **Addım 4.4: `behavioral.md`** (30s/1m/2m özünü təqdimat, 4 STAR hekayəsi, 10 ağıllı sual)
- [ ] **Addım 4.5: `glossary.json`** (40 terminin tərifi və lüğət axtarışı)
- [ ] **Addım 4.6: `mock.ts`** (Mock interview axını, taymer və öz-qiymətləndirmə mexanizmi)

---

### Mərhələ 5: Texniki Renderer və UI Görünüş Testi
- [ ] **Addım 5.1: Markdown Renderer Auditi**
  - `src/content-loader.ts` daxilində başlıqlardan `**` təmizlənməsi və `extractHeadings` funksiyasının HTML çıxışının yoxlanması.
- [ ] **Addım 5.2: CSS və Tipografiya**
  - Siyahıların (`ul`, `ol`, `li`), cədvəllərin və `callout` bloklarının brauzerdə təmiz və oxunaqlı açılması.
- [ ] **Addım 5.3: Çoxlu Ekran Testi (Responsive)**
  - 375px (mobil), 768px (planşet) və 1440px (desktop) ekranlarda üfüqi sürüşmənin (overflow) olmaması və kod bloklarının rahat oxunması.
