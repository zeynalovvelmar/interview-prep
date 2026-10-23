export type Priority = 'high' | 'medium' | 'low';
export type Readiness = 'guclu' | 'orta' | 'oyrenmeliyem';
export type QuestionStatus = 'bilirem' | 'tekrar' | 'none';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface TopicFrontmatter {
  id: string;
  slug: string;
  order: number;
  title: string;
  category: string;
  priority: Priority;
  readiness: Readiness;
  vacancyLink?: string;
  tags?: string[];
  summary?: string;
}

export interface Topic extends TopicFrontmatter {
  rawMarkdown: string;
  html: string;
  headings: HeadingItem[];
}

export interface QuestionCode {
  language: string;
  dialect?: string;
  snippet: string;
}

export interface Question {
  id: string;
  category: string;
  difficulty: Difficulty;
  question: string;
  answer: string;
  code?: QuestionCode;
  followUps?: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface ProgressData {
  topics: Record<string, { learned: boolean; updatedAt: number }>;
  questions: Record<string, { status: QuestionStatus; updatedAt: number }>;
}

export interface ProjectFrontmatter {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  date: string;
  role: string;
  tags: string[];
}

export interface Project extends ProjectFrontmatter {
  rawMarkdown: string;
  html: string;
  headings: HeadingItem[];
}

export interface SearchItem {
  id: string;
  type: 'topic' | 'question' | 'glossary' | 'project';
  title: string;
  category: string;
  content: string;
  url: string;
  badge?: string;
}

