import { Scenario, ElementHeight } from './types';

// Tabela 1 Data - Geometria básica (Shared Geometry)
// Heights are relative to creek bed (0.00) in Tabela 1.
export const LEVEL_BLOCKS: ElementHeight[] = [
  { id: 'leito', name: 'Leito Córrego', height_rel_creek: 0.10, x_pos: 0, width: 4, depth: 10, color: '#57534e' }, // Stone 700
  { id: 'talude', name: 'Talude', height_rel_creek: 1.20, x_pos: 2.75, width: 1.5, depth: 10, color: '#3f6212' }, // Lime 800
  { id: 'rua', name: 'Nível Rua', height_rel_creek: 2.00, x_pos: 5.5, width: 4, depth: 10, color: '#334155' }, // Slate 700
  { id: 'calcada', name: 'Calçada', height_rel_creek: 2.15, x_pos: 9.0, width: 3, depth: 10, color: '#475569' }, // Slate 600
  { id: 'garagem', name: 'Piso Garagem', height_rel_creek: 2.40, x_pos: 12.0, width: 3, depth: 10, color: '#94a3b8' }, // Slate 400
  { id: 'casa', name: 'Piso Casa', height_rel_creek: 2.70, x_pos: 16.5, width: 6, depth: 10, color: '#166534' }, // Green 800
  { id: 'quintal', name: 'Quintal', height_rel_creek: 2.50, x_pos: 21.5, width: 4, depth: 10, color: '#22c55e' }, // Green 500
];

// --- DATASET 1: "ChatGPT 1" ---
// Baseline: Dry & 2023. Projections: 2030, 2040, 2050, 2075, 2100.
// Interpolated based on original moderate-high curve.
export const SCENARIOS_CHATGPT: Scenario[] = [
  { id: 'S0_no_rain', year: 2005, description: 'Referência (Seco)', rain_24h_mm: 0, level_rel_creek: 0.30, level_rel_street: -1.70, level_rel_house: -2.40 },
  { id: 'S2_2023_like', year: 2023, description: 'Evento Intenso (Atual)', rain_24h_mm: 185, level_rel_creek: 2.30, level_rel_street: 0.30, level_rel_house: -0.40 },
  { id: 'S_2030', year: 2030, description: 'Projeção 2030', rain_24h_mm: 195, level_rel_creek: 2.50, level_rel_street: 0.50, level_rel_house: -0.20 },
  { id: 'S_2040', year: 2040, description: 'Projeção 2040', rain_24h_mm: 210, level_rel_creek: 2.75, level_rel_street: 0.75, level_rel_house: 0.05 },
  { id: 'S4_2050_mod', year: 2050, description: 'Projeção 2050 (Mod)', rain_24h_mm: 220, level_rel_creek: 3.00, level_rel_street: 1.00, level_rel_house: 0.30 },
  { id: 'S_2075', year: 2075, description: 'Projeção 2075', rain_24h_mm: 230, level_rel_creek: 3.10, level_rel_street: 1.10, level_rel_house: 0.40 },
  { id: 'S5_2100_high', year: 2100, description: 'Projeção 2100 (Alto)', rain_24h_mm: 240, level_rel_creek: 3.20, level_rel_street: 1.20, level_rel_house: 0.50 },
];

// --- DATASET 2: "Gemini 1" ---
// Baseline: Dry & 2023 (Florianópolis). Projections: 2030, 2040, 2050, 2075, 2100.
// Based on UFSC/Epagri trends (+30% intensity by 2030, Sea Level Rise by 2100).
export const SCENARIOS_GEMINI: Scenario[] = [
  { id: 'G0_media_inverno', year: 2022, description: 'Referência (Seco)', rain_24h_mm: 0, level_rel_creek: 0.40, level_rel_street: -1.60, level_rel_house: -2.30 },
  { id: 'G2_nov_2023', year: 2023, description: 'Evento Sta. Mônica (28/11)', rain_24h_mm: 185, level_rel_creek: 2.45, level_rel_street: 0.45, level_rel_house: -0.25 },
  { id: 'G3_2030', year: 2030, description: 'Tendência (+30%)', rain_24h_mm: 240, level_rel_creek: 2.85, level_rel_street: 0.85, level_rel_house: 0.15 },
  { id: 'G_2040', year: 2040, description: 'Projeção 2040', rain_24h_mm: 245, level_rel_creek: 2.95, level_rel_street: 0.95, level_rel_house: 0.25 },
  { id: 'G_2050', year: 2050, description: 'Projeção 2050', rain_24h_mm: 250, level_rel_creek: 3.05, level_rel_street: 1.05, level_rel_house: 0.35 },
  { id: 'G_2075', year: 2075, description: 'Projeção 2075', rain_24h_mm: 255, level_rel_creek: 3.28, level_rel_street: 1.28, level_rel_house: 0.58 },
  { id: 'G4_mar_2100', year: 2100, description: 'Projeção 2100 (Mar+)', rain_24h_mm: 260, level_rel_creek: 3.50, level_rel_street: 1.50, level_rel_house: 0.80 }
];

export const WATER_COLOR_SAFE = '#3b82f6';
export const WATER_COLOR_DANGER = '#ef4444';

