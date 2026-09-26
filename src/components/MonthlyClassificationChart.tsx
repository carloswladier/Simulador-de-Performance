import { useState, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  Shield, 
  Sparkles, 
  BarChart3, 
  Info,
  Layers
} from 'lucide-react';
import { Indicator, User } from '../types';
import { MONTHS_LIST, getPerformanceRecord } from '../utils/storage';
import { 
  ClassificationResult, 
  calculateClassificationFromIndicators, 
  calculateClassificationFromRecord,
  CLASSIFICATION_LEVELS 
} from '../utils/classification';

interface MonthlyClassificationChartProps {
  selectedExecutivoIds: string[];
  users: User[];
  selectedMonths: string[];
  onSelectMonth: (month: string) => void;
  currentSalesIndicators: Indicator[];
  currentQualityIndicators: Indicator[];
}

export function MonthlyClassificationChart({
  selectedExecutivoIds,
  users,
  selectedMonths,
  onSelectMonth,
  currentSalesIndicators,
  currentQualityIndicators,
}: MonthlyClassificationChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const selectedExecutivos = useMemo(() => {
    return users.filter(u => selectedExecutivoIds.includes(u.id));
  }, [users, selectedExecutivoIds]);

  const isSingleExec = selectedExecutivoIds.length === 1;
  const isAllExecs = selectedExecutivoIds.length > 0 && selectedExecutivoIds.length === users.filter(u => u.perfil === 'executivo').length;

  // Calcular o resultado de cada um dos 12 meses
  const monthlyData = useMemo(() => {
    if (selectedExecutivoIds.length === 0) return [];

    return MONTHS_LIST.map((m) => {
      const isCurrentActive = selectedMonths.includes(m.value);

      // CASO 1: Um único executivo selecionado
      if (isSingleExec) {
        const execId = selectedExecutivoIds[0];

        // Se o mês for o único selecionado no momento, usa os valores da tela
        if (isCurrentActive && selectedMonths.length === 1) {
          const currentRes = calculateClassificationFromIndicators(
            currentSalesIndicators,
            currentQualityIndicators
          );
          return {
            monthCode: m.value,
            monthName: m.label,
            result: currentRes,
            isCurrentActive: true,
            hasRecord: true,
          };
        }

        // Tenta recuperar registro salvo para o executivo e mês
        const record = getPerformanceRecord(execId, m.value);
        if (record) {
          const recordRes = calculateClassificationFromRecord(
            record,
            currentSalesIndicators,
            currentQualityIndicators
          );
          return {
            monthCode: m.value,
            monthName: m.label,
            result: recordRes,
            isCurrentActive,
            hasRecord: true,
          };
        }

        // Mês sem registro salvo
        return {
          monthCode: m.value,
          monthName: m.label,
          result: {
            level: 0,
            label: 'SEM DADOS' as const,
            color: 'bg-gray-200',
            textColor: 'text-gray-400',
            badgeBg: 'bg-gray-300',
            hex: '#CBD5E1',
            salesAting: 0,
            qualityAting: 0,
            hasData: false,
          } as ClassificationResult,
          isCurrentActive,
          hasRecord: false,
        };
      }

      // CASO 2: Múltiplos executivos selecionados (Cálculo Consolidado Mês a Mês)
      // Recuperar os dados de cada executivo para este mês 'm'
      const execRecords = selectedExecutivoIds.map(execId => {
        const saved = getPerformanceRecord(execId, m.value);
        return { execId, saved };
      });

      const recordsWithData = execRecords.filter(r => r.saved !== null);

      if (recordsWithData.length === 0) {
        return {
          monthCode: m.value,
          monthName: m.label,
          result: {
            level: 0,
            label: 'SEM DADOS' as const,
            color: 'bg-gray-200',
            textColor: 'text-gray-400',
            badgeBg: 'bg-gray-300',
            hex: '#CBD5E1',
            salesAting: 0,
            qualityAting: 0,
            hasData: false,
          } as ClassificationResult,
          isCurrentActive,
          hasRecord: false,
        };
      }

      // Consolidar Vendas para o mês
      const aggregatedSales = currentSalesIndicators.map(baseInd => {
        let totalTarget = 0;
        let totalReal = 0;
        let count = 0;

        recordsWithData.forEach(r => {
          const found = r.saved?.salesIndicators.find(s => s.id === baseInd.id);
          const t = found ? found.target : baseInd.target;
          const rel = found ? found.real : baseInd.real;
          totalTarget += t;
          totalReal += rel;
          count++;
        });

        if (baseInd.id === 'port') {
          // Portabilidade: média da meta %, soma do real
          return {
            ...baseInd,
            target: count > 0 ? totalTarget / count : baseInd.target,
            real: totalReal,
          };
        }

        if (baseInd.isPercentage) {
          return {
            ...baseInd,
            target: count > 0 ? totalTarget / count : baseInd.target,
            real: count > 0 ? totalReal / count : baseInd.real,
          };
        }

        // Indicadores de volume (soma)
        return {
          ...baseInd,
          target: totalTarget,
          real: totalReal,
        };
      });

      // Consolidar Qualidade para o mês (médias ponderadas)
      const aggregatedQuality = currentQualityIndicators.map(baseInd => {
        let totalTarget = 0;
        let totalReal = 0;
        let count = 0;

        recordsWithData.forEach(r => {
          const found = r.saved?.qualityIndicators.find(q => q.id === baseInd.id);
          const t = found ? found.target : baseInd.target;
          const rel = found ? found.real : baseInd.real;
          totalTarget += t;
          totalReal += rel;
          count++;
        });

        return {
          ...baseInd,
          target: count > 0 ? totalTarget / count : baseInd.target,
          real: count > 0 ? totalReal / count : baseInd.real,
        };
      });

      const consolidatedRes = calculateClassificationFromIndicators(
        aggregatedSales,
        aggregatedQuality
      );

      return {
        monthCode: m.value,
        monthName: m.label,
        result: consolidatedRes,
        isCurrentActive,
        hasRecord: true,
      };
    });
  }, [
    selectedExecutivoIds, 
    selectedMonths, 
    isSingleExec,
    currentSalesIndicators, 
    currentQualityIndicators
  ]);

  // Contadores de frequência por classificação no ano
  const stats = useMemo(() => {
    let diamanteCount = 0;
    let ouroCount = 0;
    let prataCount = 0;
    let bronzeCount = 0;
    let mesesAvaliados = 0;

    monthlyData.forEach(item => {
      if (item.hasRecord) {
        mesesAvaliados++;
        if (item.result.label === 'DIAMANTE') diamanteCount++;
        else if (item.result.label === 'OURO') ouroCount++;
        else if (item.result.label === 'PRATA') prataCount++;
        else if (item.result.label === 'BRONZE') bronzeCount++;
      }
    });

    return { diamanteCount, ouroCount, prataCount, bronzeCount, mesesAvaliados };
  }, [monthlyData]);

  const getBarHeightPercent = (level: number) => {
    switch (level) {
      case 4: return '100%'; // Diamante
      case 3: return '75%';  // Ouro
      case 2: return '50%';  // Prata
      case 1: return '25%';  // Bronze
      default: return '6%';  // Sem dados (indicador base)
    }
  };

  const getBarBg = (level: number, isActive: boolean) => {
    switch (level) {
      case 4:
        return 'bg-gradient-to-t from-[#0092c8] to-[#00AEEF] shadow-[#00AEEF]/20';
      case 3:
        return 'bg-gradient-to-t from-[#d97706] to-[#fbbf24] shadow-amber-400/20';
      case 2:
        return 'bg-gradient-to-t from-[#64748b] to-[#94a3b8] shadow-slate-400/20';
      case 1:
        return 'bg-gradient-to-t from-[#b45309] to-[#D96924] shadow-orange-500/20';
      default:
        return isActive 
          ? 'bg-red-200 border-2 border-dashed border-red-400' 
          : 'bg-gray-100 hover:bg-gray-200 border border-dashed border-gray-300';
    }
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-4 md:p-6 shadow-md space-y-5">
      {/* Cabeçalho do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EE2E24] to-[#B30006] text-white flex items-center justify-center shadow-md shrink-0">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-black text-gray-900 tracking-tight">
                EVOLUÇÃO MENSAL DE CLASSIFICAÇÃO
              </h3>
              {!isSingleExec ? (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Layers size={11} />
                  Consolidado da Equipe
                </span>
              ) : (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-100 text-[#EE2E24] border border-red-200">
                  Histórico Anual
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {isSingleExec ? (
                <>Desempenho de <strong className="text-gray-800">{selectedExecutivos[0]?.nome || 'Executivo(a)'}</strong> mês a mês (Janeiro a Dezembro)</>
              ) : isAllExecs ? (
                <>Desempenho consolidado de <strong className="text-gray-800">Todos os Executivos(as) ({selectedExecutivos.length} profissionais)</strong> mês a mês</>
              ) : (
                <>Desempenho consolidado de <strong className="text-gray-800">{selectedExecutivos.length} Executivos(as) selecionados(as)</strong> mês a mês</>
              )}
            </p>
          </div>
        </div>

        {/* Resumo de Conquistas Anuais */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold" title="Total de meses com classificação Diamante">
            <Sparkles size={13} className="text-[#00AEEF]" />
            <span className="font-extrabold">{stats.diamanteCount}</span>
            <span className="text-[10px] text-sky-700 uppercase font-medium">Diamante</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold" title="Total de meses com classificação Ouro">
            <Trophy size={13} className="text-amber-500" />
            <span className="font-extrabold">{stats.ouroCount}</span>
            <span className="text-[10px] text-amber-700 uppercase font-medium">Ouro</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold" title="Total de meses com classificação Prata">
            <Award size={13} className="text-slate-500" />
            <span className="font-extrabold">{stats.prataCount}</span>
            <span className="text-[10px] text-slate-700 uppercase font-medium">Prata</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 text-xs font-bold" title="Total de meses com classificação Bronze">
            <Shield size={13} className="text-[#D96924]" />
            <span className="font-extrabold">{stats.bronzeCount}</span>
            <span className="text-[10px] text-orange-700 uppercase font-medium">Bronze</span>
          </div>
        </div>
      </div>

      {/* Área do Gráfico Principal */}
      <div className="relative">
        {/* Eixo Y / Linhas de Nível */}
        <div className="grid grid-cols-12 gap-2 h-64 md:h-72 pt-6 pb-8 px-1 relative">
          {/* Linhas horizontais de referência para cada classificação */}
          <div className="absolute inset-x-0 top-6 bottom-8 pointer-events-none flex flex-col justify-between z-0">
            {CLASSIFICATION_LEVELS.map((levelItem) => (
              <div key={levelItem.level} className="w-full flex items-center gap-2 border-b border-gray-100 relative">
                <span 
                  className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-2xs shrink-0"
                  style={{ 
                    backgroundColor: `${levelItem.hex}18`, 
                    color: levelItem.hex,
                    borderColor: `${levelItem.hex}40`
                  }}
                >
                  {levelItem.label}
                </span>
                <div className="w-full border-b border-dashed border-gray-200" />
              </div>
            ))}
          </div>

          {/* 12 Colunas Mensais */}
          {monthlyData.map((item) => {
            const isHovered = hoveredMonth === item.monthCode;
            const barHeight = getBarHeightPercent(item.result.level);
            const barBgClass = getBarBg(item.result.level, item.isCurrentActive);

            return (
              <div 
                key={item.monthCode}
                className="relative flex flex-col items-center justify-end h-full z-10 group cursor-pointer"
                onClick={() => onSelectMonth(item.monthCode)}
                onMouseEnter={() => setHoveredMonth(item.monthCode)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Coluna / Barra de Nível */}
                <div className="w-full max-w-[36px] flex flex-col items-center justify-end h-full relative">
                  
                  {/* Badge de Destaque no Topo da Barra */}
                  {item.hasRecord && item.result.level > 0 && (
                    <div 
                      className={`mb-1.5 p-1 rounded-full text-white shadow-md transition-transform duration-200 group-hover:scale-125 ${
                        item.result.level === 4 ? 'bg-[#00AEEF]' :
                        item.result.level === 3 ? 'bg-amber-500' :
                        item.result.level === 2 ? 'bg-slate-400' :
                        'bg-[#D96924]'
                      }`}
                      title={`${item.monthName}: ${item.result.label}`}
                    >
                      {item.result.level === 4 && <Sparkles size={11} />}
                      {item.result.level === 3 && <Trophy size={11} />}
                      {item.result.level === 2 && <Award size={11} />}
                      {item.result.level === 1 && <Shield size={11} />}
                    </div>
                  )}

                  {/* Barra preenchida com animação suave */}
                  <div 
                    className={`w-full rounded-t-xl transition-all duration-300 relative shadow-sm ${barBgClass} ${
                      item.isCurrentActive ? 'ring-2 ring-[#EE2E24] ring-offset-2' : ''
                    } ${isHovered ? 'brightness-110 -translate-y-1' : ''}`}
                    style={{ height: barHeight }}
                  >
                    {/* Brilho interno para barras com dados */}
                    {item.hasRecord && item.result.level > 0 && (
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25 rounded-t-xl pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Rótulo do Mês na base */}
                <div className="mt-2 text-center">
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight block transition-colors ${
                    item.isCurrentActive 
                      ? 'text-[#EE2E24] bg-red-50 px-1.5 py-0.5 rounded border border-red-200' 
                      : isHovered 
                      ? 'text-gray-900 font-extrabold' 
                      : 'text-gray-500'
                  }`}>
                    {item.monthName.substring(0, 3)}
                  </span>
                  {item.isCurrentActive && (
                    <span className="text-[8px] font-extrabold text-[#EE2E24] uppercase tracking-tighter block -mt-0.5">
                      Filtro
                    </span>
                  )}
                </div>

                {/* Tooltip Detalhado no Hover */}
                {isHovered && (
                  <div 
                    className="absolute bottom-full mb-3 z-30 w-52 bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-left pointer-events-none border border-gray-700 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-gray-700 pb-1.5 mb-1.5">
                      <span className="text-xs font-black uppercase text-gray-200">
                        {item.monthName}
                      </span>
                      {item.isCurrentActive && (
                        <span className="text-[9px] bg-[#EE2E24] text-white px-1.5 py-0.5 rounded font-bold uppercase">
                          No Filtro
                        </span>
                      )}
                    </div>

                    {item.hasRecord ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">Classificação:</span>
                          <span 
                            className="font-black text-xs uppercase px-1.5 py-0.5 rounded"
                            style={{ 
                              color: item.result.hex, 
                              backgroundColor: `${item.result.hex}22` 
                            }}
                          >
                            {item.result.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Vendas:</span>
                          <span className="font-mono font-bold text-gray-200">
                            {item.result.salesAting.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Qualidade:</span>
                          <span className="font-mono font-bold text-gray-200">
                            {item.result.qualityAting.toFixed(1).replace('.', ',')}%
                          </span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-gray-800 text-[9px] text-gray-400 text-center">
                          Clique para filtrar este mês
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 py-1">
                        <p>Nenhum registro gravado.</p>
                        <p className="text-[9px] text-gray-500 mt-1 text-center">
                          Clique para filtrar e preencher
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda das Faixas de Classificação */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1">
            <Info size={12} /> Critérios:
          </span>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00AEEF]" />
            <span className="text-gray-700 font-bold">DIAMANTE:</span>
            <span className="text-gray-500 text-[11px]">Vendas &gt; 89% e Quali &gt; 96%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
            <span className="text-gray-700 font-bold">OURO:</span>
            <span className="text-gray-500 text-[11px]">Vendas ≥ 77% e Quali ≥ 86%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" />
            <span className="text-gray-700 font-bold">PRATA:</span>
            <span className="text-gray-500 text-[11px]">Vendas ≥ 58% e Quali ≥ 76%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D96924]" />
            <span className="text-gray-700 font-bold">BRONZE:</span>
            <span className="text-gray-500 text-[11px]">Vendas &lt; 58% ou Quali &lt; 76%</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-400 italic">
          * Dica: clique em qualquer coluna do mês para selecioná-lo no filtro.
        </div>
      </div>
    </section>
  );
}
