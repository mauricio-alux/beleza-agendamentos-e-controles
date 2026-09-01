import type { BusinessTypeCatalogAssociation } from "@/services/business-types.service";
import type { ServiceCatalog } from "@/services/services.service";

type VisibleService = Pick<ServiceCatalog, "id" | "nome">;
type CatalogApplicability = Pick<BusinessTypeCatalogAssociation, "servico_catalogo_id" | "ativo">;

export function compareServiceByVisibleName(
  a: Pick<ServiceCatalog, "nome">,
  b: Pick<ServiceCatalog, "nome">
) {
  return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
}

export function orderCatalogByApplicabilityAndName<T extends VisibleService>(
  services: readonly T[],
  associations: readonly CatalogApplicability[]
): T[] {
  const applicableCatalogIds = new Set(
    associations
      .filter((association) => association.ativo === true)
      .map((association) => association.servico_catalogo_id)
  );

  return [...services].sort((a, b) => {
    const aApplicable = applicableCatalogIds.has(a.id);
    const bApplicable = applicableCatalogIds.has(b.id);

    if (aApplicable !== bApplicable) {
      return aApplicable ? -1 : 1;
    }

    return compareServiceByVisibleName(a, b);
  });
}
