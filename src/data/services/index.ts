import { arbitrationServices } from './arbitration';
import { bankruptcyServices } from './bankruptcy';
import { criminalServices } from './criminal';
import { familyServices } from './family';
import { inheritanceServices } from './inheritance';
import { landServices } from './land';
import type { ServiceAreaMeta, ServicePageContent } from './types';

export type { ServiceFaq, ServicePageContent, ServiceSection, ServiceChildLink, ServiceAreaMeta, ServiceIconId } from './types';

export const SERVICE_AREA_META: ServiceAreaMeta[] = [
  { areaSlug: 'ugolovnye-dela', iconId: 'criminal', practiceAreaId: 'criminal' },
  { areaSlug: 'semeynye-spory', iconId: 'family', practiceAreaId: 'family' },
  { areaSlug: 'zemelnye-spory', iconId: 'land', practiceAreaId: 'land' },
  { areaSlug: 'bankrotstvo', iconId: 'bankruptcy', practiceAreaId: 'bankruptcy' },
  { areaSlug: 'arbitrazhnye-spory', iconId: 'arbitration', practiceAreaId: 'arbitration' },
  { areaSlug: 'nasledstvennye-spory', iconId: 'inheritance', practiceAreaId: 'inheritance' },
];

export const ALL_SERVICES: ServicePageContent[] = [
  ...criminalServices,
  ...familyServices,
  ...landServices,
  ...bankruptcyServices,
  ...arbitrationServices,
  ...inheritanceServices,
];

const byPath = new Map(ALL_SERVICES.map((service) => [service.path, service]));

export function getServiceByPath(areaSlug: string, topicSlug?: string): ServicePageContent | undefined {
  const path = topicSlug ? `${areaSlug}/${topicSlug}` : areaSlug;
  return byPath.get(path);
}

export function isValidServicePath(areaSlug: string, topicSlug?: string): boolean {
  return Boolean(getServiceByPath(areaSlug, topicSlug));
}

export function getServiceByFullPath(path: string): ServicePageContent | undefined {
  return byPath.get(path.replace(/^\//, '').replace(/\/$/, ''));
}

export function getMainServices(): ServicePageContent[] {
  return SERVICE_AREA_META.map((meta) => byPath.get(meta.areaSlug)).filter(
    (service): service is ServicePageContent => Boolean(service)
  );
}

export function getChildServices(areaSlug: string): ServicePageContent[] {
  return ALL_SERVICES.filter((service) => service.areaSlug === areaSlug && service.topicSlug);
}

export function getRelatedServices(service: ServicePageContent): ServicePageContent[] {
  return service.related
    .map((path) => byPath.get(path))
    .filter((item): item is ServicePageContent => Boolean(item));
}

export function getParentService(service: ServicePageContent): ServicePageContent | undefined {
  if (!service.topicSlug) return undefined;
  return byPath.get(service.areaSlug);
}

export function getAllServicePaths(): string[] {
  return ALL_SERVICES.map((service) => `/${service.path}`);
}
