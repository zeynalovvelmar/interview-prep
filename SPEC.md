# SPEC.md — What to build

Read AGENTS.md first (rules) and CONTENT_PLAN.md (what to write). This file defines the product, structure, data format and milestones.

## 1. Product
A personal interview-prep web app. Used mostly on a phone (reading, quick testing) and also on desktop (deep study). Goal: in a few days the candidate can study every topic needed for the vacancy, drill interview questions, and rehearse explaining his own 3 projects.

## 2. Features
1. Sidebar/drawer navigation with the full topic tree.
2. Global instant search (topics, questions, glossary, code). Desktop shortcut "/", mobile search button.
3. Progress tracking in localStorage:
   - "learned" checkbox per topic
   - per-question status: "Bilirəm" / "Təkrar lazımdır" / none
   - overall progress bar on Home
4. Q&A bank with filters (category, difficulty, status), "random question" button, "hide answer" mode (tap to reveal).
5. Mock interview mode: 10 random questions across categories, timer, self-rating, result summary saved locally.
6. Code blocks: syntax highlighting (SQL, T-SQL, PL/pgSQL, Python, PySpark, Bash, YAML, Dockerfile, JSON), language label, Copy button, wrap toggle.
7. Side-by-side tabs "T-SQL | PostgreSQL" where syntax differs.
8. Diagrams as inline SVG or Mermaid (medallion, migration flow, Kafka flow, Delta log, Iceberg metadata layers, star schema, each project architecture).
9. PWA: manifest + service worker, installable, works offline.
10. Print-friendly cheat sheets.

## 3. Pages (routes)
- / Home: vacancy summary, "Vakansiya tələbi -> hazırlıq xəritəsi" (requirement, readiness label Güclü/Orta/Öyrənməliyəm, link to topic), progress, quick links, "Müsahibədən əvvəl son 24 saat" checklist.
- /topics and /topics/:slug — study topics (A-O in CONTENT_PLAN.md).
- /qa — Q&A bank.
- /projects and /projects/:slug — deep-dive for each of the 3 CV projects.
- /gaps — "Boşluqlarla necə işləməli".
- /scenarios — scenario / system-design practice.
- /sql-practice — hands-on SQL exercises with solution toggle.
- /cheatsheets
- /behavioral — intro scripts, STAR stories, questions to ask.
- /glossary
- /mock — mock interview.

## 4. Topic page template
1. Qısa izah (plain language + analogy)
2. Əsas anlayışlar (short bullets)
3. Kod nümunələri (1-3, commented, dialect labeled)
4. Tez-tez edilən səhvlər
5. Vakansiya ilə əlaqə
6. Mini-quiz (3 questions, tap to reveal)

## 5. Content file format (so the owner can edit easily)
content/
  topics/<nn>-<slug>.md          Markdown with frontmatter: title, slug, order, priority (high|medium|low), readiness (guclu|orta|oyrenmeliyem), vacancyLink
  qa/<category>.json             array of {id, category, difficulty, question, answer, code?, followUps[]}
  projects/<slug>.md             pitch60, walkthrough3min, decisions, diagram, numbers box
  projects/<slug>-qa.json        same shape as qa
  scenarios/<slug>.md
  sql-practice/<nn>-<slug>.json  {title, difficulty, prompt, tsql, postgres, explanation}
  cheatsheets/<slug>.md
  behavioral/*.md
  glossary.json                  array of {term, definition}
Rule: adding a new file in content/ must make it appear on the site without changing code (build-time index).

## 6. Design
Modern, calm, professional. One accent color. Card layout. Subtle animation. Clear hierarchy. Comfortable reading width (about 70ch) on desktop. Base font size >= 16px on phone.

## 7. Milestones (do them in order, commit after each)
- M0: Implementation plan -> PLAN.md (information architecture, folders, schemas, components). Stop for owner review ONLY if something blocks.
- M1: Scaffold, layout, navigation, theme, search, progress, PWA, code block component, 2 sample topics + 5 sample questions to prove the pipeline. Test at 375/768/1440.
- M2: Topics A-F (SQL, SQL Server, PostgreSQL, Migration, Modeling, Lakehouse). Migration and Lakehouse are the most detailed.
- M3: Topics G-O.
- M4: Q&A bank — at least 150 questions across all categories.
- M5: Project deep-dives (3 projects x at least 20 questions each, scripts, diagrams).
- M6: Gap strategy, scenarios (10+), SQL practice (20+), behavioral.
- M7: Cheat sheets, glossary (100+ terms), mock interview mode.
- M8: Polish, Lighthouse, README, final summary with areas the owner should double-check.

## 8. Acceptance checks per milestone
- Build passes, no console errors.
- Screenshots/inspection at 375, 768, 1440 widths show no overflow or overlap.
- New content is searchable and progress tracking works for it.
