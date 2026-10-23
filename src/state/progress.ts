import { ProgressData, QuestionStatus } from '../types';

export class ProgressManager {
  private static STORAGE_KEY = 'de_prep_progress';

  private static load(): ProgressData {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          topics: parsed.topics || {},
          questions: parsed.questions || {}
        };
      }
    } catch {
      // Fallback if parsing fails
    }
    return { topics: {}, questions: {} };
  }

  private static save(data: ProgressData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('progress-updated', { detail: data }));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  }

  public static isTopicLearned(slug: string): boolean {
    const data = this.load();
    return !!data.topics[slug]?.learned;
  }

  public static setTopicLearned(slug: string, learned: boolean): void {
    const data = this.load();
    data.topics[slug] = {
      learned,
      updatedAt: Date.now()
    };
    this.save(data);
  }

  public static toggleTopicLearned(slug: string): boolean {
    const current = this.isTopicLearned(slug);
    this.setTopicLearned(slug, !current);
    return !current;
  }

  public static getQuestionStatus(id: string): QuestionStatus {
    const data = this.load();
    return data.questions[id]?.status || 'none';
  }

  public static setQuestionStatus(id: string, status: QuestionStatus): void {
    const data = this.load();
    data.questions[id] = {
      status,
      updatedAt: Date.now()
    };
    this.save(data);
  }

  public static getStats(totalTopicsCount: number, totalQuestionsCount: number) {
    const data = this.load();
    
    const learnedTopicsCount = Object.values(data.topics).filter(t => t.learned).length;
    const knownQuestionsCount = Object.values(data.questions).filter(q => q.status === 'bilirem').length;
    const reviewQuestionsCount = Object.values(data.questions).filter(q => q.status === 'tekrar').length;

    const topicPct = totalTopicsCount > 0 ? Math.round((learnedTopicsCount / totalTopicsCount) * 100) : 0;
    const qPct = totalQuestionsCount > 0 ? Math.round((knownQuestionsCount / totalQuestionsCount) * 100) : 0;
    
    // Overall weighted average (50% topics, 50% questions)
    const overallPct = Math.round((topicPct + qPct) / 2);

    return {
      learnedTopicsCount,
      totalTopicsCount,
      topicPct,
      knownQuestionsCount,
      reviewQuestionsCount,
      totalQuestionsCount,
      qPct,
      overallPct
    };
  }
}
