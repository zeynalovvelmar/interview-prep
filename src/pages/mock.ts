import { ContentLoader } from '../content-loader';
import { Question } from '../types';
import { enhanceCodeBlocks } from '../components/code-block';

interface MockAnswerRecord {
  question: Question;
  rating: 'full' | 'partial' | 'none';
  timeSpentSec: number;
}

export async function renderMockPage(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'page-container mock-page';

  const allQuestions = await ContentLoader.getQuestions();

  // State
  let sessionQuestions: Question[] = [];

  let currentIndex = 0;
  let answerRevealed = false;
  let records: MockAnswerRecord[] = [];
  let timerInterval: any = null;
  let timeLeftSec = 120; // 2 minutes per question
  let currentSpentSec = 0;

  function pickRandom10(): Question[] {
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  }

  function startTimer(): void {
    clearInterval(timerInterval);
    timeLeftSec = 120;
    currentSpentSec = 0;
    timerInterval = setInterval(() => {
      timeLeftSec--;
      currentSpentSec++;
      const timerEl = container.querySelector('#mock-timer-display');
      if (timerEl) {
        const mins = Math.floor(Math.max(0, timeLeftSec) / 60);
        const secs = Math.max(0, timeLeftSec) % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (timeLeftSec <= 20) {
          timerEl.classList.add('timer-warning');
        } else {
          timerEl.classList.remove('timer-warning');
        }
      }
      if (timeLeftSec <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  }

  function stopTimer(): void {
    clearInterval(timerInterval);
  }

  function renderIntro(): void {
    stopTimer();
    container.innerHTML = `
      <div class="page-header">
        <div class="breadcrumbs">
          <a href="#/">Ana Səhifə</a> <span class="sep">/</span> <span class="current">Sınaq Müsahibəsi</span>
        </div>
        <h1 class="page-title">Sınaq Müsahibəsi Simulyasiyası (Mock Interview)</h1>
        <p class="page-desc">
          Real müsahibə təcrübəsi: 100 suallıq bazadan təsadüfi 10 sual seçilir. Hər suala şifahi cavab ver, 
          sonra model cavabı açıb özünü dürüst qiymətləndir.
        </p>
      </div>

      <div class="mock-intro-card">
        <div class="mock-rules-list">
          <div class="rule-item">
            <span class="rule-num">1</span>
            <div><strong>10 Təsadüfi Sual:</strong> SQL, SQL Server, Miqrasiya, Lakehouse, Spark, Airflow, Kafka və Behavioral mövzulardan.</div>
          </div>
          <div class="rule-item">
            <span class="rule-num">2</span>
            <div><strong>Taymer Nəzarəti:</strong> Hər sual üçün 2 dəqiqə vaxt ayrılır (müsahibədə junior üçün optimal danışıq müddəti).</div>
          </div>
          <div class="rule-item">
            <span class="rule-num">3</span>
            <div><strong>Öz-Qiymətləndirmə:</strong> Cavabını bitirdikdən sonra model cavabı aç və nəticəni (Tam bildim / Qismən / Bilmədim) seç.</div>
          </div>
        </div>

        <div class="mock-start-action">
          <button type="button" class="btn btn-primary btn-large" id="btn-start-mock">
            <span>Müsahibəyə Başla</span>
            <span class="btn-arrow">→</span>
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-start-mock')?.addEventListener('click', () => {
      sessionQuestions = pickRandom10();
      currentIndex = 0;
      records = [];
      renderActiveQuestion();
    });
  }

  function renderActiveQuestion(): void {
    answerRevealed = false;

    const q = sessionQuestions[currentIndex];
    const diffClass = q.difficulty === 'Easy' ? 'diff-easy' : q.difficulty === 'Medium' ? 'diff-medium' : 'diff-hard';

    startTimer();

    container.innerHTML = `
      <div class="mock-active-header">
        <div class="mock-progress-info">
          <span class="mock-step-label">Sual ${currentIndex + 1} / 10</span>
          <div class="mock-progress-bar-bg">
            <div class="mock-progress-bar-fill" style="width: ${((currentIndex + 1) / 10) * 100}%"></div>
          </div>
        </div>

        <div class="mock-timer-box">
          <span class="timer-icon">⏱</span>
          <span class="mock-timer-display" id="mock-timer-display">02:00</span>
        </div>
      </div>

      <div class="qa-card mock-question-card">
        <div class="qa-card-header">
          <div class="qa-meta">
            <span class="qa-category-badge">${q.category}</span>
            <span class="qa-diff-badge ${diffClass}">${q.difficulty}</span>
          </div>
        </div>

        <h2 class="mock-question-title">${q.question}</h2>

        <div class="mock-prompt-box">
          <p>💡 <em>İndi uca səslə cavabını verməyə başla. Bitirdikdə və ya çətinlik çəkdikdə model cavabı aç.</em></p>
        </div>

        <div class="mock-answer-section" id="mock-answer-section">
          ${answerRevealed ? renderAnswerContent(q) : `
            <button type="button" class="btn btn-secondary" id="btn-reveal-answer">
              <span>Model Cavabı Göstər</span>
              <span class="btn-arrow">▾</span>
            </button>
          `}
        </div>

        <div class="mock-self-rating" id="mock-self-rating" style="display: ${answerRevealed ? 'block' : 'none'};">
          <div class="rating-prompt">Cavabını necə qiymətləndirirsən?</div>
          <div class="rating-buttons-row">
            <button type="button" class="rating-btn rate-full" data-rating="full">
              <span>🟢 Tam Bildim (10 bal)</span>
            </button>
            <button type="button" class="rating-btn rate-partial" data-rating="partial">
              <span>🟡 Qismən Bildim (5 bal)</span>
            </button>
            <button type="button" class="rating-btn rate-none" data-rating="none">
              <span>🔴 Bilmədim (0 bal)</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const revealBtn = container.querySelector('#btn-reveal-answer');
    revealBtn?.addEventListener('click', () => {
      answerRevealed = true;
      const section = container.querySelector('#mock-answer-section');
      if (section) section.innerHTML = renderAnswerContent(q);
      const ratingBox = container.querySelector('#mock-self-rating') as HTMLElement;
      if (ratingBox) ratingBox.style.display = 'block';
      enhanceCodeBlocks(container);
    });

    container.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rating = (e.currentTarget as HTMLElement).dataset.rating as 'full' | 'partial' | 'none';
        records.push({
          question: q,
          rating,
          timeSpentSec: currentSpentSec
        });

        if (currentIndex < 9) {
          currentIndex++;
          renderActiveQuestion();
        } else {
          renderSummary();
        }
      });
    });
  }

  function renderAnswerContent(q: Question): string {
    let codeHtml = '';
    if (q.code) {
      codeHtml = `
        <div class="qa-code-box" style="margin-top: 1rem;">
          <pre><code class="language-${q.code.language}">-- Dialect: ${q.code.dialect || q.code.language}\n${q.code.snippet}</code></pre>
        </div>
      `;
    }

    return `
      <div class="mock-answer-box">
        <h4 class="mock-answer-heading">Model Cavab (3-6 Cümlə):</h4>
        <p class="qa-answer-p">${q.answer}</p>
        ${codeHtml}
      </div>
    `;
  }

  function renderSummary(): void {
    stopTimer();

    let totalScore = 0;

    records.forEach(r => {
      if (r.rating === 'full') totalScore += 10;
      else if (r.rating === 'partial') totalScore += 5;
    });

    const isPassed = totalScore >= 70;
    const badgeText = totalScore >= 90 ? 'Mükəmməl Hazırlıq!' : totalScore >= 70 ? 'Uğurlu Nəticə!' : 'Təkrar Lazımdır';
    const badgeClass = isPassed ? 'score-pass' : 'score-fail';

    container.innerHTML = `
      <div class="mock-summary-card">
        <div class="summary-badge ${badgeClass}">${badgeText}</div>
        <h1 class="summary-score-title">${totalScore} / 100 Bal</h1>
        <p class="summary-desc">
          ${isPassed 
            ? 'Təbriklər! Müsahibə üçün çox güclü təməl nümayiş etdirdin. Aşağıdakı qeydlərə baxıb çatışmazlıqları təkrarla.' 
            : 'Nəticə yaxşı bir təcrübə oldu. Zəif bildiyin sualları Q&A bankında təkrar et və yenidən sına.'}
        </p>

        <div class="summary-actions-row">
          <button type="button" class="btn btn-primary" id="btn-restart-mock">Yenidən Sınaq Başlat</button>
          <a href="#/qa" class="btn btn-secondary">Sual-Cavab Bankına Keç</a>
        </div>

        <div class="summary-breakdown-list">
          <h3 class="breakdown-title">Cavablandırılmış Sualların İcmalı:</h3>
          ${records.map((r, i) => `
            <div class="breakdown-item rate-${r.rating}">
              <div class="breakdown-meta">
                <span class="breakdown-idx">#${i + 1}</span>
                <span class="breakdown-status-badge">
                  ${r.rating === 'full' ? '🟢 Tam (10)' : r.rating === 'partial' ? '🟡 Qismən (5)' : '🔴 Bilmədim (0)'}
                </span>
                <span class="breakdown-cat">${r.question.category}</span>
              </div>
              <div class="breakdown-q">${r.question.question}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#btn-restart-mock')?.addEventListener('click', () => {
      renderIntro();
    });
  }

  renderIntro();

  return container;
}
