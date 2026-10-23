# PLAN.md — Layihənin İcazə və İcra Planı (Implementation Plan)

Bu sənəd **Atəşgah Sığorta Şirkəti** "Data Mühəndisi" vakansiyası üzrə Elmar üçün hazırlanacaq mobil-yönümlü statik müsahibə hazırlığı veb-tətbiqinin tam memarlıq və icra planıdır.

---

## 1. Məqsəd və Prinsiplər
1. **İstifadə ssenarisi**: Telefonda rahat oxumaq, sualları drill etmək, avtobusda/yolda təkrar etmək; kompüterdə dərin mütaliə və SQL tapşırıqları.
2. **Texnologiya**: Vite + Vanilla TypeScript + Vanilla CSS + PWA (Service Worker + Manifest). Heç bir arxa plan (backend), heç bir verilənlər bazası tələb olunmur. Bütün vəziyyət `localStorage`-də saxlanılır.
3. **Məzmun və Kodun Ayrılığı**: Bütün məzmun `content/` qovluğunda Markdown (`.md`) və JSON faylları şəklindədir. Sayt bu faylları avtomatik oxuyur; yeni fayl əlavə edildikdə kod dəyişdirilmədən dərhal saytda görünür.
4. **Dil Qaydası**: Bütün görünən mətnlər səlis, aydın və yığcam Azərbaycan dilindədir. Texniki terminlər (ETL, Lakehouse, DAG, CDC, SCD Type 2, Idempotency, Buffer Pool və s.) orijinal İngilis dilində saxlanılır.
5. **Dürüstlük Qaydası**: Namizədin təcrübəsi `CONTENT_PLAN.md`-də qeyd edilənlərlə məhduddur. Təcrübədə olmayan sahələr (məs. real production MS SQL Server, real Iceberg, real AWS) üçün *"Hands-on görməmişəm, amma yanaşmam belədir..."* şablonu tətbiq olunur.

---

## 2. Qovluq və Fayl Strukturu

```text
interview-prep/
├── AGENTS.md                   # Əsas qaydalar (dəyişdirilmir)
├── SPEC.md                     # Texniki tələblər (dəyişdirilmir)
├── CONTENT_PLAN.md             # Məzmun planı və namizəd profili (dəyişdirilmir)
├── PLAN.md                     # Bu icra planı
├── README.md                   # İstifadə, deploy və yerli işə salma təlimatı
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html                  # Əsas HTML, meta-teqlər, FOUC qarşısını alan tema skripti
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── manifest.webmanifest    # PWA quraşdırma manifesti
│   └── sw.js                   # Oflayn keşləmə üçün Service Worker
├── src/
│   ├── main.ts                 # Giriş nöqtəsi və router
│   ├── style.css               # Dizayn sistemi, CSS dəyişənləri, light-dark(), responsive
│   ├── types.ts                # TypeScript interfeysləri
│   ├── router.ts               # Hash-əsaslı client-side marşrutlaşdırma (#/, #/topics, #/qa...)
│   ├── state/
│   │   ├── progress.ts         # Öyrənilmiş mövzular və sual statusları (localStorage)
│   │   └── theme.ts            # Light / Dark / System tema idarəedicisi
│   ├── content-loader.ts       # content/ qovluğunu avtomatik indeksləyən və parse edən modul
│   ├── search/
│   │   └── search-index.ts     # Qlobal axtarış indeksi və açar söz filtrləməsi
│   ├── components/
│   │   ├── navbar.ts           # Yuxarı naviqasiya və axtarış/tema düymələri
│   │   ├── sidebar.ts          # Desktop menyu və mobil drawer
│   │   ├── bottom-nav.ts       # Mobil üçün alt naviqasiya zolağı (<= 768px)
│   │   ├── search-modal.ts     # <dialog closedby="any"> axtarış pəncərəsi
│   │   ├── code-block.ts       # Dialekt etiketi, kopyalama və sətr bükmə funksiyalı kod bloku
│   │   ├── dialect-tabs.ts     # T-SQL | PostgreSQL müqayisəli tablar
│   │   ├── callout.ts          # "Qeyd", "Diqqət", "Müsahibədə belə de" qutuları
│   │   ├── mini-quiz.ts        # Tap-to-reveal mini-test komponenti
│   │   └── toc.ts              # Desktop üçün "Bu səhifədə" yapışqan məzmun siyahısı
│   └── pages/
│       ├── home.ts             # Vakansiya xəritəsi, hazırlıq statusu, son 24 saat
│       ├── topics-list.ts      # Bütün mövzuların kateqoriyalı siyahısı
│       ├── topic-detail.ts     # Fərdi mövzu səhifəsi şablonu
│       ├── qa-bank.ts          # Filtrli və axtarışlı sual-cavab bankı
│       ├── projects-list.ts    # 3 əsas layihənin xülasəsi
│       ├── project-detail.ts   # Layihə dərin təhlili (pitch, arxitektura, qərarlar, 20+ sual)
│       ├── gaps.ts             # Boşluqlar üzrə cavab strategiyaları
│       ├── scenarios.ts        # 10+ real memarlıq və istehsalat ssenarisi
│       ├── sql-practice.ts     # T-SQL və PostgreSQL həlləri ilə məşqlər
│       ├── cheatsheets.ts      # Çap üçün hazır konspektlər və müqayisə cədvəlləri
│       ├── behavioral.ts       # STAR hekayələri, özünü təqdimat və suallar
│       ├── glossary.ts         # 100+ termin üçün lüğət
│       └── mock-interview.ts   # 10 təsadüfi sualdan ibarət sınaq müsahibəsi
└── content/
    ├── topics/                 # <nn>-<slug>.md
    ├── qa/                     # <category>.json
    ├── projects/               # <slug>.md və <slug>-qa.json
    ├── scenarios/              # <slug>.md
    ├── sql-practice/           # <nn>-<slug>.json
    ├── cheatsheets/            # <slug>.md
    ├── behavioral/             # *.md
    └── glossary.json           # [{ term, definition }]
```

---

## 3. Məlumat Modelləri və Şemalar

### 3.1. Mövzu Frontmatter (`content/topics/*.md`)
```yaml
---
id: "sql-server-architecture"
slug: "sql-server-memarligi"
order: 2
title: "Microsoft SQL Server Memarlığı"
category: "Microsoft SQL Server"
priority: "high" # high | medium | low
readiness: "oyrenmeliyem" # guclu | orta | oyrenmeliyem
vacancyLink: "Mövcud Microsoft SQL Server mühitinin təhlili və qiymətləndirilməsi"
tags: ["SQL Server", "Buffer Pool", "Transaction Log", "Recovery Models", "DMV"]
---
```

### 3.2. Sual-Cavab Elementi (`content/qa/*.json`)
```json
{
  "id": "sql-01",
  "category": "SQL",
  "difficulty": "Medium",
  "question": "Clustered və Non-Clustered index arasındakı daxili fərq nədir?",
  "answer": "Clustered index cədvəlin fiziki saxlanma ardıcıllığını təyin edir...",
  "code": {
    "language": "sql",
    "dialect": "T-SQL",
    "snippet": "CREATE CLUSTERED INDEX IX_Policy_ID ON Policies(PolicyID);"
  },
  "followUps": [
    "Cədvəldə niyə yalnız 1 Clustered index ola bilər?",
    "Covering index nədir və Lookup əməliyyatını necə aradan qaldırır?"
  ]
}
```

### 3.3. Tərəqqi Vəziyyəti (Progress Store - `localStorage`)
```json
{
  "topics": {
    "sql-server-memarligi": { "learned": true, "updatedAt": 1740000000 }
  },
  "questions": {
    "sql-01": { "status": "bilirem", "updatedAt": 1740000000 },
    "mig-02": { "status": "tekrar", "updatedAt": 1740000000 }
  },
  "mockHistory": [
    { "date": "2026-10-24", "score": 8, "total": 10 }
  ]
}
```

---

## 4. UI və İstifadəçi Təcrübəsi (UX) Dizaynı

1. **Rəng Sistemi və Tema**:
   - Modern `light-dark()` dəstəyi ilə CSS dəyişənləri.
   - Vahid vurğu rəngi: Dərin Okean Göyü / Sığorta Etibarlılığı (`#1d4ed8` light / `#3b82f6` dark).
   - `prefers-color-scheme` avtomatik tanınır, istifadəçinin seçimi `localStorage`-də qorunur.
   - İlk yükləmədə ağ/qara yanıb-sönmənin (FOUC) qarşısını almaq üçün `<head>` daxilində mini inline skript.
2. **Həssas Uyğunlaşma (Responsive Grid)**:
   - **Mobil (< 768px)**: Sabit başlıq, sürüşən naviqasiya çekmecesi (drawer), rahat alt naviqasiya (bottom navigation bar), toxunma hədəfləri $\ge 44\text{px}$. Heç bir üfüqi səhifə sürüşməsi yoxdur.
   - **Planşet (768px – 1024px)**: Kompakt yan panel, 2 sütunlu kartlar.
   - **Desktop (> 1024px)**: Sabit sol menyu, rahat oxu eni (~70ch), sağ tərəfdə səhifədaxili naviqasiya (TOC).
3. **Komponentlər**:
   - **Axtarış Dialogu**: `<dialog closedby="any">` və brauzer dəstəyi olmayanlar üçün xarici klik fallback-i. Qlobal `/` və ya `Ctrl+K` qısayolu.
   - **Kod Bloku**: Sintaksis rənglənməsi, dialekt nişanı (T-SQL, PostgreSQL, PySpark), bir kliklə kopyalama, "Wrap" açarı.
   - **Qeyd Qutuları (Callouts)**:
     - `callout-tip` ("Müsahibədə belə de" — yaşıl/mavi)
     - `callout-warning` ("Diqqət" — narıncı/sarı)
     - `callout-note` ("Qeyd" — neytral/boz)

---

## 5. Mərhələlər (Milestones)

- [x] **M0: İcra Planı (PLAN.md)** — İnformasiya memarlığı, şemalar, qovluq strukturu, komponent dizaynı.
- [ ] **M1: Əsas Layihənin Qurulması (Scaffold & Pipeline Proof)**:
  - Vite + Vanilla TS layihəsinin qurulması və konfiqurasiyası.
  - CSS dizayn sistemi (light/dark, layout, typography, components).
  - Router, Naviqasiya (Sidebar, Drawer, Bottom Nav).
  - Qlobal Axtarış modulu (`SearchModal`).
  - Tərəqqi sistemi (`ProgressManager`).
  - PWA hazırlığı (`manifest.webmanifest`, `sw.js`).
  - Kod bloku komponenti (`CodeBlock` + dialekt etiketi + kopyalama).
  - Nümunə olaraq 2 mövzu (SQL Server Memarlığı və Miqrasiya) + 5 sual.
  - 375px, 768px və 1440px ölçülərində test.
- [ ] **M2: Mövzular A–F** (SQL, SQL Server, PostgreSQL, Miqrasiya, Modelləşdirmə, Lakehouse).
- [ ] **M3: Mövzular G–O** (Spark, Python, Airflow, Kafka, NoSQL, Keyfiyyət, Standartlar, İnfrastruktur, Sığorta domeni).
- [ ] **M4: Sual-Cavab Bankı** (150+ ətraflı sual və cavab, filtrlər, təsadüfi sual).
- [ ] **M5: Layihələrin Dərin Təhlili** (3 layihə: 60s pitch, 3 dəqiqəlik izah, 20+ çətin sual, diaqramlar).
- [ ] **M6: Boşluqlar, Ssenarilər (10+), SQL Məşqləri (20+), Davranış Suaları**.
- [ ] **M7: Konspektlər, Lüğət (100+ termin), Sınaq Müsahibəsi Rejimi (Mock Interview)**.
- [ ] **M8: Son Cilalama, Oflayn Yoxlama, Lighthouse Audit ($\ge 90$), README**.

---

## 6. Qəbul Meyarları və Yoxlama (Acceptance Checks)
1. **Lighthouse**: Performance, Accessibility, Best Practices $\ge 90$.
2. **Konsol və Lint**: Sıfır xəta, sıfır qırılmış keçid (broken link).
3. **Ekran Ölçüləri**:
   - `375px`: iPhone SE/Mini ölçüsü, heç bir üfüqi scroll olmamalıdır, toxunma hədəfləri $\ge 44\text{px}$.
   - `768px`: iPad/Planşet portret rejimində təmiz kart düzülüşü.
   - `1440px`: Geniş ekranda gözü yormayan oxu eni və yapışqan TOC.
4. **Oflayn İştirak**: İlk yükləmədən sonra şəbəkə kəsildikdə bütün məzmun, axtarış və kod blokları fasiləsiz işləyir.
