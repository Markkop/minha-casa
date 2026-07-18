import type { Property } from "$lib/listings/types";
import { getPropertyTypeOption } from "$lib/components/listings/listings-table-shared";
import { resolveListingDisplayTitle } from "$lib/listing-display-title";

const OUTPUT_FORMAT = `
Retorne APENAS linhas no formato #CAMPO=valor (sem JSON, markdown ou texto extra).

Campos globais:
#LATITUDE=
#LONGITUDE=
#GROUND_ELEVATION_M_ABOVE_MSL=
#NEAREST_WATER_BODY_NAME=
#NEAREST_WATER_BODY_DISTANCE_M=
#CREEK_LEVEL_M_RELATIVE_TO_STREET=
#SIDEWALK_LEVEL_M_RELATIVE_TO_STREET=
#HOUSE_THRESHOLD_LEVEL_M_RELATIVE_TO_STREET=
#CONFIDENCE=
#MAIN_SOURCES=
#ASSUMPTIONS=
#WARNINGS=

Para cada cenario, use um bloco:
#SCENARIO_START
#SCENARIO_KIND=current|historical|future
#SCENARIO_YEAR=
#SCENARIO_LABEL= (title curto, no maximo 5 palavras)
#SCENARIO_RAIN_24H_MM=
#SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET=
#SCENARIO_CONFIDENCE=
#SCENARIO_SOURCES=
#SCENARIO_ASSUMPTIONS=
#SCENARIO_END

Requisitos de cenarios (minimo 5):
- 1 cenario atual (kind=current)
- 2 eventos historicos locais ou regionais (kind=historical)
- Pelo menos 2 projecoes futuras (kind=future), preferindo anos 2030 e 2050 quando nao houver justificativa melhor

Interpretacao das cotas:
- Valores *_M_RELATIVE_TO_STREET sao em metros em relacao ao nivel da rua
- SCENARIO_WATER_LEVEL_M_RELATIVE_TO_STREET: positivo = agua acima da rua, negativo = abaixo da rua
`.trim();

export function buildFloodRiskPrompt(listing: Property | null): string {
  if (!listing) return "";

  const title = resolveListingDisplayTitle(listing);
  const tipo = getPropertyTypeOption(listing.propertyType).label;
  const addressParts = [listing.address, listing.neighborhood, listing.city].filter(Boolean);
  const address = addressParts.join(", ") || "Endereco nao informado";

  const hasCoords = listing.customLat != null && listing.customLng != null;
  const coordsSection = hasCoords
    ? `Coordenadas informadas pelo usuario: latitude ${listing.customLat}, longitude ${listing.customLng}.`
    : "Coordenadas customizadas nao informadas. Estime com base no address e registre incertezas em #ASSUMPTIONS=.";

  return [
    "Você é um assistente de análise de risco de enchente para imóveis no Brasil.",
    "Esta e uma estimativa informativa para apoio a decisao — NAO substitui laudo tecnico, ART ou estudo hidrologico.",
    "",
    "=== IMOVEL ===",
    `Titulo: ${title}`,
    `Endereco: ${address}`,
    `Tipo: ${tipo}`,
    coordsSection,
    "",
    "=== TAREFA ===",
    "Pesquise risco de enchente, corregos/cursos d'agua proximos, eventos historicos de chuva extrema na regiao e projecoes climaticas.",
    "Estime cotas relativas a rua e niveis de agua por cenario.",
    "",
    "=== FORMATO DE SAIDA ===",
    OUTPUT_FORMAT
  ].join("\n");
}
