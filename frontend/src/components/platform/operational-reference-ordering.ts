import type {
  OperationalProfileDefault,
  OperationalProfileService
} from "@/services/business-types.service";

type VisibleNameReader<T> = (item: T) => string;

export type OperationalReferenceCoverageItem = {
  service: OperationalProfileService;
  defaults: OperationalProfileDefault[];
};

export function compareOperationalReferenceVisibleName(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export function orderOperationalReferenceCoverage({
  services,
  defaults,
  getServiceName,
  getSpecialtyName
}: {
  services: readonly OperationalProfileService[];
  defaults: readonly OperationalProfileDefault[];
  getServiceName: VisibleNameReader<OperationalProfileService>;
  getSpecialtyName: VisibleNameReader<OperationalProfileDefault>;
}): OperationalReferenceCoverageItem[] {
  const defaultsByServiceId = new Map<string, OperationalProfileDefault[]>();

  for (const item of defaults) {
    const current = defaultsByServiceId.get(item.servico_catalogo_id) || [];
    defaultsByServiceId.set(item.servico_catalogo_id, [...current, item]);
  }

  return [...services]
    .sort((a, b) => compareOperationalReferenceVisibleName(getServiceName(a), getServiceName(b)))
    .map((service) => ({
      service,
      defaults: [...(defaultsByServiceId.get(service.servico_catalogo_id) || [])]
        .sort((a, b) => compareOperationalReferenceVisibleName(getSpecialtyName(a), getSpecialtyName(b)))
    }));
}
