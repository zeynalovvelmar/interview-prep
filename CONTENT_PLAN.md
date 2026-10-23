# CONTENT_PLAN.md — What to write

All visible text in Azerbaijani (technical terms in English). Code and comments in English.

## 1. Vacancy: Data Mühəndisi — Atəşgah Sığorta Şirkəti

Responsibilities:
- Analyze and assess the existing Microsoft SQL Server environment: databases, schemas, stored procedures, dependencies, performance problems, integrations.
- Design and manage migration from Microsoft SQL Server to PostgreSQL with data integrity, business continuity, optimal performance, minimal operational impact.
- Design and implement scalable Lakehouse architecture on Amazon S3 using Apache Iceberg or Delta Lake.
- Build and maintain pipelines ingesting from SQL and NoSQL databases, external APIs, other corporate sources.
- Define and apply architecture standards for storing, processing, integrating, using data.

Requirements:
- Strong practical MS SQL Server (architecture, schema design, stored procedures, query optimization, performance tuning, dependency analysis, integrations).
- Proven SQL Server -> PostgreSQL migration (schema conversion, compatibility assessment, data validation, cutover plan, rollback strategy).
- Scalable Lakehouse on S3; Iceberg / Delta Lake knowledge.
- Python for processing, automation, pipelines.
- Distributed processing for large data.
- Apache Airflow (orchestration, scheduling, monitoring).
- Pipelines from SQL/NoSQL/APIs/corporate sources.
- Data architecture, modeling, integration principles.
- Ability to define and apply architecture standards (integrity, scalability, performance, reliability, maintainability).
- Performance troubleshooting and business continuity during migrations/modernization.
- Make reasoned architecture decisions; lead technical execution independently.

## 2. Candidate (use only this)
- First name: Elmar. B.Sc. IT (AzTU, GPA 86), now M.Sc. Cloud and Network Infrastructures (AzTU). Data Engineering Bootcamp, Matrix Training Center (Dec 2025 – Jul 2026). Certificate: Astronomer Airflow 3 Fundamentals (Jun 2026).
- Skills: SQL, Python, PySpark, Airflow, Kafka, Docker, Linux, Git, PostgreSQL, MinIO (S3-compatible), Parquet/JSON/CSV, Medallion architecture, Star schema, Delta Lake (in a project).
- Languages: Azerbaijani (native), Turkish (C1), English (B2), Russian (A1).
- Experience: freelance Content Operations Specialist (Apr–Jun 2025). No professional DE job yet.

Projects:
1. End-to-End Data Lakehouse (Medallion) — PySpark, MinIO, PostgreSQL, Git (Feb 2026). 3-layer lake on S3-compatible storage, raw JSON/CSV ingestion, Gold-layer datamart with aggregated business features using PySpark and Delta Lake tables, relational schema validation via Spark JDBC.
2. Real-Time Cryptocurrency Data Pipeline — Kafka (multi-broker, KRaft), Python, PySpark Structured Streaming, PostgreSQL sink, Airflow, Grafana, CoinGecko API (Apr 2026). Parse/clean semi-structured data, orchestrate with Airflow, real-time Grafana dashboards. Presented as academic practicum defense.
3. Banking Batch Pipeline (Medallion & Star Schema) — PySpark, Airflow, MinIO, Docker (Sep 2026). Idempotent batch ETL over Bronze/Silver/Gold; data-quality gates fixing 5 defects (deduplication, null handling, orphan FK quarantine, domain checks); Kimball star schema with conformed dimensions and SCD Type 2 customer history; time-aware joins; partitioned Parquet on MinIO; Airflow orchestration.

## 3. Gap strategy (honest)
Not on CV: production MS SQL Server work, real SQL Server -> PostgreSQL migration, Apache Iceberg, real Amazon S3/AWS, NoSQL, leading architecture decisions.
Page /gaps must contain, for each gap:
- A confident honest script ("Production-da etməmişəm, amma yanaşmam belədir: ...") followed by a structured approach.
- Transferable experience from the 3 projects (e.g. MinIO is S3-compatible -> S3 API concepts; Delta in project -> table-format concepts transfer to Iceberg; Spark JDBC + PostgreSQL -> relational integration; star schema + SCD2 -> migration validation mindset).
- What to practice in the remaining days (small labs, e.g. install SQL Server Developer in Docker, restore sample DB, convert schema to PostgreSQL by hand, compare row counts/hashes).
- 30/60/90-day learning plan if hired.
- Phrases to avoid (never claim experience that does not exist).

## 4. Study topics (each follows the topic page template in SPEC.md)
A. SQL fundamentals & advanced: joins, aggregates, window functions, CTE, recursive CTE, subqueries, set ops, indexes, transactions, ACID, isolation levels, locking, deadlocks, normalization 1NF–3NF, denormalization.
B. Microsoft SQL Server (HIGH): architecture (data/log files, buffer pool, transaction log, recovery models), T-SQL specifics, procedures vs functions vs views vs triggers, temp tables vs table variables vs CTE, clustered/non-clustered/covering indexes, execution plans, statistics, parameter sniffing, Query Store, DMVs (sys.dm_exec_query_stats, sys.dm_db_index_usage_stats, missing-index DMVs), wait stats, blocking analysis, SQL Agent jobs, linked servers, SSIS overview, dependency analysis (sys.sql_expression_dependencies), performance tuning checklist, how to inventory an existing SQL Server environment.
C. PostgreSQL: architecture, MVCC, VACUUM/autovacuum, indexes (B-tree, GIN, GiST, BRIN), EXPLAIN ANALYZE, partitioning, PL/pgSQL, schemas, roles, extensions, JSONB, sequences vs identity, logical replication.
D. SQL Server -> PostgreSQL MIGRATION (HIGH, most detailed): assessment & inventory, compatibility matrix, data type mapping table (NVARCHAR, DATETIME2, BIT, UNIQUEIDENTIFIER, MONEY, IDENTITY ...), T-SQL -> PL/pgSQL conversion (TOP vs LIMIT, ISNULL vs COALESCE, string concat, date functions, temp tables, error handling, MERGE, OUTPUT clause, collations/case sensitivity, identifier quoting), tools (pgloader, AWS SCT, AWS DMS, Babelfish overview, custom Python scripts), strategies (big-bang vs phased vs CDC near-zero-downtime), data validation (row counts, checksums/hash compare, sampling, referential checks), performance validation, cutover plan step by step, rollback strategy, parallel run, risk register, communication plan. Include migration flow diagram and sample checklist.
E. Data modeling & warehousing: OLTP vs OLAP, Kimball star/snowflake, facts & dimensions, conformed dimensions, SCD 1/2/3 with SQL, surrogate keys, Data Vault overview, data marts, insurance modeling example (policy, customer, claim, premium, coverage, agent).
F. Lakehouse & table formats (HIGH): lake vs warehouse vs lakehouse, Amazon S3 basics (buckets, prefixes, storage classes, IAM, lifecycle), formats (Parquet, ORC, Avro, JSON, CSV), Delta Lake (transaction log, ACID, time travel, MERGE, OPTIMIZE/VACUUM, schema evolution), Apache Iceberg (metadata layers, snapshots, manifests, hidden partitioning, partition evolution, time travel, compaction), Delta vs Iceberg vs Hudi table, catalogs (AWS Glue, Hive Metastore, Nessie), engines (Spark, Trino, Athena), Medallion, small-files problem, partitioning strategy.
G. Spark / PySpark: driver/executors, DAG, stages, tasks, transformations vs actions, lazy evaluation, shuffle, narrow vs wide, partitioning, repartition vs coalesce, broadcast join, caching, skew, Spark SQL, DataFrame API, Structured Streaming, Parquet/Delta/Iceberg IO, JDBC reads, tuning basics.
H. Python for DE: pandas basics, file/JSON/CSV, requests for REST APIs (pagination, retries, rate limit, auth), error handling, logging, venv, SQLAlchemy/psycopg2/pyodbc, pytest, idempotent scripts.
I. Apache Airflow: DAGs, tasks, operators, sensors, XCom, scheduling & catchup, retries, SLAs, backfill, idempotency, dependencies, TaskFlow API, connections/variables, monitoring/alerting, Airflow 3 key changes (mark "yoxla"), commented example DAG.
J. Kafka & streaming: topics, partitions, offsets, consumer groups, brokers, KRaft vs ZooKeeper, delivery semantics, Python producer/consumer, batch vs streaming, CDC overview (Debezium).
K. NoSQL & APIs: document/key-value/column/graph, MongoDB and Redis basics, CAP, SQL vs NoSQL, ingesting NoSQL/REST into lakehouse, JSON flattening.
L. Data quality, governance, reliability: quality dimensions, validation rules, quarantine pattern, idempotency, delivery semantics, lineage, catalog/metadata, PII masking & access control (insurance data is sensitive), logging/monitoring/alerting, SLAs, pipeline testing.
M. Architecture & standards: how to define standards (naming, layering, partitioning, formats, schema evolution, error handling, docs, code review, CI/CD), ADR template + example (Delta vs Iceberg), trade-offs (cost, scalability, performance, maintainability), batch vs streaming matrix, ETL vs ELT.
N. Infrastructure: Linux commands, Bash, Docker & docker-compose (Postgres + Airflow + MinIO example), Git workflow, CI/CD overview, AWS basics for data (S3, IAM, Glue, Athena, DMS, RDS/Aurora PostgreSQL).
O. Insurance domain primer (short, simple): policy lifecycle, claims, premiums, underwriting, actuarial data, reinsurance, typical sources and reports, privacy/regulatory sensitivity.

## 5. Q&A bank (>= 150 questions)
Fields: id, category, difficulty (Easy/Medium/Hard), question, model answer (3–8 sentences, code if useful), follow-up questions.
Categories: SQL, SQL Server, PostgreSQL, Migration, Modeling, Lakehouse/Delta/Iceberg, Spark, Python, Airflow, Kafka, NoSQL/API, Data quality, Architecture & decisions, Linux/Docker/Git, Behavioral, Scenario-based.

## 6. Project deep-dive (per project)
- 60-second pitch and 3-minute walkthrough (first person, natural Azerbaijani, honest).
- Architecture diagram (SVG/Mermaid).
- "Niyə bunu seçdim?" decisions (Kafka KRaft, Delta, MinIO, Airflow, SCD2, PostgreSQL sink, PySpark, Docker ...).
- >= 20 likely interviewer questions with model answers covering: architecture choices, trade-offs, scale ("data 100x olsa?"), failure handling, idempotency, late/duplicate data, schema evolution, monitoring, testing, security, cost, what to improve, what went wrong and how it was fixed, moving MinIO -> real S3, swapping Delta -> Iceberg, adding CDC from SQL Server, applying it to an insurance dataset.
- Challenge questions that probe whether he really built it, e.g.: "Batch pipeline-da idempotentliyi necə təmin etdin?", "Crypto pipeline-da Structured Streaming checkpoint necə işləyir?", "PostgreSQL işləmirsə Kafka consumer-ə nə olur?", "SCD Type 2 merge-i göstər", "Hansı defektləri quarantine-ə atmağa, hansını düzəltməyə necə qərar verdin?".
- "Yadda saxlanacaq rəqəmlər" box that the owner can edit (number of layers, defects, brokers, partitions, row counts, run time...). Leave unknown values as editable placeholders — do NOT invent numbers.

## 7. Scenarios (>= 10, step-by-step model solutions)
- Inherited SQL Server with 400 undocumented stored procedures: first 2 weeks plan.
- 2 TB policy database migration SQL Server -> PostgreSQL with < 1 hour downtime.
- Nightly procedure went from 10 minutes to 3 hours: diagnosis.
- Lakehouse on S3 for claims data from SQL Server + MongoDB + partner API.
- Delta or Iceberg for us: justified recommendation.
- Pipeline produced duplicates: find and fix.
- Defining architecture standards in a team of 5.
- Late-arriving data in a streaming pipeline.
- Schema change in the source breaks the pipeline.
- Sensitive PII in the lake: protection plan.
(+ more if useful)

## 8. SQL practice (>= 20)
Window functions, running totals, top-N per group, deduplication, gaps & islands, SCD2 merge, pivot, recursive CTE, date bucketing, anti-join, etc. Provide T-SQL and PostgreSQL versions where syntax differs; solution hidden behind a toggle.

## 9. Cheat sheets
T-SQL vs PostgreSQL syntax table; Spark API; Airflow; Delta vs Iceberg; Kafka concepts; Linux/Docker/Git commands.

## 10. Behavioral & intro
"Özün haqqında danış" (30s / 1min / 2min), why this company, why Data Engineering, strengths/weaknesses, STAR stories (teamwork, conflict, failure, learning fast), salary-expectation guidance, 15 smart questions to ask the interviewer.

## 11. Glossary
100+ terms, one-line plain Azerbaijani definitions.

## 12. Homepage readiness map (initial honest labels, owner can edit)
- Python, Airflow, Spark/PySpark, Kafka, Medallion/Star schema, Delta Lake (project level), Docker/Linux/Git, PostgreSQL basics: Orta–Güclü (project experience)
- MS SQL Server production/tuning, SQL Server -> PostgreSQL migration, Iceberg, real AWS S3, NoSQL, architecture standards leadership: Öyrənməliyəm (focus areas)
