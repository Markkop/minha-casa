export type Scenario = {
  id: string;
  year: number;
  description: string;
  rain_24h_mm: number;
  level_rel_creek: number;
  level_rel_street: number;
  level_rel_house: number;
};

export type ElementHeight = {
  id: string;
  name: string;
  height_rel_creek: number;
  x_pos: number;
  width: number;
  depth: number;
  color: string;
};

export type ConnectionType = "STEP" | "RAMP";
export type DataSourceType = "CHATGPT" | "GEMINI" | "CUSTOM" | "CONFIGURE";

export const colors = {
  creek: "#4f7ec7",
  slope: "#7a8f5b",
  street: "#6b7280",
  sidewalk: "#b8c0cc",
  garage: "#c7a36a",
  houseGround: "#d8b38c",
  garden: "#5d9f61",
  water: "#3b82f6",
  ground: "#5b4636"
};

export const defaultBlocks: ElementHeight[] = [
  { id: "leito", name: "Leito Corrego", height_rel_creek: 0.1, x_pos: 0, width: 4, depth: 10, color: colors.creek },
  { id: "talude", name: "Talude", height_rel_creek: 1.2, x_pos: 2.75, width: 1.5, depth: 10, color: colors.slope },
  { id: "rua", name: "Nivel Rua", height_rel_creek: 2, x_pos: 5.5, width: 4, depth: 10, color: colors.street },
  { id: "calcada", name: "Calcada", height_rel_creek: 2.15, x_pos: 9, width: 3, depth: 10, color: colors.sidewalk },
  { id: "garagem", name: "Piso Garagem", height_rel_creek: 2.4, x_pos: 12, width: 3, depth: 10, color: colors.garage },
  { id: "casa", name: "Piso Casa", height_rel_creek: 2.7, x_pos: 16.5, width: 6, depth: 10, color: colors.houseGround },
  { id: "quintal", name: "Quintal", height_rel_creek: 2.5, x_pos: 21.5, width: 4, depth: 10, color: colors.garden }
];

export const scenariosChatGpt: Scenario[] = [
  { id: "S0_no_rain", year: 2005, description: "Referencia seco", rain_24h_mm: 0, level_rel_creek: 0.3, level_rel_street: -1.7, level_rel_house: -2.4 },
  { id: "S2_2023_like", year: 2023, description: "Evento intenso atual", rain_24h_mm: 185, level_rel_creek: 2.3, level_rel_street: 0.3, level_rel_house: -0.4 },
  { id: "S_2030", year: 2030, description: "Projecao 2030", rain_24h_mm: 195, level_rel_creek: 2.5, level_rel_street: 0.5, level_rel_house: -0.2 },
  { id: "S_2040", year: 2040, description: "Projecao 2040", rain_24h_mm: 210, level_rel_creek: 2.75, level_rel_street: 0.75, level_rel_house: 0.05 },
  { id: "S4_2050_mod", year: 2050, description: "Projecao 2050", rain_24h_mm: 220, level_rel_creek: 3, level_rel_street: 1, level_rel_house: 0.3 },
  { id: "S_2075", year: 2075, description: "Projecao 2075", rain_24h_mm: 230, level_rel_creek: 3.1, level_rel_street: 1.1, level_rel_house: 0.4 },
  { id: "S5_2100_high", year: 2100, description: "Projecao 2100 alto", rain_24h_mm: 240, level_rel_creek: 3.2, level_rel_street: 1.2, level_rel_house: 0.5 }
];

export const scenariosGemini: Scenario[] = [
  { id: "G0_media_inverno", year: 2022, description: "Referencia seco", rain_24h_mm: 0, level_rel_creek: 0.4, level_rel_street: -1.6, level_rel_house: -2.3 },
  { id: "G2_nov_2023", year: 2023, description: "Evento Sta. Monica", rain_24h_mm: 185, level_rel_creek: 2.45, level_rel_street: 0.45, level_rel_house: -0.25 },
  { id: "G3_2030", year: 2030, description: "Tendencia +30%", rain_24h_mm: 240, level_rel_creek: 2.85, level_rel_street: 0.85, level_rel_house: 0.15 },
  { id: "G_2040", year: 2040, description: "Projecao 2040", rain_24h_mm: 245, level_rel_creek: 2.95, level_rel_street: 0.95, level_rel_house: 0.25 },
  { id: "G_2050", year: 2050, description: "Projecao 2050", rain_24h_mm: 250, level_rel_creek: 3.05, level_rel_street: 1.05, level_rel_house: 0.35 },
  { id: "G_2075", year: 2075, description: "Projecao 2075", rain_24h_mm: 255, level_rel_creek: 3.28, level_rel_street: 1.28, level_rel_house: 0.58 },
  { id: "G4_mar_2100", year: 2100, description: "Projecao 2100", rain_24h_mm: 260, level_rel_creek: 3.5, level_rel_street: 1.5, level_rel_house: 0.8 }
];

export const customJsonPlaceholder = '{"scenarios":[...],"blocks":{"rua":2.1}}';
