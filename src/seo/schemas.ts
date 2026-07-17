import { SITE_NAME, SITE_URL } from '../config';

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
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${SITE_URL}/og-image.jpg`,
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
    url: SITE_URL,
    inLanguage: 'ru-RU',
  };
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
}) {
  const published = post.publishedAt || post.createdAt;
  const image = post.thumbnailUrl
    ? post.thumbnailUrl.startsWith('http')
      ? post.thumbnailUrl
      : `${SITE_URL}${post.thumbnailUrl}`
    : `${SITE_URL}/og-image.jpg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.previewText,
    image,
    datePublished: published,
    dateModified: post.updatedAt || published,
    author: {
      '@type': 'Organization',
      name: post.author || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/scales.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
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
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
