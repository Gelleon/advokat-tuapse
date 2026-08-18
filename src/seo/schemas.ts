import { SITE_NAME, SITE_URL, absoluteUrl } from '../config';

const BUSINESS = {
  phone: '+7-918-048-61-12',
  email: 'info@advokat-tuapse.ru',
  streetAddress: 'ул. Тельмана, 2',
  locality: 'Туапсе',
  postalCode: '352800',
  country: 'RU',
};

export function legalServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: absoluteUrl('/og-image.jpg'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.locality,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '13:00',
      },
    ],
    areaServed: {
      '@type': 'City',
      name: 'Туапсе',
    },
    priceRange: '$$',
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    inLanguage: 'ru-RU',
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function articleSchema(post: {
  title: string;
  slug: string;
  previewText: string;
  content: string;
  author?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  thumbnailUrl?: string;
  tags?: string[];
  metaDescription?: string;
}) {
  const published = post.publishedAt || post.createdAt;
  const image = post.thumbnailUrl
    ? post.thumbnailUrl.startsWith('http')
      ? post.thumbnailUrl
      : absoluteUrl(post.thumbnailUrl)
    : absoluteUrl('/og-image.jpg');

  const articleBody = stripHtml(post.content).slice(0, 5000);
  const keywords = (post.tags || [])
    .filter((t) => t && !/^(pravo|consultant):/i.test(t))
    .join(', ');

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.previewText || post.metaDescription,
    image,
    datePublished: published,
    dateModified: post.updatedAt || published,
    inLanguage: 'ru-RU',
    articleSection: 'Правовые материалы',
    keywords: keywords || undefined,
    articleBody: articleBody || undefined,
    author: {
      '@type': 'Organization',
      name: post.author || SITE_NAME,
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/scales.svg'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${post.slug}`),
    },
    isAccessibleForFree: true,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.includes('#')
        ? `${SITE_URL}${item.path.startsWith('/') ? item.path : `/${item.path}`}`
        : absoluteUrl(item.path || '/'),
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function serviceSchema(options: {
  name: string;
  description: string;
  path: string;
}) {
  const base = legalServiceSchema();
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    serviceType: options.name,
    areaServed: base.areaServed,
    provider: {
      '@type': 'LegalService',
      name: SITE_NAME,
      url: absoluteUrl('/'),
      telephone: BUSINESS.phone,
      address: base.address,
    },
  };
}
