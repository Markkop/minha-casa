"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SCENARIOS_CHATGPT, SCENARIOS_GEMINI, LEVEL_BLOCKS } from '../lib/constants';
import { World } from './World';
import { ConnectionType } from '../lib/types';
import { Info, AlertTriangle, CloudRain, Calendar, Home, Database, Settings, Copy } from 'lucide-react';
import { ElementHeight, Scenario } from '../lib/types';

interface BlockConfigItemProps {
  block: ElementHeight;
  onHeightChange: (blockId: string, newHeight: number) => void;
}

const BlockConfigItem: React.FC<BlockConfigItemProps> = ({ block, onHeightChange }) => {
  const [inputValue, setInputValue] = useState(block.height_rel_creek.toString());

  // Update input value when block height changes externally
  React.useEffect(() => {
    setInputValue(block.height_rel_creek.toString());
  }, [block.height_rel_creek]);

  const handleBlur = () => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onHeightChange(block.id, numValue);
    } else {
      setInputValue(block.height_rel_creek.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-800 border-slate-700">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-3 h-3 rounded-full" style={{backgroundColor: block.color}} />
        <span className="text-slate-300 text-sm font-medium">{block.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-slate-200 text-sm font-mono focus:outline-none focus:border-purple-500"
        />
        <span className="text-slate-500 text-xs">m</span>
      </div>
    </div>
  );
};

type DataSourceType = 'CHATGPT' | 'GEMINI' | 'CUSTOM' | 'CONFIGURE';

interface CustomJsonData {
  scenarios: Scenario[];
  blocks?: Record<string, number>;
}

const FloodRiskClient: React.FC = () => {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [dataSource, setDataSource] = useState<DataSourceType>('CHATGPT');
  const [customBlocks, setCustomBlocks] = useState<ElementHeight[]>(() => 
    LEVEL_BLOCKS.map(block => ({ ...block }))
  );
  const [customJson, setCustomJson] = useState<string>('');
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Default configuration
  const [edgeStates, setEdgeStates] = useState<Record<number, ConnectionType>>({
      0: ConnectionType.RAMP, // Leito -> Talude
      1: ConnectionType.RAMP, // Talude -> Rua
      2: ConnectionType.STEP, // Rua -> Calcada
      3: ConnectionType.RAMP, // Calcada -> Garagem
      4: ConnectionType.STEP, // Garagem -> Casa
      5: ConnectionType.STEP, // Casa -> Quintal
  });

  const currentScenarios = useMemo(() => {
    if (dataSource === 'CHATGPT') return SCENARIOS_CHATGPT;
    if (dataSource === 'GEMINI') return SCENARIOS_GEMINI;
    if (dataSource === 'CUSTOM') return customScenarios;
    return [];
  }, [dataSource, customScenarios]);

  // Ensure activeScenarioIdx is within bounds
  useEffect(() => {
    if (currentScenarios.length > 0 && activeScenarioIdx >= currentScenarios.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Bounds check pattern
      setActiveScenarioIdx(0);
    }
  }, [currentScenarios.length, activeScenarioIdx]);

  // Refresh subscription cookie on mount to ensure it's up-to-date
  useEffect(() => {
    // Call the subscriptions API to refresh the cookie
    // This ensures the middleware has the correct subscription status
    fetch("/api/subscriptions", {
      method: "GET",
      credentials: "include",
    }).catch((error) => {
      // Silently fail - if there's an error, the middleware will handle it
      console.error("Failed to refresh subscription cookie:", error)
    })
  }, []);

  const activeScenario = currentScenarios[activeScenarioIdx];
  
  // Water level: use scenario level for CHATGPT/GEMINI/CUSTOM, use default dry level for CONFIGURE
  const waterLevel = dataSource === 'CONFIGURE' ? 0.30 : (activeScenario?.level_rel_creek ?? 0.30);

  // Memoize canvas props to prevent remounts
  const canvasProps = useMemo(() => ({
    shadows: true,
    camera: { position: [20, 8, 20] as [number, number, number], fov: 40 },
    gl: { preserveDrawingBuffer: true, antialias: true },
    style: { width: '100%', height: '100%' }
  }), []);

  const toggleEdge = (index: number) => {
    setEdgeStates(prev => ({
      ...prev,
      [index]: prev[index] === ConnectionType.RAMP ? ConnectionType.STEP : ConnectionType.RAMP
    }));
  };

  const handleSourceChange = (source: DataSourceType) => {
    setDataSource(source);
    if (source !== 'CONFIGURE') {
      setActiveScenarioIdx(0);
    }
  };

  const parseCustomJson = (jsonString: string) => {
    setJsonError(null);
    if (!jsonString.trim()) {
      setCustomScenarios([]);
      return;
    }

    try {
      const parsed = JSON.parse(jsonString) as CustomJsonData;
      
      if (!parsed.scenarios || !Array.isArray(parsed.scenarios)) {
        setJsonError('JSON must contain a "scenarios" array');
        setCustomScenarios([]);
        return;
      }

      // Validate scenarios structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validScenarios = parsed.scenarios.filter((s: any) => 
        s.id && 
        typeof s.year === 'number' && 
        s.description && 
        typeof s.rain_24h_mm === 'number' &&
        typeof s.level_rel_creek === 'number' &&
        typeof s.level_rel_street === 'number' &&
        typeof s.level_rel_house === 'number'
      );

      if (validScenarios.length === 0) {
        setJsonError('No valid scenarios found. Each scenario must have: id, year, description, rain_24h_mm, level_rel_creek, level_rel_street, level_rel_house');
        setCustomScenarios([]);
        return;
      }

      setCustomScenarios(validScenarios);

      // Apply block overrides if present
      if (parsed.blocks && typeof parsed.blocks === 'object') {
        setCustomBlocks(prev => prev.map(block => {
          if (parsed.blocks && parsed.blocks[block.id] !== undefined) {
            return { ...block, height_rel_creek: parsed.blocks[block.id] };
          }
          return block;
        }));
      }
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
      setCustomScenarios([]);
    }
  };

  const handleJsonChange = (value: string) => {
    setCustomJson(value);
    parseCustomJson(value);
  };

  const copyPrompt = () => {
    const prompt = 'Generate flood scenario JSON with historical data and forecasts for 2030, 2040, 2050, 2075, 2100. Include scenarios array (id, year, description, rain_24h_mm, level_rel_creek, level_rel_street, level_rel_house). Optional: blocks object with element height overrides (leito, talude, rua, calcada, garagem, casa, quintal - heights in meters relative to creek bed). Return only valid JSON.';
    navigator.clipboard.writeText(prompt);
  };

  const handleBlockHeightChange = (blockId: string, newHeight: number) => {
    setCustomBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, height_rel_creek: newHeight } : block
    ));
  };

  const isFlooded = (elementHeight: number) => activeScenario ? activeScenario.level_rel_creek > elementHeight : false;

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row bg-slate-900">
      
      {/* 3D Canvas Area */}
      <div className="flex-1 h-[60vh] md:h-full relative order-2 md:order-1 min-h-0">
        <Canvas {...canvasProps}>
          <World 
            waterLevel={waterLevel} 
            edgeStates={edgeStates}
            onToggleEdge={toggleEdge}
            customBlocks={customBlocks}
          />
          <OrbitControls 
            target={[12, 2, 0]} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.1}
            maxDistance={60}
          />
        </Canvas>
      </div>

      {/* Dashboard / Sidebar */}
      <div className="w-full md:w-[400px] h-[40vh] md:h-full overflow-y-auto bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 order-1 md:order-2 z-20 shadow-2xl">
        
        {/* Data Source Selector */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
            <Database size={16} /> Fonte de Dados
          </h2>
          <div className="grid grid-cols-4 gap-2 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => handleSourceChange('CHATGPT')}
              className={`py-2 px-4 rounded-md text-xs font-bold transition-all ${
                dataSource === 'CHATGPT'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ChatGPT
            </button>
            <button
              onClick={() => handleSourceChange('GEMINI')}
              className={`py-2 px-4 rounded-md text-xs font-bold transition-all ${
                dataSource === 'GEMINI'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gemini
            </button>
            <button
              onClick={() => handleSourceChange('CUSTOM')}
              className={`py-2 px-4 rounded-md text-xs font-bold transition-all ${
                dataSource === 'CUSTOM'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom
            </button>
            <button
              onClick={() => handleSourceChange('CONFIGURE')}
              className={`py-2 px-4 rounded-md text-xs font-bold transition-all ${
                dataSource === 'CONFIGURE'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Configure
            </button>
          </div>
        </div>

        {/* Scenario Selector or Configuration Panel */}
        {dataSource === 'CONFIGURE' ? (
          <div>
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Settings size={16} /> Configure
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {customBlocks.map((block) => (
                <BlockConfigItem
                  key={block.id}
                  block={block}
                  onHeightChange={handleBlockHeightChange}
                />
              ))}
            </div>
          </div>
        ) : dataSource === 'CUSTOM' ? (
          <div>
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Database size={16} /> Custom JSON
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md transition-all"
                >
                  <Copy size={14} />
                  Copy Prompt
                </button>
              </div>
              <textarea
                value={customJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder='Paste JSON here...'
                className="w-full h-48 px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500 resize-none"
              />
              {jsonError && (
                <div className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-md p-2">
                  {jsonError}
                </div>
              )}
              {customScenarios.length > 0 && !jsonError && (
                <div className="text-emerald-400 text-xs bg-emerald-900/20 border border-emerald-800 rounded-md p-2">
                  {customScenarios.length} scenario{customScenarios.length !== 1 ? 's' : ''} loaded successfully
                </div>
              )}
            </div>
            {customScenarios.length > 0 && (
              <div className="mt-4">
                <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Cenários
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {customScenarios.map((scenario, idx) => (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveScenarioIdx(idx)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        idx === activeScenarioIdx 
                          ? 'bg-amber-600/20 border-amber-500 text-amber-100'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-bold text-sm">{scenario.year}</span>
                        <span className="text-xs opacity-70 max-w-[180px] truncate">{scenario.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <CloudRain size={14} />
                         <span className="text-xs font-mono">{scenario.rain_24h_mm}mm</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Calendar size={16} /> {dataSource === 'GEMINI' ? 'Cenários Climáticos' : 'Cenários de Chuva'}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {currentScenarios.map((scenario, idx) => (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenarioIdx(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    idx === activeScenarioIdx 
                      ? dataSource === 'GEMINI' 
                         ? 'bg-emerald-600/20 border-emerald-500 text-emerald-100'
                         : 'bg-blue-600/20 border-blue-500 text-blue-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-bold text-sm">{scenario.year}</span>
                    <span className="text-xs opacity-70 max-w-[180px] truncate">{scenario.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <CloudRain size={14} />
                     <span className="text-xs font-mono">{scenario.rain_24h_mm}mm</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Scenario Details */}
        {dataSource !== 'CONFIGURE' && activeScenario && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
               <div>
                 <h3 className="text-lg font-bold text-white">{activeScenario.description}</h3>
                 <p className="text-sm text-slate-400">Nível Água (Rel. Leito): <span className={`${dataSource === 'GEMINI' ? 'text-emerald-400' : dataSource === 'CUSTOM' ? 'text-amber-400' : 'text-blue-400'} font-mono text-base`}>{activeScenario.level_rel_creek.toFixed(2)}m</span></p>
               </div>
               {activeScenario.rain_24h_mm > 150 && (
                  <AlertTriangle className="text-red-500 animate-pulse" />
               )}
            </div>

            <h4 className="text-xs uppercase text-slate-500 font-bold mb-2">Status dos Elementos</h4>
            <div className="space-y-2">
               {customBlocks.filter(b => ['rua', 'garagem', 'casa', 'quintal'].includes(b.id)).map(block => {
                  const flooded = isFlooded(block.height_rel_creek);
                  const diff = activeScenario.level_rel_creek - block.height_rel_creek;
                  
                  return (
                    <div key={block.id} className={`flex items-center justify-between text-sm p-2 rounded border ${flooded ? 'bg-red-900/20 border-red-800' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="flex items-center gap-2">
                         {block.id === 'casa' ? <Home size={14} className="text-orange-400"/> : <div className="w-3 h-3 rounded-full" style={{backgroundColor: block.color}} />}
                         <span className="text-slate-300">{block.name}</span>
                         <span className="text-[10px] text-slate-500">({block.height_rel_creek.toFixed(2)}m)</span>
                      </div>
                      <div className={`font-mono font-bold text-xs ${flooded ? 'text-red-400' : 'text-emerald-400'}`}>
                         {flooded ? `+${diff.toFixed(2)}m` : 'SECO'}
                      </div>
                    </div>
                  );
               })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-800">
           <p className="text-xs text-slate-500 leading-relaxed">
             <Info size={12} className="inline mr-1" />
             {dataSource === 'CONFIGURE'
               ? 'Ajuste as alturas dos elementos e veja a atualização em tempo real na cena 3D. Carro e casa são ocultados quando as alturas ficam abaixo dos valores de referência.'
               : dataSource === 'CUSTOM'
                 ? 'Cole JSON com cenários de enchente. Use o botão "Copy Prompt" para obter instruções para gerar o JSON com IA.'
                 : dataSource === 'GEMINI' 
                   ? 'Dados baseados em estatísticas da UFSC, EPAGRI e Defesa Civil para Florianópolis (Santa Mônica/Itacorubi).'
                   : 'Níveis genéricos baseados em projeções padrão. A casa (2.70m) é atingida em cenários extremos.'
             }
           </p>
        </div>

      </div>
    </div>
  );
};

export default FloodRiskClient;

