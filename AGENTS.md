# AGENTS.md — Interview Prep Website (Junior Data Engineer)

Short, always-on rules. Details live in SPEC.md (what to build) and CONTENT_PLAN.md (what to write). Read all three before planning.

## Mission
Build a static, mobile-first interview-preparation website for a Junior Data Engineer candidate (first name: Elmar) invited to interview for "Data Mühəndisi" at Atəşgah Sığorta Şirkəti (insurance company, Azerbaijan).

## Language
- ALL visible site content is written in AZERBAIJANI.
- Keep technical terms in English (ETL, Lakehouse, Kafka, DAG, SCD Type 2, idempotency, etc.).
- Code, code comments, file names, variable names, commit messages: English.
- Tone: simple, short sentences, teach a smart beginner, use small analogies.

## Tech rules
- Static site only. No backend, no database, no login.
- Prefer: Vite + vanilla TypeScript or plain HTML/CSS/JS. Keep dependencies few (markdown renderer, code highlighter, small search lib).
- Content is separate from code: content/ folder (Markdown + JSON). The owner must be able to edit text without touching code.
- Must deploy on GitHub Pages or Netlify. Must work offline after first load (PWA/service worker).

## UI rules
- Mobile-first. Test at 375px, 768px, 1440px. No horizontal page scroll, ever.
- Tap targets >= 44px. Code blocks scroll horizontally inside their own container.
- Phone: bottom navigation or drawer. Desktop: sticky sidebar + "on this page" TOC.
- Light/dark theme (follow system by default, remember choice in localStorage).
- Accessible contrast, keyboard navigable, semantic HTML, visible focus.
- One accent color, card layout, callouts: "Qeyd", "Diqqət", "Müsahibədə belə de".

## Content rules
- Every concept: what it is -> why it matters -> tiny example.
- Code must be syntactically correct and clearly labeled by dialect (T-SQL vs PostgreSQL vs PySpark etc.). NEVER invent functions, APIs, or CLI flags. If unsure, write "yoxla" (verify) next to the statement.
- For fast-changing facts (versions, pricing, tool features) stay general or add "yoxla".
- Interview answers must be realistic for a JUNIOR: confident, structured, honest about limits.

## Honesty rule (critical)
- Never write that the candidate has experience that is not in CONTENT_PLAN.md (e.g. production MS SQL Server, real SQL Server -> PostgreSQL migration, Iceberg, real AWS). For these gaps use the "hands-on görməmişəm, amma belə yanaşardım" pattern and give a structured approach.
- No personal data beyond first name and the project descriptions in CONTENT_PLAN.md.

## Working rules
- First produce an implementation plan and save it as PLAN.md. Then build in milestones (see SPEC.md). Do not write all content in one pass.
- After each milestone: run the site, check browser console, check 3 viewport widths, fix issues, commit.
- Keep this file and SPEC.md unchanged unless the owner asks.
- At the end of each milestone give a 5-line summary and list content areas the owner should double-check.

## Definition of done
- Lighthouse Performance, Accessibility, Best Practices >= 90.
- No console errors, no broken links, no overflow on mobile.
- README explains: run locally, edit content, deploy, add to phone home screen.
