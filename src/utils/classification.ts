import { Indicator, SavedPerformanceRecord } from '../types';

export interface ClassificationResult {
  level: number; // 4 = Diamante, 3 = Ouro, 2 = Prata, 1 = Bronze, 0 = Sem dados
  label: 'DIAMANTE' | 'OURO' | 'PRATA' | 'BRONZE' | 'SEM DADOS';
  color: string;
  textColor: string;
  badgeBg: string;
  hex: string;
  salesAting: number;
  qualityAting: number;
  hasData: boolean;
}

export const CLASSIFICATION_LEVELS = [
  { level: 4, label: 'DIAMANTE' as const, hex: '#00AEEF', desc: 'Vendas > 89% e Qualidade > 96%' },
  { level: 3, label: 'OURO' as const, hex: '#EAB308', desc: 'Vendas ≥ 77% e Qualidade ≥ 86%' },
  { level: 2, label: 'PRATA' as const, hex: '#94A3B8', desc: 'Vendas ≥ 58% e Qualidade ≥ 76%' },
  { level: 1, label: 'BRONZE' as const, hex: '#D96924', desc: 'Vendas < 58% ou Qualidade < 76%' },
];

export function calculateAtingimento(indicator: Indicator, celularReal: number): number {
  if (indicator.id === 'port') {
    const targetQty = celularReal * (indicator.target / 100);
    if (targetQty <= 0) {
      return indicator.real > 0 ? 100 : (celularReal === 0 ? 100 : 0);
    }
    return (indicator.real / targetQty) * 100;
  }

  if (indicator.isLowerBetter) {
    if (indicator.target === 0) return indicator.real === 0 ? 100 : 0;
    return indicator.real <= indicator.target
      ? 100
      : Math.max(0, 100 - ((indicator.real - indicator.target) / indicator.target) * 100);
  }

  if (indicator.target === 0) return indicator.real >= 0 ? 100 : 0;
  return (indicator.real / indicator.target) * 100;
}

export function calculatePontuacaoItem(indicator: Indicator, celularReal: number): number {
  const ating = calculateAtingimento(indicator, celularReal) / 100;
  return Math.min(indicator.pontos, indicator.pontos * ating);
}

export function getClassificationInfo(salesAting: number, qualityAting: number): Omit<ClassificationResult, 'salesAting' | 'qualityAting' | 'hasData'> {
  if (salesAting > 89 && qualityAting > 96) {
    return {
      level: 4,
      label: 'DIAMANTE',
      color: 'bg-[#00AEEF]',
      textColor: 'text-white',
      badgeBg: 'bg-[#00AEEF]',
      hex: '#00AEEF',
    };
  }
  if (salesAting >= 77 && qualityAting >= 86) {
    return {
      level: 3,
      label: 'OURO',
      color: 'bg-[#FFFF00]',
      textColor: 'text-[#333]',
      badgeBg: 'bg-[#EAB308]',
      hex: '#EAB308',
    };
  }
  if (salesAting >= 58 && qualityAting >= 76) {
    return {
      level: 2,
      label: 'PRATA',
      color: 'bg-[#CCCCCC]',
      textColor: 'text-[#333]',
      badgeBg: 'bg-[#94A3B8]',
      hex: '#94A3B8',
    };
  }
  return {
    level: 1,
    label: 'BRONZE',
    color: 'bg-[#D96924]',
    textColor: 'text-white',
    badgeBg: 'bg-[#D96924]',
    hex: '#D96924',
  };
}

export function calculateClassificationFromIndicators(
  sales: Indicator[],
  quality: Indicator[]
): ClassificationResult {
  const celularReal = sales.find(s => s.id === 'cel')?.real ?? 0;

  const totalSalesPontos = sales.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalSalesPontuacao = sales.reduce((acc, curr) => acc + calculatePontuacaoItem(curr, celularReal), 0);
  const finalSalesAting = totalSalesPontos > 0 ? (totalSalesPontuacao / totalSalesPontos) * 100 : 0;

  const totalQualityPontos = quality.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalQualityPontuacao = quality.reduce((acc, curr) => acc + calculatePontuacaoItem(curr, celularReal), 0);
  const finalQualityAting = totalQualityPontos > 0 ? (totalQualityPontuacao / totalQualityPontos) * 100 : 0;

  const info = getClassificationInfo(finalSalesAting, finalQualityAting);

  return {
    ...info,
    salesAting: finalSalesAting,
    qualityAting: finalQualityAting,
    hasData: true,
  };
}

export function calculateClassificationFromRecord(
  record: SavedPerformanceRecord,
  baseSales: Indicator[],
  baseQuality: Indicator[]
): ClassificationResult {
  const mergedSales = baseSales.map(ind => {
    const found = record.salesIndicators.find(s => s.id === ind.id);
    return found ? { ...ind, target: found.target, real: found.real } : ind;
  });

  const mergedQuality = baseQuality.map(ind => {
    const found = record.qualityIndicators.find(q => q.id === ind.id);
    return found ? { ...ind, target: found.target, real: found.real } : ind;
  });

  return calculateClassificationFromIndicators(mergedSales, mergedQuality);
}
