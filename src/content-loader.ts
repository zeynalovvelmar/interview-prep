import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-plsql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-json';
import { Topic, Question, GlossaryTerm, HeadingItem, Project, SqlPracticeItem } from './types';


// Simple frontmatter parser
function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const yaml = match[1];
  const content = match[2];
  const data: Record<string, any> = {};

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      let val = trimmed.slice(colonIdx + 1).trim();

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      if (val.startsWith('[') && val.endsWith(']')) {
        try {
          data[key] = JSON.parse(val);
        } catch {
          data[key] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        }
      } else if (val === 'true') {
        data[key] = true;
      } else if (val === 'false') {
        data[key] = false;
      } else if (!isNaN(Number(val)) && val !== '') {
        data[key] = Number(val);
      } else {
        data[key] = val;
      }
    }
  }

  return { data, content };
}

// Convert GitHub style callouts to styled HTML cards
function transformCallouts(markdown: string): string {
  return markdown
    .replace(/>\s*\[!TIP\]\s*\n((?:>.*\n?)*)/gi, (_match, content) => {
      const clean = content.replace(/^>\s?/gm, '');
      return `<div class="callout callout-tip"><div class="callout-header"><span class="callout-icon">💡</span><strong>Müsahibədə belə de</strong></div><div class="callout-body">\n\n${clean}\n\n</div></div>\n`;
    })
    .replace(/>\s*\[!WARNING\]\s*\n((?:>.*\n?)*)/gi, (_match, content) => {
      const clean = content.replace(/^>\s?/gm, '');
      return `<div class="callout callout-warning"><div class="callout-header"><span class="callout-icon">⚠️</span><strong>Diqqət</strong></div><div class="callout-body">\n\n${clean}\n\n</div></div>\n`;
    })
    .replace(/>\s*\[!NOTE\]\s*\n((?:>.*\n?)*)/gi, (_match, content) => {
      const clean = content.replace(/^>\s?/gm, '');
      return `<div class="callout callout-note"><div class="callout-header"><span class="callout-icon">📝</span><strong>Qeyd</strong></div><div class="callout-body">\n\n${clean}\n\n</div></div>\n`;
    });
}

// Transform mini-quiz comments into interactive details
function transformMiniQuizzes(markdown: string): string {
  return markdown.replace(/<!--\s*answer-start\s*-->([\s\S]*?)<!--\s*answer-end\s*-->/gi, (_match, answerContent) => {
    return `<details class="mini-quiz-details"><summary class="mini-quiz-summary">Cavabı göstər <span class="quiz-arrow">▾</span></summary><div class="mini-quiz-content">\n\n${answerContent.trim()}\n\n</div></details>`;
  });
}

// Transform dialect tabs (e.g. :::tabs @tab T-SQL ... @tab PostgreSQL ... :::)
function transformDialectTabs(markdown: string): string {
  return markdown.replace(/:::tabs\s*([\s\S]*?):::/g, (_match, inner) => {
    const rawTabs = inner.split(/@tab\s+/).filter((s: string) => s.trim().length > 0);
    let buttonsHtml = '';
    let panesHtml = '';

    rawTabs.forEach((tabBlock: string, idx: number) => {
      const newlineIdx = tabBlock.indexOf('\n');
      const tabTitle = newlineIdx !== -1 ? tabBlock.slice(0, newlineIdx).trim() : 'Tab';
      const tabBody = newlineIdx !== -1 ? tabBlock.slice(newlineIdx).trim() : tabBlock.trim();
      const isActive = idx === 0 ? 'active' : '';

      buttonsHtml += `<button type="button" class="dialect-tab-btn ${isActive}" data-tab-target="tab-panel-${idx}">${tabTitle}</button>`;
      panesHtml += `<div class="dialect-tab-pane ${isActive}" data-tab-panel="tab-panel-${idx}">\n\n${tabBody}\n\n</div>`;
    });

    return `<div class="dialect-tabs-container"><div class="dialect-tabs-nav" role="tablist">${buttonsHtml}</div><div class="dialect-tabs-body">${panesHtml}</div></div>\n`;
  });
}

// Slugify heading text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Clean LaTeX arrows and math expressions to clean Unicode and readable text
function cleanMarkdownText(markdown: string): string {
  return markdown
    .replace(/\$\s*\\rightarrow\s*\$/g, '→')
    .replace(/\$\s*\\leftarrow\s*\$/g, '←')
    .replace(/\$\s*\\leftrightarrow\s*\$/g, '↔')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\$\s*\\?ightarrow\s*\$/g, '→')
    .replace(/\$\s*\\?eftarrow\s*\$/g, '←')
    .replace(/\$\$\\text\{([^}]+)\}\s*=\s*\\frac\{\\text\{([^}]+)\}\}\{\\text\{([^}]+)\}\}\s*\\times\s*100\\%\$\$/g, '$1 = ($2 / $3) × 100%')
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => math.replace(/\\text\{([^}]+)\}/g, '$1').replace(/\\times/g, '×').replace(/\\_/g, '_').trim())
    .replace(/\$([^\n$]+)\$/g, (_match, math) => math.replace(/\\text\{([^}]+)\}/g, '$1').replace(/\\times/g, '×').replace(/\\_/g, '_').trim());
}

// Extract headings for Table of Contents
function extractHeadings(markdown: string): { headings: HeadingItem[]; modifiedMarkdown: string } {
  const headings: HeadingItem[] = [];
  const modifiedMarkdown = markdown.replace(/^(#{2,3})\s+(.+)$/gm, (_match, hashes, title) => {
    const level = hashes.length;
    const cleanTitle = title.replace(/\*\*/g, '').trim();
    const id = slugify(cleanTitle);
    headings.push({ id, text: cleanTitle, level });
    return `\n\n<h${level} id="${id}">${cleanTitle}</h${level}>\n\n`;
  });

  return { headings, modifiedMarkdown };
}

export class ContentLoader {
  private static cachedTopics: Topic[] | null = null;
  private static cachedQuestions: Question[] | null = null;
  private static cachedGlossary: GlossaryTerm[] | null = null;

  public static async getTopics(): Promise<Topic[]> {
    if (this.cachedTopics) return this.cachedTopics;

    // Vite glob import for markdown topics
    const topicModules = import.meta.glob('/content/topics/*.md', {
      query: '?raw',
      eager: true,
      import: 'default'
    }) as Record<string, string>;

    const topics: Topic[] = [];

    for (const [path, rawContent] of Object.entries(topicModules)) {
      const { data, content } = parseFrontmatter(rawContent);
      const filename = path.split('/').pop()?.replace('.md', '') || 'topic';

      // Markdown transformations
      let processed = cleanMarkdownText(content);
      processed = transformCallouts(processed);
      processed = transformMiniQuizzes(processed);
      processed = transformDialectTabs(processed);
      const { headings, modifiedMarkdown } = extractHeadings(processed);

      // Parse markdown to HTML
      const html = await marked.parse(modifiedMarkdown, { async: true });

      topics.push({
        id: data.id || filename,
        slug: data.slug || filename,
        order: Number(data.order) || 99,
        title: cleanMarkdownText(data.title || filename),
        category: data.category || 'Ümumi',
        priority: data.priority || 'medium',
        readiness: data.readiness || 'oyrenmeliyem',
        vacancyLink: cleanMarkdownText(data.vacancyLink || ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        summary: cleanMarkdownText(data.summary || ''),
        rawMarkdown: content,
        html,
        headings
      });
    }

    topics.sort((a, b) => a.order - b.order);
    this.cachedTopics = topics;
    return topics;
  }

  public static async getTopicBySlug(slug: string): Promise<Topic | undefined> {
    const topics = await this.getTopics();
    return topics.find(t => t.slug === slug || t.id === slug);
  }

  public static async getQuestions(): Promise<Question[]> {
    if (this.cachedQuestions) return this.cachedQuestions;

    const qaModules = import.meta.glob('/content/qa/*.json', {
      eager: true,
      import: 'default'
    }) as Record<string, Question[]>;

    const questions: Question[] = [];
    for (const qArray of Object.values(qaModules)) {
      if (Array.isArray(qArray)) {
        questions.push(...qArray);
      }
    }

    this.cachedQuestions = questions;
    return questions;
  }

  public static async getGlossary(): Promise<GlossaryTerm[]> {
    if (this.cachedGlossary) return this.cachedGlossary;

    const glossaryModules = import.meta.glob('/content/glossary.json', {
      eager: true,
      import: 'default'
    }) as Record<string, GlossaryTerm[]>;

    const glossary: GlossaryTerm[] = [];
    for (const gArray of Object.values(glossaryModules)) {
      if (Array.isArray(gArray)) {
        glossary.push(...gArray);
      }
    }

    this.cachedGlossary = glossary;
    return glossary;
  }

  private static cachedProjects: Project[] | null = null;

  public static async getProjects(): Promise<Project[]> {
    if (this.cachedProjects) return this.cachedProjects;

    const projectModules = import.meta.glob('/content/projects/*.md', {
      query: '?raw',
      eager: true,
      import: 'default'
    }) as Record<string, string>;

    const projects: Project[] = [];

    for (const [path, rawContent] of Object.entries(projectModules)) {
      const { data, content } = parseFrontmatter(rawContent);
      const filename = path.split('/').pop()?.replace('.md', '') || 'project';

      let processed = cleanMarkdownText(content);
      processed = transformCallouts(processed);
      processed = transformMiniQuizzes(processed);
      processed = transformDialectTabs(processed);
      const { headings, modifiedMarkdown } = extractHeadings(processed);

      const html = await marked.parse(modifiedMarkdown, { async: true });

      projects.push({
        id: data.id || filename,
        slug: data.slug || filename,
        title: cleanMarkdownText(data.title || filename),
        subtitle: cleanMarkdownText(data.subtitle || ''),
        date: data.date || '',
        role: data.role || 'Data Mühəndisi',
        tags: Array.isArray(data.tags) ? data.tags : [],
        rawMarkdown: content,
        html,
        headings
      });
    }

    this.cachedProjects = projects;
    return projects;
  }

  public static async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const projects = await this.getProjects();
    return projects.find(p => p.slug === slug || p.id === slug);
  }

  public static async parseMarkdownDocument(raw: string): Promise<{ data: Record<string, any>; html: string; headings: HeadingItem[] }> {
    const { data, content } = parseFrontmatter(raw);
    let processed = cleanMarkdownText(content);
    processed = transformCallouts(processed);
    processed = transformMiniQuizzes(processed);
    processed = transformDialectTabs(processed);
    const { headings, modifiedMarkdown } = extractHeadings(processed);
    const html = await marked.parse(modifiedMarkdown, { async: true });
    return { data, html, headings };
  }

  public static async getSqlPractice(): Promise<SqlPracticeItem[]> {
    const modules = import.meta.glob('/content/sql-practice.json', {
      eager: true,
      import: 'default'
    }) as Record<string, SqlPracticeItem[]>;
    const items = Object.values(modules)[0];
    return items || [];
  }



  public static highlightCode(code: string, language: string): string {
    const lang = language.toLowerCase();
    const prismLang = Prism.languages[lang] || Prism.languages.sql;
    try {
      return Prism.highlight(code, prismLang, lang);
    } catch {
      return code;
    }
  }
}
