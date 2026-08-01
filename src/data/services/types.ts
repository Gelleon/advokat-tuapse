export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceSection {
  heading: string;
  body: string;
}

export interface ServiceChildLink {
  slug: string;
  title: string;
  shortDescription: string;
}

export interface ServicePageContent {
  /** Full path without leading slash, e.g. "bankrotstvo" or "bankrotstvo/fizicheskih-lic" */
  path: string;
  areaSlug: string;
  topicSlug?: string;
  title: string;
  shortTitle: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  intro: string;
  sections: ServiceSection[];
  faq: ServiceFaq[];
  /** Paths of related service pages */
  related: string[];
  /** Only on area (parent) pages */
  children?: ServiceChildLink[];
  /** Card blurb on homepage */
  cardDescription: string;
  /** Feature labels matching homepage bullets (area pages) */
  featureLabels?: string[];
}

export type ServiceIconId =
  | 'criminal'
  | 'family'
  | 'land'
  | 'bankruptcy'
  | 'arbitration'
  | 'inheritance';

export interface ServiceAreaMeta {
  areaSlug: string;
  iconId: ServiceIconId;
  practiceAreaId: string;
}
