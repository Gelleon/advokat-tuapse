import type { ServiceChildLink, ServiceIconId } from './types';

/** Lightweight homepage cards — keep full page copy out of the main JS bundle. */
export interface MainServiceCard {
  areaSlug: string;
  path: string;
  shortTitle: string;
  cardDescription: string;
  iconId: ServiceIconId;
  children: ServiceChildLink[];
}

export const MAIN_SERVICE_CARDS: MainServiceCard[] = [
  {
    areaSlug: 'ugolovnye-dela',
    path: 'ugolovnye-dela',
    shortTitle: 'Уголовные дела',
    cardDescription: 'Профессиональная защита прав и интересов в уголовном процессе на всех стадиях',
    iconId: 'criminal',
    children: [
      {
        slug: 'predvaritelnoe-sledstvie',
        title: 'Предварительное следствие и дознание',
        shortDescription: 'Защита с первых часов: допросы, меры пресечения, следственные действия.',
      },
      {
        slug: 'sudebnoe-razbiratelstvo',
        title: 'Судебное разбирательство',
        shortDescription: 'Представительство в суде первой инстанции и при обжаловании приговора.',
      },
      {
        slug: 'obzhalovanie-deystviy',
        title: 'Обжалование действий правоохранительных органов',
        shortDescription: 'Жалобы на незаконные действия и бездействие следствия и дознания.',
      },
      {
        slug: 'zashchita-poterpevshih',
        title: 'Защита прав потерпевших',
        shortDescription: 'Представительство потерпевшего: заявление требований, контроль хода дела.',
      },
    ],
  },
  {
    areaSlug: 'semeynye-spory',
    path: 'semeynye-spory',
    shortTitle: 'Семейные споры',
    cardDescription: 'Деликатное решение семейных споров с учетом интересов доверителя',
    iconId: 'family',
    children: [
      {
        slug: 'razdel-imushchestva',
        title: 'Раздел совместно нажитого имущества',
        shortDescription: 'Раздел квартиры, транспорта, долей и долгов супругов.',
      },
      {
        slug: 'alimenty',
        title: 'Взыскание и изменение алиментов',
        shortDescription: 'Взыскание, снижение и увеличение алиментов, задолженность.',
      },
      {
        slug: 'zashchita-supruga-pri-bankrotstve',
        title: 'Защита прав супруга при банкротстве',
        shortDescription: 'Интересы второго супруга при банкротстве семьи и общем имуществе.',
      },
      {
        slug: 'brachnye-dogovory',
        title: 'Брачные договоры',
        shortDescription: 'Составление и оспаривание брачного договора.',
      },
    ],
  },
  {
    areaSlug: 'zemelnye-spory',
    path: 'zemelnye-spory',
    shortTitle: 'Земельные споры',
    cardDescription: 'Защита прав на земельные участки и разрешение земельных споров',
    iconId: 'land',
    children: [
      {
        slug: 'ustanovlenie-granic',
        title: 'Споры об установлении границ',
        shortDescription: 'Межевые конфликты с соседями, уточнение границ участка.',
      },
      {
        slug: 'sobstvennost-i-arenda',
        title: 'Споры о праве собственности и аренды',
        shortDescription: 'Признание права, оспаривание сделок, арендные конфликты.',
      },
      {
        slug: 'kadastrovaya-oshibka',
        title: 'Исправление кадастровой ошибки',
        shortDescription: 'Исправление ошибок в сведениях ЕГРН и кадастре.',
      },
      {
        slug: 'samovolnye-stroeniya',
        title: 'Узаконивание самовольных строений',
        shortDescription: 'Признание права на самовольную постройку или защита от сноса.',
      },
    ],
  },
  {
    areaSlug: 'bankrotstvo',
    path: 'bankrotstvo',
    shortTitle: 'Банкротство',
    cardDescription: 'Комплексное сопровождение процедур банкротства',
    iconId: 'bankruptcy',
    children: [
      {
        slug: 'fizicheskih-lic',
        title: 'Банкротство физических лиц',
        shortDescription: 'Процедура несостоятельности гражданина: реструктуризация или реализация имущества.',
      },
      {
        slug: 'yuridicheskih-lic',
        title: 'Банкротство юридических лиц',
        shortDescription: 'Сопровождение банкротства ООО и иных организаций, защита интересов кредиторов и должника.',
      },
      {
        slug: 'zashchita-imushchestva',
        title: 'Защита имущества при банкротстве',
        shortDescription: 'Сохранение жилья, оспаривание незаконных требований, защита интересов семьи.',
      },
      {
        slug: 'spisanie-dolgov',
        title: 'Списание долгов',
        shortDescription: 'Какие обязательства можно списать и как проходит освобождение от долгов.',
      },
    ],
  },
  {
    areaSlug: 'arbitrazhnye-spory',
    path: 'arbitrazhnye-spory',
    shortTitle: 'Арбитражные дела',
    cardDescription: 'Профессиональное представительство в арбитражных судах всех инстанций',
    iconId: 'arbitration',
    children: [
      {
        slug: 'ekonomicheskie-spory',
        title: 'Экономические споры',
        shortDescription: 'Взыскание задолженности, споры по договорам, убытки и неустойка.',
      },
      {
        slug: 'korporativnye-spory',
        title: 'Корпоративные споры',
        shortDescription: 'Конфликты участников, оспаривание решений органов управления.',
      },
      {
        slug: 'nalogovye-spory',
        title: 'Налоговые споры',
        shortDescription: 'Оспаривание доначислений, требований и актов налоговой проверки.',
      },
      {
        slug: 'ispolnitelnoe-proizvodstvo',
        title: 'Исполнительное производство',
        shortDescription: 'Исполнение решений, работа с приставами, защита должника и взыскателя.',
      },
    ],
  },
  {
    areaSlug: 'nasledstvennye-spory',
    path: 'nasledstvennye-spory',
    shortTitle: 'Наследственные споры',
    cardDescription: 'Защита прав наследников',
    iconId: 'inheritance',
    children: [
      {
        slug: 'vosstanovlenie-sroka',
        title: 'Восстановление срока принятия наследства',
        shortDescription: 'Если пропущен шестимесячный срок — оцениваем шансы и готовим иск.',
      },
      {
        slug: 'ustanovlenie-rodstva',
        title: 'Установление факта родства',
        shortDescription: 'Судебное подтверждение родственных отношений для наследования.',
      },
      {
        slug: 'nasledstvennaya-massa',
        title: 'Изменение наследственной массы',
        shortDescription: 'Включение и исключение имущества из состава наследства.',
      },
      {
        slug: 'pravo-sobstvennosti',
        title: 'Споры о праве собственности на наследство',
        shortDescription: 'Конфликты между наследниками о праве на имущество.',
      },
    ],
  },
];
