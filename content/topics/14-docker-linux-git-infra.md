---
id: "14-docker-linux-git-infra"
slug: "docker-linux-git-infrastruktur"
order: 14
title: "Docker, Linux & Git İnfrastruktur Əsasları"
category: "İnfrastruktur"
priority: "medium"
readiness: "guclu"
vacancyLink: "Məlumat infrastrukturlarının qurulması, konteynerləşdirmə və versiya nəzarəti"
tags: ["Docker", "docker-compose", "Linux", "Bash", "Git", "CI/CD", "Environment Variables"]
summary: "Konteynerləşdirmə, docker-compose ilə lokal DE mühiti (Postgres + MinIO + Airflow), Linux əmrləri və Git vərdişləri."
---

# Docker, Linux & Git İnfrastruktur Əsasları

## 1. Qısa Xülasə (150-250 Söz)

Data Mühəndisi təkcə kod yazmır, həm də həmin kodun işlədiyi mühiti qurmağı və idarə etməyi bacarmalıdır. **Linux** əksər istehsalat serverlərinin əməliyyat sistemidir; gündəlik loqların analizi (`grep`, `tail -f`, `awk`), yaddaş və disk nəzarəti (`df -h`, `free -m`, `top`) və hüquqların idarəsi (`chmod`, `chown`) mühəndisin əsas alətləridir.

**Docker** asılılıqları təcrid edərək "mənim kompüterimdə işləyirdi, serverdə işləmir" problemini aradan qaldırır. Data Engineering-də bir neçə servisi (məsələn, PostgreSQL + MinIO S3 + Airflow) vahid şəbəkədə birləşdirmək üçün **docker-compose** istifadə olunur. Konfiqurasiyalar və şifrələr heç vaxt koda yazılmır, `.env` fayllarında mühit dəyişənləri (Environment Variables) kimi ötürülür.

**Git** isə boru kəməri kodlarının versiyalanmasını, təhlükəsiz budaqlanmanı (`feature/bronze-clean`) və CI/CD avtomatlaşdırmasını təmin edir.

## 2. Praktik Kod Nümunəsi

```yaml
# docker-compose.yml: Lokal Data Engineering İnfrastrukturu (Postgres + MinIO S3)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: de_postgres
    environment:
      POSTGRES_USER: ${DB_USER:-elmar}
      POSTGRES_PASSWORD: ${DB_PASS:-secret}
      POSTGRES_DB: ateshgah_dwh
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: de_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-admin}
      MINIO_ROOT_PASSWORD: ${MINIO_PASS:-admin123}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  pg_data:
  minio_data:
```

## 3. 2 Suallıq Mini-Quiz

#### Sual 1: Docker konteyneri dayandıqda (stop/down) daxilindəki bazanın məlumatlarının silinməməsi üçün nə təyin olunmalıdır?
<!-- answer-start -->
**Cavab:** Docker Volumes (və ya bind mount). Məlumatlar host maşının diskində xüsusi həcmə (məsələn, `pg_data:/var/lib/postgresql/data`) bağlandıqda, konteyner silinsə belə bazanın məlumatları toxunulmaz qalır.
<!-- answer-end -->

#### Sual 2: Linux-da böyük bir ETL loq faylının yalnız sonuncu 100 sətrini canlı izləmək üçün hansı əmr işlədilir?
<!-- answer-start -->
**Cavab:** `tail -100f /var/log/airflow/scheduler.log` (`-f` bayrağı fayla yeni yazılan sətirləri anında ekranda axıdır).
<!-- answer-end -->
