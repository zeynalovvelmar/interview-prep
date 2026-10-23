---
id: "14-docker-linux-git-infra"
slug: "docker-linux-git-infrastruktur"
order: 14
title: "Docker, Linux & Git İnfrastruktur Əsasları"
category: "İnfrastruktur"
priority: "high"
readiness: "guclu"
vacancyLink: "Məlumat infrastrukturlarının qurulması, konteynerləşdirmə, Linux mühitində avtomatlaşdırma və Git versiya nəzarəti"
tags: ["Docker", "docker-compose", "Linux", "Bash", "Git", "CI/CD", "Environment Variables", "Volumes"]
summary: "Konteynerləşdirmə prinsipləri, multi-stage Dockerfile, docker-compose ilə DE laboratoriyası (Postgres, MinIO, Airflow), Linux əmrləri və Git əməkdaşlığı."
---

# Docker, Linux & Git İnfrastruktur Əsasları

## 1. Qısa İzah və Analogiya

Junior Data Mühəndisi təkcə SQL və Python kodu yazmaqla kifayətlənmir; o, həmin kodun işlədiyi server mühitini təşkil etməyi, servisləri bir-birinə bağlamağı və istehsalatda baş verən sistem nasazlıqlarını diaqnostika etməyi bacarmalıdır.

Data platformalarının 95%-i **Linux** əməliyyat sistemində işləyir. Bütün müasir ETL/ELT alətləri (Airflow, Spark, Kafka, MinIO, PostgreSQL) isə **Docker** konteynerlərində təcrid olunmuş şəkildə qaldırılır. Kodun və konfiqurasiyaların tarixçəsi isə **Git** ilə qorunur.

> [!NOTE]
> **Analogiya:** Təsəvvür edin ki, yüksək səviyyəli bir restoran açırsınız. Əgər mətbəxin su və qaz xətləri (Linux Əməliyyat Sistemi), hər aşpaza ayrılmış xüsusi təmiz iş masası və qab-qacaq dəsti (Docker Konteynerləri) və hər gün yenilənən rəsmi resept dəftəri (Git Versiya Nəzarəti) olmasa, aşpaz nə qədər bacarıqlı olsa da xaos yaranacaq və müştərilərə yemək vaxtında çatmayacaq.

Docker sayəsində proqramlaşdırma dünyasının ən qədim bəhanəsi — *"Mənim noutbukumda işləyirdi, serverdə niyə partladı?"* problemi birdəfəlik aradan qalxır.

---

## 2. Əsas Anlayışlar və Memarlıq Detalları

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      HOST MACHINE (Linux OS)                           │
 │                                                                        │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │ DOCKER ENGINE                                                    │  │
 │  │                                                                  │  │
 │  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │  │
 │  │  │ de_postgres      │  │ de_minio (S3)    │  │ de_airflow     │  │  │
 │  │  │ (Port 5432)      │  │ (Port 9000, 9001)│  │ (Port 8080)    │  │  │
 │  │  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │  │
 │  │           │                     │                    │           │  │
 │  │  ═════════╪═════════════════════╪════════════════════╪═════════  │  │
 │  │           │      Docker Network: 'data_network'      │           │  │
 │  └───────────┼─────────────────────┼────────────────────┼───────────┘  │
 │              │                     │                    │              │
 │  ┌───────────▼───────────┐ ┌───────▼──────────┐ ┌───────▼───────────┐  │
 │  │ Volume: pg_data       │ │ Volume: minio_data│ │ Volume: af_logs   │  │
 │  │ (/var/lib/postgresql) │ │ (/data)          │ │ (/opt/airflow/logs│  │
 │  └───────────────────────┘ └──────────────────┘ └───────────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Docker və Konteynerləşdirmənin Əsasları

Ənənəvi Virtual Maşınlar (VM — VMware, VirtualBox) hər mühit üçün bütöv bir Guest OS (bir neçə GB RAM və disk) tələb edir.

**Docker Konteyneri** isə xüsusi OS quraşdırmır; o, birbaşa ana kompüterin (Host) Linux nüvəsindən (Kernel) istifadə edir və prosesləri iki Linux mexanizmi ilə təcrid edir:
- **Namespaces:** Prosesin yalnız öz fayl sistemini, öz şəbəkə portlarını və öz proses ağacını görməsini təmin edir.
- **Cgroups (Control Groups):** Konteynerin istifadə edə biləcəyi maksimum CPU və RAM limitini təyin edir (məsələn, konteynerə maksimum 2GB RAM ayırmaq).

#### Dockerfile Əsas Təlimatları

| Təlimat | Təyinatı | Ən Yaxşı Təcrübə (Best Practice) |
| :--- | :--- | :--- |
| `FROM` | Əsas götürülən baza imic (Base Image). | Böyük `ubuntu:latest` əvəzinə yüngül `python:3.11-slim` seçin. |
| `WORKDIR` | Konteyner daxilindəki işçi qovluq. | Həmişə mütləq yol təyin edin (məs: `WORKDIR /app`). |
| `COPY` | Host maşından konteynerə fayl köçürmək. | `.dockerignore` istifadə edərək `.git` və `venv` fayllarını köçürməyin. |
| `RUN` | İmic yığılarkən proqramları quraşdıran əmr. | Qatları (layers) azaltmaq üçün `&&` ilə birləşdirin. |
| `ENV` | Konteyner daxili mühit dəyişənləri. | Həssas şifrələri bura yazmayın; onları runtime zamanı verin. |
| `USER` | Təhlükəsizlik üçün işləyən istifadəçi. | Heç vaxt tətbiqi `root` hüququ ilə işlətməyin; qeyri-root istifadəçi yaradın. |
| `CMD` | Konteyner işə düşəndə (run) icra olunan əsas əmr. | `CMD ["python", "main.py"]` şəklində JSON massivi kimi yazın. |

---

### 2.2. docker-compose ilə Çoxkonteynerli DE Laboratoriyası

Tək bir `docker run` əmri ilə 3 fərqli servisi (Postgres, MinIO, Airflow) qaldırmaq və onları eyni şəbəkəyə bağlamaq çox zəhmətlidir. **docker-compose** bütün bu servisləri vahid `docker-compose.yml` sənədində bəyan edir (Declarative Infrastructure).

- **Daxili DNS Şəbəkəsi:** Eyni docker-compose daxilindəki servislər bir-birinə IP ünvanı ilə deyil, birbaşa servis adı ilə müraciət edir (məsələn, Python skripti üçün host ünvanı sadəcə `postgres:5432` və ya `minio:9000` olur).
- **Docker Volumes:** Konteynerlər müvəqqətidir (Ephemeral); konteyner silinərsə daxildəki fayllar itir. Məlumatların toxunulmaz qalması üçün host maşının diski konteynerə bağlanır (**Named Volume**).

---

### 2.3. Data Mühəndisi üçün Ən Vacib Linux Əmrləri

| Əmr | Təyinatı və İş Mexanizmi | Data Engineering Ssenarisi |
| :--- | :--- | :--- |
| `tail -f -n 100 app.log` | Loq faylının son 100 sətrini göstərir və yeni yazılan sətirləri canlı axıdır. | Airflow task-ının və ya Spark job-unun canlı xətalarını izləmək. |
| `grep -rn "ERROR" /var/log/` | Bütün qovluqdakı fayllarda "ERROR" sözünü sətir nömrəsi ilə axtarır. | Gecə baş vermiş xətanın səbəbkar faylını saniyələr içində tapmaq. |
| `awk -F',' '{print $1, $4}'` | Mətni və ya CSV-ni vergüllə bölüb yalnız müəyyən sütunları çıxarır. | 50 GB-lıq faylı açmadan ilk 10 sətrin sütunlarına baxmaq. |
| `df -h` / `du -sh *` | Diskdə qalan boş yeri və qovluqların fiziki ölçüsünü göstərir. | Serverdə diskin dolub ETL borusunu dondurduğunu aşkar etmək. |
| `free -m` / `top` / `htop` | RAM yaddaşını və CPU-nu ən çox istifadə edən prosesləri göstərir. | Yaddaşı tükəndirən (OOM yaradan) Python və ya Java prosesini tapmaq. |
| `netstat -tulpn` / `ss -tulpn` | Hansı portların açıq olduğunu və hansı proqramın dinlədiyini göstərir. | `Port 5432 already in use` xətasını araşdırmaq. |
| `chmod 755` / `chown` | Fayl və qovluqlara oxuma/yazma/icra hüquqları verir və sahibini dəyişir. | Bash və Airflow skriptlərinə icra (`+x`) hüququ vermək. |

---

### 2.4. Git Versiya Nəzarəti və Komanda Əməkdaşlığı

Data boru kəmərlərinin kodları tək bir yerdə saxlanmamalı, Git ilə versiyalanmalıdır:

1. **Budaqlanma (Branching):** Əsas `main` qoluna heç vaxt birbaşa kod göndərilmir. Hər yeni ETL tapşırığı üçün ayrıca qol açılır (`git checkout -b feature/minio-bronze-ingest`).
2. **Commit Qaydaları:** Commit mesajları konkret və anlaşıqlı olmalıdır (`feat: add idempotent deduplication for claims`).
3. **Məxfilik və `.gitignore`:**
   - Heç vaxt verilənlər bazası parollarını, API tokenlərini və ya AWS açarlarını Git-ə göndərməyin!
   - Bütün şifrələr lokal `.env` faylında saxlanılır və `.gitignore`-a mütləq əlavə olunur. Repozitoriyada yalnız şablondan ibarət `.env.example` saxlanılır.

---

## 3. Praktik İnfrastruktur Kod Nümunələri

### 3.1. Data Engineering üçün İstehsalata Hazır `docker-compose.yml`

```yaml
# Dialect: Docker Compose (v3.8+)
version: '3.8'

services:
  # 1. Analitik Metadata və DWH Bazası (PostgreSQL 16)
  postgres:
    image: postgres:16-alpine
    container_name: ateshgah_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-elmar}
      POSTGRES_PASSWORD: ${DB_PASS:-secret123}
      POSTGRES_DB: ateshgah_dwh
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - data_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-elmar} -d ateshgah_dwh"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. S3-Uyğun Obyekt Anbarı (MinIO Lakehouse)
  minio:
    image: minio/minio:RELEASE.2024-01-18T22-51-28Z
    container_name: ateshgah_minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-admin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-admin12345}
    ports:
      - "9000:9000"   # S3 API endpoint
      - "9001:9001"   # Veb UI idarəetmə paneli
    volumes:
      - minio_data:/data
    networks:
      - data_network

networks:
  data_network:
    driver: bridge

volumes:
  pg_data:
    driver: local
  minio_data:
    driver: local
```

### 3.2. Çoxmərhələli (Multi-Stage) Optimallaşdırılmış `Dockerfile`

```dockerfile
# Dialect: Dockerfile
# Mərhələ 1: Yığım və Asılılıqların Kompilyasiyası (Builder Stage)
FROM python:3.11-slim AS builder

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Mərhələ 2: Yüngül İstehsalat İmici (Final Stage - Cəmi ~120MB)
FROM python:3.11-slim

WORKDIR /app

# Təhlükəsizlik: Qeyri-root istifadəçi yaradılması
RUN groupadd -r de_group && useradd -r -g de_group de_user

# Kompilyasiya olunmuş paketləri builder-dən kopyalayırıq
COPY --from=builder /root/.local /home/de_user/.local
COPY --chown=de_user:de_group . /app

ENV PATH=/home/de_user/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

USER de_user

CMD ["python", "src/main.py"]
```

### 3.3. Servislərin Sağlamlığını Yoxlayan İstehsalat Bash Skripti

```bash
#!/usr/bin/env bash
# Dialect: Bash (Linux / POSIX)
# Script: check_pipeline_readiness.sh

set -euo pipefail

echo "============================================="
echo "   ATESHGAH DATA INFRASTRUCTURE HEALTH CHECK "
echo "============================================="

# 1. Disk sahəsinin yoxlanması (Əgər disk 90%-dən çox dolubsa xəbərdarlıq et)
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  DİQQƏT: Disk dolmaq üzrədir! Cari istifadə: ${DISK_USAGE}%"
else
    echo "✅ Disk sahəsi normaldır: ${DISK_USAGE}% istifadə olunur."
fi

# 2. PostgreSQL xidmətinin yoxlanması
echo "PostgreSQL bağlantısı yoxlanılır (localhost:5432)..."
if nc -z localhost 5432; then
    echo "✅ PostgreSQL aktivdir və portu dinləyir."
else
    echo "❌ XƏTA: PostgreSQL-ə qoşulmaq mümkün olmadı!"
    exit 1
fi

# 3. MinIO S3 xidmətinin yoxlanması
echo "MinIO S3 endpoint yoxlanılır (http://localhost:9000/minio/health/live)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live || true)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ MinIO S3 serveri sağlamdır (HTTP 200 OK)."
else
    echo "❌ XƏTA: MinIO S3 qeyri-aktivdir! Status: ${HTTP_STATUS}"
    exit 1
fi

echo "============================================="
echo "Bütün infrastruktur ETL borusu üçün hazırdır!"
```

---

## 4. Tez-tez Edilən Səhvlər və Həll Yolları

### Səhv 1: Docker Volumes Göstərilmədən Verilənlər Bazasını Qaldırmaq
- **Problem:** `docker run -p 5432:5432 postgres` əmri ilə bazanı qaldırmaq və həcm (volume) təyin etməmək. Konteyner yenilənəndə və ya dayandıqda cədvəllər və bütün sığorta polisləri silinir.
- **Həll Yolu:** Həmişə Named Volume (`-v pg_data:/var/lib/postgresql/data`) istifadə edin ki, konteyner silinsə belə məlumat host diskində toxunulmaz qalsın.

### Səhv 2: `docker compose down -v` Ehtiyatsızlığı
- **Problem:** Tərtibatçı konteynerləri söndürmək üçün `docker compose down -v` yazır. Sondakı `-v` (volumes) bayrağı bütün bağlı həcmləri birdəfəlik məhv edir!
- **Həll Yolu:** Konteynerləri dayandırarkən sadəcə `docker compose down` yazın; `-v` bayrağını yalnız məlumatları şüurlu şəkildə sıfırlamaq istədikdə istifadə edin.

### Səhv 3: Parolların və Gizli Açarların Git-ə Düşməsi
- **Problem:** Kodun içinə `password='admin123'` və ya AWS Secret Key yazıb `git commit` etmək. Repozitoriya açıq olarsa parollar anında kənar şəxslərin əlinə keçir.
- **Həll Yolu:** Layihəyə dərhal `.gitignore` faylı əlavə edin və ora `.env`, `*.pem`, `*.key` qeyd edin. Koddakı parametrləri `os.getenv("DB_PASSWORD")` ilə oxuyun.

---

## 5. Vakansiya ilə Əlaqə və Müsahibədə Yanaşma (Atəşgah Sığorta)

Atəşgah Sığortada IT və Data infrastrukturu həm yerli (on-premise) serverlərdən, həm də konteynerləşdirilmiş mikroservislərdən ibarətdir. Data Mühəndisi öz ETL borularını, Airflow DAG-larını və bazalarını Docker mühitində avtomatlaşdırmağı, Linux loqlarını araşdırmağı və komanda ilə Git üzərindən təmiz budaqlanma ilə işləməyi bacarmalıdır.

> [!TIP]
> **Müsahibədə belə de:**
> "Mən bütün analitik və boru kəməri layihələrimi **Docker Compose** mühitində quraşdırmışam (PostgreSQL, S3-uyğun MinIO və Airflow).
> 
> Əsas vərdişlərim:
> 1) **Mühit təhlükəsizliyi və izolyasiya:** Məlumat itkisinin qarşısını almaq üçün mütləq `Docker Named Volumes` istifadə edirəm, tətbiqləri qeyri-root istifadəçi ilə işlədirəm.
> 2) **Linux gigiyenası:** Gündəlik işimdə loqların təhlili (`tail -f`, `grep`, `awk`), yaddaş və disk nəzarəti (`df -h`, `free -m`) üçün Linux əmrlərindən rahat istifadə edirəm.
> 3) **Git standartları:** Həssas məlumatları heç vaxt repozitoriyaya göndərmirəm, `.env` və `.gitignore` qaydalarına ciddi riayət edirəm və təmiz budaqlanma (feature branches) ilə işləyirəm."

---

## 6. 3 Suallıq İnteraktiv Mini-Quiz

#### Sual 1: Docker konteynerlərində `Volumes` (Host Mount) nə üçündür və baza niyə volumes-siz işlədilməməlidir?
<!-- answer-start -->
**Cavab:** Docker konteynerləri mahiyyətcə müvəqqətidir (stateless/ephemeral); konteyner dayandıqda və ya yenidən yaradıldıqda onun daxilindəki yazılmış bütün yeni fayllar ləğv edilir. `Volumes` konteynerin daxili qovluğunu host maşınının fiziki diskinə bağlayır. Verilənlər bazasını (PostgreSQL, MinIO) volume olmadan işlətmək faciəvidir; çünki konteyner yenilənən kimi bütün tarixi bazalar məhv olar.
<!-- answer-end -->

#### Sual 2: Linux-da böyük bir sığorta log faylında "ERROR" sözü olan sonuncu 50 sətri tapıb canlı axınla izləmək üçün hansı əmr işlədilir?
<!-- answer-start -->
**Cavab:** `grep -i "error" /var/log/pipeline.log | tail -50` (fayldakı son 50 xətanı göstərir) və ya faylı canlı izləyərkən yalnız xətaları süzmək üçün: `tail -f /var/log/pipeline.log | grep --line-buffered -i "error"`.
<!-- answer-end -->

#### Sual 3: `git merge` və `git rebase` arasındakı fərq nədir və nə vaxt rebase-dən ehtiyatla istifadə edilməlidir?
<!-- answer-start -->
**Cavab:** `git merge` iki budağı birləşdirərək yeni bir "Merge commit" yaradır və hər iki qolun tarixi strukturunu olduğu kimi qoruyur. `git rebase` isə cari qolun commit-lərini hədəf qolun ən son commit-inin üzərinə köçürərək düz, xətti (linear) bir tarixçə formalaşdırır. **Qayda:** Artıq ortaq serverə (`remote origin`) göndərilmiş və digər komanda üzvlərinin istifadə etdiyi ümumi qollarda (məsələn, `main` və ya `develop`) heç vaxt `rebase` edilməməlidir; çünki o, commit heşlərini dəyişərək digər tərtibatçıların tarixçəsini korlayır.
<!-- answer-end -->
