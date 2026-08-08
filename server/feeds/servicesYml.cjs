'use strict';

const servicePages = require('./serviceFeedData.json');

const EXECUTOR = {
  name: 'Адвокаты Туапсе',
  phone: '+79180486112',
  phoneDisplay: '+7 (918) 048-61-12',
  region: 'Туапсе, Краснодарский край',
  yearsExperience: 15,
  rating: 0,
  reviewCount: 0,
  conversion: 100,
  priceFrom: 3000,
  picturePath: '/og-image.jpg',
  about:
    'Команда практикующих адвокатов в Туапсе и Туапсинском районе. Представительство в судах, консультации, подготовка документов.',
};

const LAWYER_CATEGORY_ID = 21;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

function pageUrl(baseUrl, routePath) {
  return `${normalizeBaseUrl(baseUrl)}/${routePath.replace(/^\/+/, '')}`;
}

function generateServicesYml(baseUrl, options = {}) {
  const executor = { ...EXECUTOR, ...options.executor };
  const siteUrl = normalizeBaseUrl(baseUrl);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<yml_catalog date="${dateStr}">\n`;
  xml += '  <shop>\n';
  xml += `    <name>${escapeXml(executor.name)}</name>\n`;
  xml += `    <company>${escapeXml(executor.name)}</company>\n`;
  xml += `    <url>${escapeXml(`${siteUrl}/`)}</url>\n`;

  xml += '    <categories>\n';
  xml += '      <category id="1">Исполнитель</category>\n';
  xml += '      <category id="21" parentId="1">Юристы</category>\n';
  xml += '    </categories>\n';

  xml += '    <sets>\n';
  servicePages.forEach((page, index) => {
    const setId = `s${index + 1}`;
    xml += `      <set id="${setId}">\n`;
    xml += `        <name>${escapeXml(`${page.title} в Туапсе`)}</name>\n`;
    xml += `        <url>${escapeXml(pageUrl(siteUrl, page.path))}</url>\n`;
    xml += '      </set>\n';
  });
  xml += '    </sets>\n';

  xml += '    <offers>\n';
  servicePages.forEach((page, index) => {
    const setId = `s${index + 1}`;
    const offerId = `offer-${index + 1}`;
    const offerUrl = pageUrl(siteUrl, page.path);
    // Yandex requires http(s) URL here — tel: is rejected as invalid type.
    const phonePageUrl = `${siteUrl}/`;
    const orderLink = `${siteUrl}/`;
    // Unique path per offer (Yandex image bot often skips ?query duplicates).
    const offerPictureUrl = `${siteUrl}/feed-images/${offerId}.jpg`;

    xml += `      <offer id="${offerId}">\n`;
    xml += `        <name>${escapeXml(executor.name)}</name>\n`;
    xml += `        <url>${escapeXml(offerUrl)}</url>\n`;
    xml += `        <price from="true">${executor.priceFrom}</price>\n`;
    xml += '        <currencyId>RUR</currencyId>\n';
    xml += `        <categoryId>${LAWYER_CATEGORY_ID}</categoryId>\n`;
    xml += `        <set-ids>${setId}</set-ids>\n`;
    xml += `        <picture>${escapeXml(offerPictureUrl)}</picture>\n`;
    xml += `        <description>${escapeXml(`${page.title}. ${page.description}`)}</description>\n`;
    xml += `        <param name="Рейтинг">${executor.rating}</param>\n`;
    xml += `        <param name="Число отзывов">${executor.reviewCount}</param>\n`;
    xml += `        <param name="Годы опыта">${executor.yearsExperience}</param>\n`;
    xml += `        <param name="Регион">${escapeXml(executor.region)}</param>\n`;
    xml += `        <param name="Конверсия">${executor.conversion}</param>\n`;
    xml += `        <param name="Ссылка на телефон">${escapeXml(phonePageUrl)}</param>\n`;
    xml += `        <param name="Ссылка на создание заказа">${escapeXml(orderLink)}</param>\n`;
    xml += `        <param name="Ссылка на профиль исполнителя">${escapeXml(`${siteUrl}/`)}</param>\n`;
    xml += `        <param name="Организация">true</param>\n`;
    xml += `        <param name="Об исполнителе">${escapeXml(executor.about)}</param>\n`;
    xml += '        <sales_notes>Консультация от 3000 ₽, стоимость услуги по договорённости</sales_notes>\n';
    xml += '      </offer>\n';
  });
  xml += '    </offers>\n';

  xml += '  </shop>\n';
  xml += '</yml_catalog>\n';

  return xml;
}

module.exports = { generateServicesYml, EXECUTOR, LAWYER_CATEGORY_ID };
