import MiniSearch from 'minisearch';
import { ContentLoader } from '../content-loader';
import { SearchItem } from '../types';

export class SearchIndexManager {
  private static miniSearch: MiniSearch<SearchItem> | null = null;
  private static itemsMap: Map<string, SearchItem> = new Map();
  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    this.miniSearch = new MiniSearch<SearchItem>({
      fields: ['title', 'category', 'content', 'badge'],
      storeFields: ['id', 'type', 'title', 'category', 'url', 'badge'],
      searchOptions: {
        boost: { title: 3, category: 2, badge: 1.5 },
        prefix: true,
        fuzzy: 0.2
      }
    });

    const [topics, questions, glossary] = await Promise.all([
      ContentLoader.getTopics(),
      ContentLoader.getQuestions(),
      ContentLoader.getGlossary()
    ]);

    const items: SearchItem[] = [];

    // Index topics
    for (const t of topics) {
      const item: SearchItem = {
        id: `topic-${t.slug}`,
        type: 'topic',
        title: t.title,
        category: t.category,
        content: `${t.summary || ''} ${t.tags?.join(' ') || ''} ${t.rawMarkdown.slice(0, 1000)}`,
        url: `#/topics/${t.slug}`,
        badge: 'Mövzu'
      };
      items.push(item);
      this.itemsMap.set(item.id, item);
    }

    // Index questions
    for (const q of questions) {
      const item: SearchItem = {
        id: `qa-${q.id}`,
        type: 'question',
        title: q.question,
        category: q.category,
        content: `${q.answer} ${q.code?.snippet || ''} ${q.followUps?.join(' ') || ''}`,
        url: `#/qa?id=${q.id}`,
        badge: `Sual (${q.difficulty})`
      };
      items.push(item);
      this.itemsMap.set(item.id, item);
    }

    // Index glossary
    for (const g of glossary) {
      const item: SearchItem = {
        id: `glossary-${g.term}`,
        type: 'glossary',
        title: g.term,
        category: 'Lüğət',
        content: g.definition,
        url: `#/glossary?q=${encodeURIComponent(g.term)}`,
        badge: 'Termin'
      };
      items.push(item);
      this.itemsMap.set(item.id, item);
    }

    this.miniSearch.addAll(items);
    this.isInitialized = true;
  }

  public static search(query: string): SearchItem[] {
    if (!this.miniSearch || !query.trim()) return [];
    const results = this.miniSearch.search(query.trim());
    return results.map(r => this.itemsMap.get(r.id.toString())!).filter(Boolean);
  }
}
