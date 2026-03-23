/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Wifi, 
  Smartphone, 
  Monitor, 
  Shield, 
  PhoneCall, 
  ShoppingCart, 
  MessageSquare, 
  Target,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Award,
  Info
} from 'lucide-react';

interface Indicator {
  id: string;
  label: string;
  icon: React.ReactNode;
  pontos: number;
  target: number;
  real: number;
  isPercentage: boolean;
  isLowerBetter?: boolean;
}

export default function App() {
  const [showInfo, setShowInfo] = useState(false);

  // Sales Indicators State
  const [salesIndicators, setSalesIndicators] = useState<Indicator[]>([
    { id: 'bl', label: 'BANDA LARGA *', icon: <Wifi size={18} />, pontos: 20, target: 15, real: 20, isPercentage: false },
    { id: 'cel', label: 'CELULAR *', icon: <Smartphone size={18} />, pontos: 10, target: 7, real: 8, isPercentage: false },
    { id: 'tv', label: 'TV*', icon: <Monitor size={18} />, pontos: 10, target: 6, real: 9, isPercentage: false },
    { id: 'mesh', label: 'MESH', icon: <Wifi size={18} className="rotate-45" />, pontos: 5, target: 5, real: 8, isPercentage: false },
    { id: 'port', label: 'PORTABILIDADE', icon: <Smartphone size={18} />, pontos: 5, target: 40, real: 37.5, isPercentage: true },
  ]);

  // Quality Indicators State
  const [qualityIndicators, setQualityIndicators] = useState<Indicator[]>([
    { id: 'churn', label: 'CHURN - DOMICÍLIO', icon: <Target size={18} />, pontos: 15, target: 0.80, real: 0.67, isPercentage: true, isLowerBetter: true },
    { id: 'vol', label: 'VOL. ATENDIMENTO', icon: <PhoneCall size={18} />, pontos: 5, target: 120, real: 165, isPercentage: false },
    { id: 'blind', label: 'BLINDAGEM', icon: <Shield size={18} />, pontos: 10, target: 10, real: 10, isPercentage: false },
    { id: 'cart', label: 'REPRESENT VENDAS CART', icon: <ShoppingCart size={18} />, pontos: 15, target: 25, real: 27.1, isPercentage: true },
    { id: 'nps', label: 'NPS (NOTA * TRATATIVA)', icon: <MessageSquare size={18} />, pontos: 5, target: 30.0, real: 30, isPercentage: false },
  ]);

  const calculateAting = (indicator: Indicator) => {
    if (indicator.isLowerBetter) {
      return indicator.real <= indicator.target ? 100 : Math.max(0, 100 - ((indicator.real - indicator.target) / indicator.target) * 100);
    }
    return (indicator.real / indicator.target) * 100;
  };

  const calculatePontuacao = (indicator: Indicator) => {
    const ating = calculateAting(indicator) / 100;
    return Math.min(indicator.pontos, indicator.pontos * ating);
  };

  const calculateGap = (indicator: Indicator) => {
    if (indicator.isLowerBetter) {
      const gap = indicator.real - indicator.target;
      return gap > 0 ? gap : 0;
    }
    const gap = indicator.target - indicator.real;
    return gap > 0 ? gap : 0;
  };

  const handleInputChange = (id: string, value: string, type: 'sales' | 'quality', field: 'real' | 'target') => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    if (type === 'sales') {
      setSalesIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, [field]: numValue } : ind));
    } else {
      setQualityIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, [field]: numValue } : ind));
    }
  };

  const totalSalesPontos = salesIndicators.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalSalesPontuacao = salesIndicators.reduce((acc, curr) => acc + calculatePontuacao(curr), 0);
  const finalSalesAting = (totalSalesPontuacao / totalSalesPontos) * 100;

  const totalQualityPontos = qualityIndicators.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalQualityPontuacao = qualityIndicators.reduce((acc, curr) => acc + calculatePontuacao(curr), 0);
  const finalQualityAting = (totalQualityPontuacao / totalQualityPontos) * 100;

  const getClassification = (vendas: number, quali: number) => {
    if (vendas > 91 && quali > 95) return { label: 'DIAMANTE', color: 'bg-[#00AEEF]', textColor: 'text-white' };
    if (vendas > 83 && quali > 87) return { label: 'OURO', color: 'bg-[#FFFF00]', textColor: 'text-[#333]' };
    if (vendas > 69 && quali > 77) return { label: 'PRATA', color: 'bg-[#CCCCCC]', textColor: 'text-[#333]' };
    return { label: 'BRONZE', color: 'bg-[#D96924]', textColor: 'text-white' };
  };

  const classification = getClassification(finalSalesAting, finalQualityAting);

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#333333] font-sans p-2 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b-4 border-[#EE2E24] pb-4 md:pb-6 mb-2 gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-[#EE2E24]">Simulador de Performance</h1>
            <p className="text-[10px] md:text-sm font-bold opacity-70 tracking-widest uppercase">Claro • Vendas e Qualidade</p>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-2 md:gap-4">
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 md:p-3 bg-white border-2 border-[#EE2E24] text-[#EE2E24] rounded-full hover:bg-red-50 transition-colors shadow-md"
              title="Ver Faixas de Classificação"
            >
              <Info size={20} className="md:w-6 md:h-6" />
            </button>
            <div className="bg-[#EE2E24] text-white px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-base font-bold shadow-lg flex items-center gap-2">
              <TrendingUp size={16} className="md:w-5 md:h-5" />
              <span>JAN - MAR 2026</span>
            </div>
          </div>
        </header>

        {/* Classification Highlight */}
        <div className={`relative overflow-hidden rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 border-2 border-white ${classification.color} ${classification.textColor}`}>
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-center sm:justify-start">
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm shrink-0">
              <Award size={28} className="md:w-8 md:h-8 drop-shadow-md" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-80">Classificação Final</h2>
              <p className="text-2xl md:text-3xl font-black tracking-tighter drop-shadow-sm leading-none">{classification.label}</p>
            </div>
          </div>
          <div className="flex gap-6 md:gap-8 text-center w-full sm:w-auto justify-center">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold uppercase opacity-70 mb-0.5">Ating. Vendas</p>
              <p className="text-xl md:text-2xl font-black font-mono">{finalSalesAting.toFixed(1).replace('.', ',')}%</p>
            </div>
            <div className="w-px bg-current opacity-20 h-8 md:h-10"></div>
            <div>
              <p className="text-[9px] md:text-[10px] font-bold uppercase opacity-70 mb-0.5">Ating. Qualidade</p>
              <p className="text-xl md:text-2xl font-black font-mono">{finalQualityAting.toFixed(1).replace('.', ',')}%</p>
            </div>
          </div>
        </div>

        {/* Reference Table (Collapsible) */}
        {showInfo && (
          <div className="bg-white border-2 border-[#EE2E24] rounded-xl p-4 md:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-x-auto">
            <h3 className="text-center font-black text-[#EE2E24] mb-4 uppercase tracking-widest text-xs md:text-base">Faixas de Classificação</h3>
            <div className="min-w-[400px]">
              <div className="grid grid-cols-3 border-2 border-gray-200 rounded-lg overflow-hidden max-w-2xl mx-auto">
                <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-r border-white/20">Vendas</div>
                <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-r border-white/20">Qualidade</div>
                <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-white/20">Classificação</div>
                
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">{">"} 91%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">{">"} 95%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#00AEEF] text-white border-b">DIAMANTE</div>

                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">83% a 91%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">87% a 95%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#FFFF00] text-[#333] border-b">OURO</div>

                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">69% a 83%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">77% a 87%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#CCCCCC] text-[#333] border-b">PRATA</div>

                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-r border-gray-100">0% a 69%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-r border-gray-100">0% a 77%</div>
                <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#D96924] text-white">BRONZE</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
          
          {/* Sales Table */}
          <section className="flex flex-col h-full space-y-3 md:space-y-4">
            <div className="flex-grow overflow-x-auto rounded-xl border-2 border-[#EE2E24] shadow-xl bg-white flex flex-col">
              <div className="min-w-[580px]">
                <div className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] bg-[#EE2E24] text-white text-[8px] md:text-[9px] font-black uppercase tracking-wider p-2 md:p-3">
                  <div>Indicadores de Vendas</div>
                  <div className="text-center">Pontos</div>
                  <div className="text-center">Target</div>
                  <div className="text-center">Real</div>
                  <div className="text-center">Gap Meta</div>
                  <div className="text-center">Ating</div>
                  <div className="text-center">Pontuação</div>
                </div>

                <div className="flex-grow">
                  {salesIndicators.map((ind) => {
                    const ating = calculateAting(ind);
                    const pontuacao = calculatePontuacao(ind);
                    const gap = calculateGap(ind);
                    return (
                      <div key={ind.id} className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] border-b border-gray-200 items-center hover:bg-red-50 transition-colors">
                        <div className="flex items-center gap-2 p-2 md:p-3 text-[10px] md:text-[11px] font-bold border-r border-gray-100 min-h-[48px] md:min-h-[56px]">
                          <span className="text-[#EE2E24] shrink-0">{ind.icon}</span>
                          <span className="leading-tight">{ind.label}</span>
                        </div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100">{ind.pontos}</div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100 bg-gray-50/50">
                          <input 
                            type="text" 
                            value={ind.target}
                            onChange={(e) => handleInputChange(ind.id, e.target.value, 'sales', 'target')}
                            className="w-full text-center bg-transparent border-none focus:ring-0 outline-none text-[10px] md:text-[11px] font-mono font-bold"
                          />
                          {ind.isPercentage ? '%' : ''}
                        </div>
                        <div className="p-1 border-r border-gray-100">
                          <input 
                            type="text" 
                            value={ind.real}
                            onChange={(e) => handleInputChange(ind.id, e.target.value, 'sales', 'real')}
                            className="w-full text-center bg-white border border-gray-200 rounded focus:border-[#EE2E24] outline-none text-[10px] md:text-[11px] font-mono py-1 md:py-1.5 font-bold"
                          />
                        </div>
                        <div className={`text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100 ${gap > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                          {gap === 0 ? 'OK' : `${gap.toFixed(1).replace('.', ',')}${ind.isPercentage ? '%' : ''}`}
                        </div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100">
                          {ating.toFixed(1).replace('.', ',')}%
                        </div>
                        <div className="flex items-center justify-between px-1.5 md:px-2 py-2 md:py-3 bg-gray-100 text-[10px] md:text-[11px] font-mono">
                          {ating >= 100 ? <ChevronUp size={10} className="md:w-3 md:h-3 text-emerald-600" /> : <TrendingDown size={10} className="md:w-3 md:h-3 text-red-600" />}
                          <span className="font-black text-[#EE2E24]">{pontuacao.toFixed(1).replace('.', ',')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] bg-gray-200 font-black text-[10px] md:text-[11px] mt-auto">
                  <div className="p-2 md:p-3 uppercase">Total</div>
                  <div className="text-center p-2 md:p-3 border-l border-gray-300">{totalSalesPontos}</div>
                  <div className="col-span-4"></div>
                  <div className="text-center p-2 md:p-3 bg-white border-l-2 border-[#EE2E24] text-[#EE2E24] text-sm md:text-base">{totalSalesPontuacao.toFixed(1).replace('.', ',')}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#EE2E24] text-white p-3 md:p-5 rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-white p-1 md:p-1.5 rounded-full text-[#EE2E24]">
                  <Target size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-base font-black uppercase tracking-tighter">Atingimento Final Vendas</span>
              </div>
              <div className="bg-white text-[#EE2E24] px-4 py-1 md:px-6 md:py-2 rounded-lg text-lg md:text-2xl font-mono font-black shadow-inner">
                {finalSalesAting.toFixed(1).replace('.', ',')}%
              </div>
            </div>
          </section>

          {/* Quality Table */}
          <section className="flex flex-col h-full space-y-3 md:space-y-4">
            <div className="flex-grow overflow-x-auto rounded-xl border-2 border-[#EE2E24] shadow-xl bg-white flex flex-col">
              <div className="min-w-[580px]">
                <div className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] bg-[#EE2E24] text-white text-[8px] md:text-[9px] font-black uppercase tracking-wider p-2 md:p-3">
                  <div>Indicadores de Qualidade</div>
                  <div className="text-center">Pontos</div>
                  <div className="text-center">Target</div>
                  <div className="text-center">Real</div>
                  <div className="text-center">Gap Meta</div>
                  <div className="text-center">Ating</div>
                  <div className="text-center">Pontuação</div>
                </div>

                <div className="flex-grow">
                  {qualityIndicators.map((ind) => {
                    const ating = calculateAting(ind);
                    const pontuacao = calculatePontuacao(ind);
                    const gap = calculateGap(ind);
                    return (
                      <div key={ind.id} className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] border-b border-gray-200 items-center hover:bg-red-50 transition-colors">
                        <div className="flex items-center gap-2 p-2 md:p-3 text-[10px] md:text-[11px] font-bold border-r border-gray-100 min-h-[48px] md:min-h-[56px]">
                          <span className="text-[#EE2E24] shrink-0">{ind.icon}</span>
                          <span className="leading-tight">{ind.label}</span>
                        </div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100">{ind.pontos}</div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100 bg-gray-50/50">
                          <input 
                            type="text" 
                            value={ind.target}
                            onChange={(e) => handleInputChange(ind.id, e.target.value, 'quality', 'target')}
                            className="w-full text-center bg-transparent border-none focus:ring-0 outline-none text-[10px] md:text-[11px] font-mono font-bold"
                          />
                          {ind.isPercentage ? '%' : ''}
                        </div>
                        <div className="p-1 border-r border-gray-100">
                          <input 
                            type="text" 
                            value={ind.real}
                            onChange={(e) => handleInputChange(ind.id, e.target.value, 'quality', 'real')}
                            className="w-full text-center bg-white border border-gray-200 rounded focus:border-[#EE2E24] outline-none text-[10px] md:text-[11px] font-mono py-1 md:py-1.5 font-bold"
                          />
                        </div>
                        <div className={`text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100 ${gap > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                          {gap === 0 ? 'OK' : `${gap.toFixed(1).replace('.', ',')}${ind.isPercentage ? '%' : ''}`}
                        </div>
                        <div className="text-center p-2 md:p-3 text-[10px] md:text-[11px] font-mono border-r border-gray-100">
                          {ating.toFixed(1).replace('.', ',')}%
                        </div>
                        <div className="flex items-center justify-between px-1.5 md:px-2 py-2 md:py-3 bg-gray-100 text-[10px] md:text-[11px] font-mono">
                          {ating >= 100 ? <ChevronUp size={10} className="md:w-3 md:h-3 text-emerald-600" /> : <TrendingDown size={10} className="md:w-3 md:h-3 text-red-600" />}
                          <span className="font-black text-[#EE2E24]">{pontuacao.toFixed(1).replace('.', ',')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[1.5fr_50px_65px_65px_65px_65px_75px] bg-gray-200 font-black text-[10px] md:text-[11px] mt-auto">
                  <div className="p-2 md:p-3 uppercase">Total</div>
                  <div className="text-center p-2 md:p-3 border-l border-gray-300">{totalQualityPontos}</div>
                  <div className="col-span-4"></div>
                  <div className="text-center p-2 md:p-3 bg-white border-l-2 border-[#EE2E24] text-[#EE2E24] text-sm md:text-base">{totalQualityPontuacao.toFixed(1).replace('.', ',')}</div>
                </div>
              </div>
            </div>

            <div className="bg-[#EE2E24] text-white p-3 md:p-5 rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="bg-white p-1 md:p-1.5 rounded-full text-[#EE2E24]">
                  <Target size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-base font-black uppercase tracking-tighter">Atingimento Final Qualidade</span>
              </div>
              <div className="bg-white text-[#EE2E24] px-4 py-1 md:px-6 md:py-2 rounded-lg text-lg md:text-2xl font-mono font-black shadow-inner">
                {finalQualityAting.toFixed(1).replace('.', ',')}%
              </div>
            </div>
          </section>

        </div>

        <footer className="mt-8 pt-6 border-t-2 border-[#EE2E24]/20 text-[10px] uppercase font-bold tracking-widest opacity-40 text-center">
          Claro Simulador de Performance • {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  );
}
