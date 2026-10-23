import { ContentLoader } from '../content-loader';
import { ProgressManager } from '../state/progress';

export async function renderHomePage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container home-page';

  const [topics, questions] = await Promise.all([
    ContentLoader.getTopics(),
    ContentLoader.getQuestions()
  ]);

  const stats = ProgressManager.getStats(topics.length, questions.length);

  container.innerHTML = `
    <!-- Hero / Vacancy summary -->
    <section class="hero-section">
      <div class="hero-badge">Atəşgah Sığorta Şirkəti</div>
      <h1 class="hero-title">Junior Data Mühəndisi <span class="gradient-text">Müsahibə Hazırlığı</span></h1>
      <p class="hero-desc">
        Namizəd: <strong>Elmar</strong>. Bu platforma Atəşgah Sığorta-nın Data Mühəndisi vakansiyası üzrə tələb olunan bütün mövzuları, sual-cavabları və real CV layihələrini sistemli şəkildə məşq etmək üçün hazırlanmışdır.
      </p>

      <!-- Overall progress card -->
      <div class="progress-card">
        <div class="progress-card-header">
          <div class="progress-title-group">
            <span class="progress-title">Ümumi Hazırlıq Səviyyəsi</span>
            <span class="progress-pct" id="home-overall-pct">${stats.overallPct}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="home-overall-fill" style="width: ${stats.overallPct}%"></div>
          </div>
        </div>
        <div class="progress-stats-grid">
          <div class="stat-box">
            <span class="stat-num" id="home-topics-stat">${stats.learnedTopicsCount} / ${stats.totalTopicsCount}</span>
            <span class="stat-label">Öyrənilmiş Mövzu</span>
          </div>
          <div class="stat-box">
            <span class="stat-num" id="home-qa-stat">${stats.knownQuestionsCount} / ${stats.totalQuestionsCount}</span>
            <span class="stat-label">Mənimsənilmiş Sual</span>
          </div>
          <div class="stat-box">
            <span class="stat-num" id="home-review-stat">${stats.reviewQuestionsCount}</span>
            <span class="stat-label">Təkrar Lazımdır</span>
          </div>
        </div>
      </div>

      <!-- Quick action buttons -->
      <div class="hero-actions">
        <a href="#/topics" class="btn btn-primary">
          <span>📚 Mövzuları Oxu</span>
        </a>
        <a href="#/qa" class="btn btn-secondary">
          <span>❓ Sual-Cavab Məşqi</span>
        </a>
        <a href="#/projects" class="btn btn-secondary">
          <span>🚀 Layihələri Müdafiə Et</span>
        </a>
      </div>
    </section>

    <!-- Vacancy Requirements -> Readiness Map -->
    <section class="section-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">Vakansiya Tələbi $\rightarrow$ Hazırlıq Xəritəsi</h2>
          <p class="section-subtitle">Dürüst özünüqiymətləndirmə: Güclü tərəflər və diqqət yetirilməli boşluqlar</p>
        </div>
      </div>

      <div class="readiness-table-wrapper">
        <table class="readiness-table">
          <thead>
            <tr>
              <th>Vakansiya Tələbi</th>
              <th>Status</th>
              <th>Özünüqiymətləndirmə və Əlaqəli Mövzu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Mövcud MS SQL Server mühitinin təhlili</strong></td>
              <td><span class="readiness-badge badge-focus">Öyrənməliyəm</span></td>
              <td>
                Production təcrübəm yoxdur; DMV-lər, Wait stats və asılılıq təhlilini nəzəri və Docker laboratoriyasında dərindən öyrənirəm.
                <a href="#/topics/sql-server-memarligi" class="table-link">Mövzuya bax $\rightarrow$</a>
              </td>
            </tr>
            <tr>
              <td><strong>SQL Server $\rightarrow$ PostgreSQL Miqrasiyası</strong></td>
              <td><span class="readiness-badge badge-focus">Öyrənməliyəm</span></td>
              <td>
                Real miqrasiya etməmişəm; data tipləri mappingi, T-SQL $\rightarrow$ PL/pgSQL çevrilməsi, Cutover və Rollback strategiyasını hazırlayıram.
                <a href="#/topics/sql-server-postgresql-miqrasiya" class="table-link">Mövzuya bax $\rightarrow$</a>
              </td>
            </tr>
            <tr>
              <td><strong>S3 üzərində Lakehouse (Delta Lake / Iceberg)</strong></td>
              <td><span class="readiness-badge badge-mid">Orta – Güclü</span></td>
              <td>
                CV Layihəmdə MinIO (S3-compatible) üzərində Medallion memarlığı və Delta Lake ilə işləmişəm; Iceberg nəzəriyyəsini mənimsəyirəm.
                <a href="#/topics" class="table-link">Mövzulara bax $\rightarrow$</a>
              </td>
            </tr>
            <tr>
              <td><strong>Python, PySpark və Paylanmış Hesablama</strong></td>
              <td><span class="readiness-badge badge-strong">Güclü</span></td>
              <td>
                3 layihədə PySpark ilə ETL, Structured Streaming, Broadcast Join, Data Quality yoxlamaları qurulub.
              </td>
            </tr>
            <tr>
              <td><strong>Apache Airflow ilə Orkestrasiya</strong></td>
              <td><span class="readiness-badge badge-strong">Güclü</span></td>
              <td>
                Astronomer Airflow Fundamentals sertifikatı; idempotent DAG-lar, backfill və retry məntiqləri.
              </td>
            </tr>
            <tr>
              <td><strong>Real-Time Axın (Kafka & Streaming)</strong></td>
              <td><span class="readiness-badge badge-strong">Güclü</span></td>
              <td>
                Multi-broker KRaft Kafka klasteri, PySpark Streaming ilə PostgreSQL sink və Grafana monitorinqi.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 24 Hours Checklist -->
    <section class="section-card checklist-card">
      <div class="section-header">
        <div>
          <h2 class="section-title">⏱️ Müsahibədən Əvvəl Son 24 Saat Yoxlama Siyahısı</h2>
          <p class="section-subtitle">Müsahibə otağına daxil olmazdan əvvəl təkrar edilməli əsas tezislər</p>
        </div>
      </div>

      <div class="checklist-grid">
        <label class="check-item">
          <input type="checkbox" />
          <div class="check-text">
            <strong>3 Layihənin 60-saniyəlik Pitch-ini ucadan de:</strong>
            Lakehouse, Crypto Pipeline və Banking Batch layihələrinin memarlığını əzbər deyil, məntiqlə danış.
          </div>
        </label>
        <label class="check-item">
          <input type="checkbox" />
          <div class="check-text">
            <strong>Boşluqlar üzrə dürüst yanaşmanı xatırla:</strong>
            "Production-da etməmişəm, lakin addım-addım yanaşmam belədir..." cümləsini təmkinlə söyləməyə hazırlaş.
          </div>
        </label>
        <label class="check-item">
          <input type="checkbox" />
          <div class="check-text">
            <strong>T-SQL və PostgreSQL ən çox çaşdıran fərqlər:</strong>
            ISNULL vs COALESCE, GETDATE() vs CURRENT_TIMESTAMP, Quoted identifiers və kiçik hərflər.
          </div>
        </label>
        <label class="check-item">
          <input type="checkbox" />
          <div class="check-text">
            <strong>Sığorta biznes anlayışları:</strong>
            Polis, Premia, İddia (Claim), Anderraytinq və fırıldaqçılıq (fraud) analitikası.
          </div>
        </label>
      </div>
    </section>
  `;

  // Listen to progress updates to dynamically adjust numbers
  window.addEventListener('progress-updated', () => {
    const freshStats = ProgressManager.getStats(topics.length, questions.length);
    const pctEl = container.querySelector('#home-overall-pct');
    const fillEl = container.querySelector('#home-overall-fill') as HTMLElement;
    const topicsStat = container.querySelector('#home-topics-stat');
    const qaStat = container.querySelector('#home-qa-stat');
    const reviewStat = container.querySelector('#home-review-stat');

    if (pctEl) pctEl.textContent = `${freshStats.overallPct}%`;
    if (fillEl) fillEl.style.width = `${freshStats.overallPct}%`;
    if (topicsStat) topicsStat.textContent = `${freshStats.learnedTopicsCount} / ${freshStats.totalTopicsCount}`;
    if (qaStat) qaStat.textContent = `${freshStats.knownQuestionsCount} / ${freshStats.totalQuestionsCount}`;
    if (reviewStat) reviewStat.textContent = `${freshStats.reviewQuestionsCount}`;
  });

  return container;
}
