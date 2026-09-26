import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Save, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  User as UserIcon, 
  Users, 
  Calculator, 
  Pencil, 
  Check, 
  Layers,
  Info,
  Shield,
  AlertCircle,
  XCircle,
  Trophy,
  Award,
  FlaskConical
} from 'lucide-react';
import { RvvRow, User, SavedRvvRecord } from '../types';
import { 
  DEFAULT_RVV_ROWS, 
  getStoredRvvRecord, 
  saveStoredRvvRecord, 
  MONTHS_LIST,
  getPerformanceRecord,
  createDefaultRvvRowsForNewExecutive
} from '../utils/storage';
import { MultiSelectDropdown, MultiSelectOption } from './MultiSelectDropdown';

const EDITABLE_REVENUE_ROW_IDS = [
  'bl_receita',
  'bl_pme_receita',
  'tv_receita',
  'movel_receita',
  'rentabilizacao',
];

export const GROSS_ROW_IDS = [
  'bl_gross',
  'bl_pme_gross',
  'tv_gross',
  'movel_gross',
];

export const ACCELERATOR_ROW_IDS = [
  'acelerador_bl',
  'acelerador_movel',
  'acelerador_tv',
];

export const ELIGIBILITY_ROW_IDS = [
  'bl_gross',
  'bl_pme_gross',
  'tv_gross',
  'movel_gross',
  'acelerador_bl',
  'acelerador_movel',
  'acelerador_tv',
];

interface RvvTabProps {
  currentUser: User | null;
  selectedCoordenadorId?: string;
  onSelectCoordenadorId?: (id: string) => void;
  selectedExecutivoIds?: string[];
  onSelectExecutivoIds?: (ids: string[]) => void;
  selectedMonths?: string[];
  onSelectMonths?: (months: string[]) => void;
  selectedExecutivoId?: string;
  selectedMonth?: string;
  users: User[];
  salesRealBL: number;
  salesRealCel: number;
  salesRealTV: number;
}

// Utilitários robustos de parsing e formatação pt-BR
function parsePtBrNumber(val: string | number | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = val
    .toString()
    .replace(/R\$/g, '')
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  
  if (!clean || clean === '-') return 0;

  if (clean.includes(',') && clean.includes('.')) {
    // Formato brasileiro com milhar: 12.640,45
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

function formatPtBrCurrency(num: number): string {
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPtBrPercent(num: number): string {
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function formatPtBrNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata valores em Reais dinamicamente durante a digitação (ex: digitar 80 vira R$ 80)
function formatReaisTyping(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';

  if (/^r\$?$/i.test(trimmed)) {
    return '';
  }

  const cleanNumber = trimmed.replace(/^r\$\s*/i, '');
  if (!cleanNumber) return '';

  return `R$ ${cleanNumber}`;
}

// Normaliza linhas carregadas para assegurar a estrutura oficial completa, ordem correta e metas padrão:
// 1. Clientes Conectados
// 2. Banda Larga Gross (Meta: 5)
// 3. Banda Larga Receita (Meta: R$ 1.045,37)
// 4. Banda Larga PME Gross (Meta: 1)
// 5. Banda Larga PME Receita (Meta: R$ 251,73)
// 6. TV Gross (Meta: 3)
// 7. TV Receita (Meta: R$ 470,95)
// 8. Móvel Gross (Meta: 4)
// 9. Móvel Receita (Meta: R$ 351,63)
// 10. Rentabilização (Meta: R$ 688,05)
// 11. Acelerador BL (Meta: 15)
// 12. Acelerador Móvel (Meta: 7)
// 13. Acelerador TV (Meta: 6)
function normalizeRevenueRows(loadedRows: RvvRow[]): RvvRow[] {
  const loadedMap = new Map<string, RvvRow>();
  (loadedRows || []).forEach(r => {
    if (r && r.id) {
      loadedMap.set(r.id, r);
    }
  });

  return DEFAULT_RVV_ROWS.map(defaultRow => {
    const existing = loadedMap.get(defaultRow.id);
    let r = existing ? { ...defaultRow, ...existing } : { ...defaultRow };

    // Metas oficiais pré-definidas para os campos Gross
    if (r.id === 'bl_gross' && (!r.meta || r.meta === '-')) r.meta = '5';
    if (r.id === 'bl_pme_gross' && (!r.meta || r.meta === '-')) r.meta = '1';
    if (r.id === 'tv_gross' && (!r.meta || r.meta === '-')) r.meta = '3';
    if (r.id === 'movel_gross' && (!r.meta || r.meta === '-')) r.meta = '4';

    // Aceleradores oficiais
    if (r.id === 'acelerador_bl' && (r.meta === '91' || !r.meta)) r.meta = '15';
    if (r.id === 'acelerador_movel' && (r.meta === '35' || !r.meta)) r.meta = '7';
    if (r.id === 'acelerador_tv' && (r.meta === '35' || !r.meta)) r.meta = '6';

    // Se for um campo Gross ou Acelerador (pontuação '-'), recalcula atingimento e total (SIM/NÃO)
    if (GROSS_ROW_IDS.includes(r.id) || ACCELERATOR_ROW_IDS.includes(r.id)) {
      const metaNum = parsePtBrNumber(r.meta);
      const realNum = parsePtBrNumber(r.realizado);
      if (metaNum > 0) {
        const ating = (realNum / metaNum) * 100;
        r.atingimento = formatPtBrPercent(ating);
        r.total = realNum >= metaNum ? 'SIM' : 'NÃO';
      } else {
        r.total = 'NÃO';
      }
    }

    if (EDITABLE_REVENUE_ROW_IDS.includes(r.id)) {
      let real = r.realizado ? r.realizado.trim() : '';
      if (real && !real.startsWith('R$') && real !== '-') {
        real = `R$ ${real}`;
      }
      r.realizado = real;
    }

    return r;
  });
}

export const RvvTab: React.FC<RvvTabProps> = ({
  currentUser,
  selectedCoordenadorId,
  onSelectCoordenadorId,
  selectedExecutivoIds,
  onSelectExecutivoIds,
  selectedMonths,
  onSelectMonths,
  selectedExecutivoId,
  selectedMonth,
  users,
  salesRealBL,
  salesRealCel,
  salesRealTV,
}) => {
  const isExecutivo = currentUser?.perfil === 'executivo';
  const coordenadores = useMemo(() => users.filter(u => u.perfil === 'coordenador'), [users]);

  // Coordenador Selecionado (usando prop com fallback interno)
  const [internalCoordId, setInternalCoordId] = useState<string>('all');
  const activeCoordId = selectedCoordenadorId ?? internalCoordId;
  const setCoordId = onSelectCoordenadorId ?? setInternalCoordId;

  // Filtrar executivos disponíveis com base no perfil e coordenador selecionado
  const availableExecutivos = useMemo(() => {
    let list = users.filter(u => u.perfil === 'executivo');
    if (isExecutivo && currentUser) {
      return list.filter(u => u.id === currentUser.id);
    }
    if (currentUser?.perfil === 'coordenador') {
      const myTeam = list.filter(u => !u.coordenadorId || u.coordenadorId === currentUser.id);
      if (myTeam.length > 0) list = myTeam;
    }
    if (activeCoordId && activeCoordId !== 'all') {
      return list.filter(u => u.coordenadorId === activeCoordId);
    }
    return list;
  }, [users, currentUser, isExecutivo, activeCoordId]);

  // Executivos Selecionados (usando prop com fallback interno)
  const [internalExecIds, setInternalExecIds] = useState<string[]>(() => {
    if (isExecutivo && currentUser) return [currentUser.id];
    if (selectedExecutivoIds && selectedExecutivoIds.length > 0) return selectedExecutivoIds;
    return availableExecutivos.map(u => u.id);
  });
  const activeExecIds = (isExecutivo && currentUser)
    ? [currentUser.id]
    : (selectedExecutivoIds ?? internalExecIds);
  const setExecIds = onSelectExecutivoIds ?? setInternalExecIds;

  // Meses Selecionados (usando prop com fallback interno)
  const [internalMonths, setInternalMonths] = useState<string[]>([selectedMonth || 'SETEMBRO']);
  const activeMonths = selectedMonths ?? internalMonths;
  const setMonths = onSelectMonths ?? setInternalMonths;
  const activeMonth = activeMonths[0] || selectedMonth || 'SETEMBRO';

  // Opções para o MultiSelect de Executivos(as)
  const executivoOptions: MultiSelectOption[] = availableExecutivos.map(e => ({
    value: e.id,
    label: e.nome,
    sublabel: `@${e.login}`,
  }));

  // Opções para o MultiSelect de Meses
  const monthOptions: MultiSelectOption[] = MONTHS_LIST.map(m => ({
    value: m.value,
    label: `${m.label} 2026`,
    badge: m.value,
  }));

  // Modo: Individual (apenas 1 executivo selecionado) ou Consolidado (múltiplos ou todos)
  const isSingleMode = isExecutivo || activeExecIds.length === 1;
  const isConsolidated = !isSingleMode;

  // Executivo individual ativo quando em modo individual
  const effectiveIndividualId = (isExecutivo && currentUser)
    ? currentUser.id
    : (isSingleMode ? activeExecIds[0] : (availableExecutivos[0]?.id || 'exec-1'));

  // Lista de executivos cujos dados serão somados no modo consolidado
  const targetExecutivos = useMemo(() => {
    if (activeExecIds.length === 0) return availableExecutivos;
    const filtered = availableExecutivos.filter(u => activeExecIds.includes(u.id));
    return filtered.length > 0 ? filtered : availableExecutivos;
  }, [availableExecutivos, activeExecIds]);

  // Estado das linhas da tabela para o executivo individual
  const [rows, setRows] = useState<RvvRow[]>(() => {
    const targetId = (isExecutivo && currentUser)
      ? currentUser.id
      : (isSingleMode ? activeExecIds[0] : (availableExecutivos[0]?.id || 'exec-1'));
    const saved = getStoredRvvRecord(targetId, activeMonth);
    const initial = saved?.rows || DEFAULT_RVV_ROWS;
    return normalizeRevenueRows(initial);
  });

  // Estado de modo de edição para as receitas na coluna realizado
  const [editingRowIds, setEditingRowIds] = useState<{ [rowId: string]: boolean }>({});

  // Estado para simulação temporária no modo consolidado (quando todos ou múltiplos executivos estão selecionados)
  const [simulatedRows, setSimulatedRows] = useState<RvvRow[] | null>(null);
  const [simulatedTeto, setSimulatedTeto] = useState<string | null>(null);

  // Limpa a simulação temporária sempre que a seleção de executivos, coordenador ou mês mudar
  useEffect(() => {
    setSimulatedRows(null);
    setSimulatedTeto(null);
  }, [activeExecIds, activeMonths, activeCoordId]);

  const toggleEditRow = (rowId: string) => {
    setEditingRowIds(prev => {
      const isFinishing = Boolean(prev[rowId]);
      if (isFinishing) {
        if (isConsolidated) {
          setSimulatedRows(curr => {
            const base = curr || consolidatedData?.rows || DEFAULT_RVV_ROWS;
            return base.map(r => {
              if (r.id !== rowId) return r;
              let real = r.realizado ? r.realizado.trim() : '';
              if (!real || real === 'R$' || real === 'R$ ') {
                real = 'R$ 0,00';
              } else if (!real.startsWith('R$')) {
                real = `R$ ${real}`;
              }
              return { ...r, realizado: real };
            });
          });
        } else {
          setRows(currRows => currRows.map(r => {
            if (r.id !== rowId) return r;
            let real = r.realizado ? r.realizado.trim() : '';
            if (!real || real === 'R$' || real === 'R$ ') {
              real = 'R$ 0,00';
            } else if (!real.startsWith('R$')) {
              real = `R$ ${real}`;
            }
            return { ...r, realizado: real };
          }));
        }
      }
      return {
        ...prev,
        [rowId]: !prev[rowId],
      };
    });
  };

  // Estado de inputs temporários da coluna "VALOR DIA"
  const [dayValues, setDayValues] = useState<{ [rowId: string]: string }>({});
  
  // Teto de Remuneração (Padrão 200,00% como no modelo oficial)
  const [tetoRemuneracao, setTetoRemuneracao] = useState<string>('200,00%');

  // Feedback e estados de salvamento sincronizados
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Recarregar registro do executivo individual quando mudar o executivo ou mês
  useEffect(() => {
    if (isConsolidated) return;

    const saved = getStoredRvvRecord(effectiveIndividualId, activeMonth);
    const perf = getPerformanceRecord(effectiveIndividualId, activeMonth);
    
    // Obter vendas de sincronização do acelerador (BL, Celular, TV)
    const execBL = effectiveIndividualId === selectedExecutivoId ? salesRealBL : (perf?.salesIndicators?.find(s => s.id === 'bl')?.real ?? 0);
    const execCel = effectiveIndividualId === selectedExecutivoId ? salesRealCel : (perf?.salesIndicators?.find(s => s.id === 'cel')?.real ?? 0);
    const execTV = effectiveIndividualId === selectedExecutivoId ? salesRealTV : (perf?.salesIndicators?.find(s => s.id === 'tv')?.real ?? 0);

    if (saved) {
      const normalized = normalizeRevenueRows(saved.rows);
      // Atualiza aceleradores sincronizados
      const updated = normalized.map(r => {
        if (r.id === 'acelerador_bl') {
          const metaNum = parsePtBrNumber(r.meta) || 15;
          const realNum = execBL;
          const ating = metaNum > 0 ? (realNum / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: realNum.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_movel') {
          const metaNum = parsePtBrNumber(r.meta) || 7;
          const realNum = execCel;
          const ating = metaNum > 0 ? (realNum / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: realNum.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_tv') {
          const metaNum = parsePtBrNumber(r.meta) || 6;
          const realNum = execTV;
          const ating = metaNum > 0 ? (realNum / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: realNum.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        return r;
      });
      setRows(updated);
      setTetoRemuneracao(saved.tetoRemuneracao || '200,00%');
    } else {
      // Inicia com valores padrão com metas pré-definidas (BL: 15, Móvel: 7, TV: 6)
      const freshRows = normalizeRevenueRows(createDefaultRvvRowsForNewExecutive()).map(r => {
        if (r.id === 'acelerador_bl') {
          const metaNum = parsePtBrNumber(r.meta) || 15;
          const ating = metaNum > 0 ? (execBL / metaNum) * 100 : 0;
          return { ...r, meta: '15', realizado: execBL.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_movel') {
          const metaNum = parsePtBrNumber(r.meta) || 7;
          const ating = metaNum > 0 ? (execCel / metaNum) * 100 : 0;
          return { ...r, meta: '7', realizado: execCel.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_tv') {
          const metaNum = parsePtBrNumber(r.meta) || 6;
          const ating = metaNum > 0 ? (execTV / metaNum) * 100 : 0;
          return { ...r, meta: '6', realizado: execTV.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        return r;
      });
      setRows(freshRows);
      setTetoRemuneracao('200,00%');
    }
  }, [effectiveIndividualId, activeMonth, isConsolidated, salesRealBL, salesRealCel, salesRealTV, selectedExecutivoId]);

  // Edição genérica de qualquer campo (Metas e Realizados editáveis livremente, inclusive em modo simulação consolidada)
  const handleCellChange = (rowId: string, field: keyof RvvRow, value: string) => {
    let finalValue = value;
    if (EDITABLE_REVENUE_ROW_IDS.includes(rowId) && (field === 'realizado' || field === 'meta')) {
      finalValue = formatReaisTyping(value);
    }

    if (isConsolidated) {
      // MODO SIMULAÇÃO TEMPORÁRIA: Permite testar cenários sem salvar no banco de dados
      const currentRows = simulatedRows ? [...simulatedRows] : [...(consolidatedData?.rows || DEFAULT_RVV_ROWS)];
      const updatedRows = currentRows.map(row => {
        if (row.id !== rowId) return row;
        const updated = { ...row, [field]: finalValue };

        // Se editou a pontuação ou atingimento diretamente, recalcula o total correspondente
        if (field === 'atingimento' || field === 'pontuacao') {
          const pont = parsePtBrNumber(field === 'pontuacao' ? finalValue : row.pontuacao);
          const ating = parsePtBrNumber(field === 'atingimento' ? finalValue : row.atingimento);
          if (pont > 0) {
            updated.total = formatPtBrPercent((pont * ating) / 100);
          } else if (row.pontuacao === '-' || !row.pontuacao) {
            updated.total = ating >= 100 ? 'SIM' : 'NÃO';
          }
        }

        // Se editou Meta ou Realizado diretamente
        if (field === 'meta' || field === 'realizado') {
          const metaNum = parsePtBrNumber(field === 'meta' ? finalValue : row.meta);
          const realNum = parsePtBrNumber(field === 'realizado' ? finalValue : row.realizado);

          if (metaNum > 0 && row.id !== 'clientes_conectados') {
            const calculatedAting = (realNum / metaNum) * 100;
            updated.atingimento = formatPtBrPercent(calculatedAting);

            const pont = parsePtBrNumber(row.pontuacao);
            if (pont > 0) {
              updated.total = formatPtBrPercent((pont * calculatedAting) / 100);
            } else {
              updated.total = calculatedAting >= 100 ? 'SIM' : 'NÃO';
            }
          } else if (row.id === 'clientes_conectados') {
            const calculatedAting = realNum * 1.2;
            updated.atingimento = formatPtBrPercent(calculatedAting);
            const pont = parsePtBrNumber(row.pontuacao) || 10;
            updated.total = formatPtBrPercent((pont * calculatedAting) / 100);
          }
        }

        return updated;
      });

      setSimulatedRows(updatedRows);
      return;
    }

    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const updated = { ...row, [field]: finalValue };

      // Se editou a pontuação ou atingimento diretamente, recalcula o total correspondente
      if (field === 'atingimento' || field === 'pontuacao') {
        const pont = parsePtBrNumber(field === 'pontuacao' ? finalValue : row.pontuacao);
        const ating = parsePtBrNumber(field === 'atingimento' ? finalValue : row.atingimento);
        if (pont > 0) {
          updated.total = formatPtBrPercent((pont * ating) / 100);
        } else if (row.pontuacao === '-' || !row.pontuacao) {
          updated.total = ating >= 100 ? 'SIM' : 'NÃO';
        }
      }

      // Se editou Meta ou Realizado diretamente
      if (field === 'meta' || field === 'realizado') {
        const metaNum = parsePtBrNumber(field === 'meta' ? finalValue : row.meta);
        const realNum = parsePtBrNumber(field === 'realizado' ? finalValue : row.realizado);

        if (metaNum > 0 && row.id !== 'clientes_conectados') {
          const calculatedAting = (realNum / metaNum) * 100;
          updated.atingimento = formatPtBrPercent(calculatedAting);

          const pont = parsePtBrNumber(row.pontuacao);
          if (pont > 0) {
            updated.total = formatPtBrPercent((pont * calculatedAting) / 100);
          } else {
            updated.total = calculatedAting >= 100 ? 'SIM' : 'NÃO';
          }
        }
      }

      return updated;
    }));
  };

  // Adição da coluna "VALOR DIA" ao "REALIZADO"
  const handleAddDayValue = (rowId: string) => {
    const inputVal = dayValues[rowId];
    if (!inputVal || inputVal.trim() === '') return;

    const addNum = parsePtBrNumber(inputVal);
    if (isNaN(addNum) || addNum === 0) return;

    if (isConsolidated) {
      // Simulação no modo consolidado
      const currentRows = simulatedRows ? [...simulatedRows] : [...(consolidatedData?.rows || DEFAULT_RVV_ROWS)];
      const updatedRows = currentRows.map(row => {
        if (row.id !== rowId) return row;

        const currentRealNum = parsePtBrNumber(row.realizado);
        const newRealNum = currentRealNum + addNum;

        let newRealStr = '';
        if (row.isCurrency) {
          newRealStr = formatPtBrCurrency(newRealNum);
        } else if (row.isPercentage) {
          newRealStr = formatPtBrPercent(newRealNum);
        } else {
          newRealStr = formatPtBrNumber(newRealNum);
        }

        const metaNum = parsePtBrNumber(row.meta);
        let newAtingStr = row.atingimento;
        let newTotalStr = row.total;

        if (metaNum > 0) {
          const newAting = (newRealNum / metaNum) * 100;
          newAtingStr = formatPtBrPercent(newAting);

          const pontNum = parsePtBrNumber(row.pontuacao);
          if (pontNum > 0) {
            newTotalStr = formatPtBrPercent((pontNum * newAting) / 100);
          } else {
            newTotalStr = newAting >= 100 ? 'SIM' : 'NÃO';
          }
        } else if (row.id === 'clientes_conectados') {
          const currentAtingNum = parsePtBrNumber(row.atingimento) || 120;
          const newAting = currentAtingNum + (addNum * 1.2);
          newAtingStr = formatPtBrPercent(newAting);
          const pontNum = parsePtBrNumber(row.pontuacao) || 10;
          newTotalStr = formatPtBrPercent((pontNum * newAting) / 100);
        }

        return {
          ...row,
          realizado: newRealStr,
          atingimento: newAtingStr,
          total: newTotalStr,
        };
      });

      setSimulatedRows(updatedRows);
      setDayValues(prev => ({ ...prev, [rowId]: '' }));
      setSaveNotification(`[Simulação] Valor somado ao Realizado de ${currentRows.find(r => r.id === rowId)?.indicador}!`);
      setTimeout(() => setSaveNotification(null), 3000);
      return;
    }

    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;

      const currentRealNum = parsePtBrNumber(row.realizado);
      const newRealNum = currentRealNum + addNum;

      let newRealStr = '';
      if (row.isCurrency) {
        newRealStr = formatPtBrCurrency(newRealNum);
      } else if (row.isPercentage) {
        newRealStr = formatPtBrPercent(newRealNum);
      } else {
        newRealStr = formatPtBrNumber(newRealNum);
      }

      const metaNum = parsePtBrNumber(row.meta);
      let newAtingStr = row.atingimento;
      let newTotalStr = row.total;

      if (metaNum > 0) {
        const newAting = (newRealNum / metaNum) * 100;
        newAtingStr = formatPtBrPercent(newAting);

        const pontNum = parsePtBrNumber(row.pontuacao);
        if (pontNum > 0) {
          newTotalStr = formatPtBrPercent((pontNum * newAting) / 100);
        } else {
          newTotalStr = newAting >= 100 ? 'SIM' : 'NÃO';
        }
      } else if (row.id === 'clientes_conectados') {
        const currentAtingNum = parsePtBrNumber(row.atingimento) || 120;
        const newAting = currentAtingNum + (addNum * 1.2);
        newAtingStr = formatPtBrPercent(newAting);
        const pontNum = parsePtBrNumber(row.pontuacao) || 10;
        newTotalStr = formatPtBrPercent((pontNum * newAting) / 100);
      }

      return {
        ...row,
        realizado: newRealStr,
        atingimento: newAtingStr,
        total: newTotalStr,
      };
    }));

    setDayValues(prev => ({ ...prev, [rowId]: '' }));
    setSaveNotification(`Valor somado ao Realizado de ${rows.find(r => r.id === rowId)?.indicador}!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // CÁLCULO CONSOLIDADO PARA "TODOS OS EXECUTIVOS" OU SELEÇÃO MÚLTIPLA:
  // "ao selecionar todos os executivos os valores da meta e realizado precisam ser somados"
  const consolidatedData = useMemo(() => {
    if (!isConsolidated) return null;

    const baseTemplate = DEFAULT_RVV_ROWS;
    if (targetExecutivos.length === 0) return { rows: baseTemplate, totalPercent: '0,00%' };

    // Coleta dados de todos os executivos selecionados
    const allExecutorsRows = targetExecutivos.map(exec => {
      const saved = getStoredRvvRecord(exec.id, activeMonth);
      const perf = getPerformanceRecord(exec.id, activeMonth);

      const execBL = exec.id === selectedExecutivoId ? salesRealBL : (perf?.salesIndicators?.find(s => s.id === 'bl')?.real ?? 0);
      const execCel = exec.id === selectedExecutivoId ? salesRealCel : (perf?.salesIndicators?.find(s => s.id === 'cel')?.real ?? 0);
      const execTV = exec.id === selectedExecutivoId ? salesRealTV : (perf?.salesIndicators?.find(s => s.id === 'tv')?.real ?? 0);

      const initialRows = saved?.rows ? normalizeRevenueRows(saved.rows) : normalizeRevenueRows(createDefaultRvvRowsForNewExecutive());

      return initialRows.map(r => {
        if (r.id === 'acelerador_bl') {
          const metaNum = parsePtBrNumber(r.meta) || 15;
          const ating = metaNum > 0 ? (execBL / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: execBL.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_movel') {
          const metaNum = parsePtBrNumber(r.meta) || 7;
          const ating = metaNum > 0 ? (execCel / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: execCel.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        if (r.id === 'acelerador_tv') {
          const metaNum = parsePtBrNumber(r.meta) || 6;
          const ating = metaNum > 0 ? (execTV / metaNum) * 100 : 0;
          return { ...r, meta: metaNum.toString(), realizado: execTV.toString(), atingimento: formatPtBrPercent(ating), total: ating >= 100 ? 'SIM' : 'NÃO' };
        }
        return r;
      });
    });

    // Somar Metas e Realizados linha a linha
    const summedRows = baseTemplate.map(tmpl => {
      const rowId = tmpl.id;
      const isCurrency = Boolean(tmpl.isCurrency);

      if (rowId === 'clientes_conectados') {
        let sumReal = 0;
        let count = 0;
        allExecutorsRows.forEach(execRows => {
          const r = execRows.find(item => item.id === rowId);
          if (r) {
            sumReal += parsePtBrNumber(r.realizado);
            count++;
          }
        });
        const avgReal = count > 0 ? sumReal / count : 100.34;
        const ating = avgReal * 1.2;
        const pont = parsePtBrNumber(tmpl.pontuacao) || 10;
        return {
          ...tmpl,
          meta: '-',
          realizado: formatPtBrPercent(avgReal),
          atingimento: formatPtBrPercent(ating),
          total: formatPtBrPercent((pont * ating) / 100),
        };
      }

      // Receitas e Aceleradores: SOMA DAS METAS E SOMA DOS REALIZADOS
      let sumMeta = 0;
      let sumReal = 0;

      allExecutorsRows.forEach(execRows => {
        const r = execRows.find(item => item.id === rowId);
        if (r) {
          sumMeta += parsePtBrNumber(r.meta);
          sumReal += parsePtBrNumber(r.realizado);
        } else {
          sumMeta += parsePtBrNumber(tmpl.meta);
          sumReal += parsePtBrNumber(tmpl.realizado);
        }
      });

      const calculatedAting = sumMeta > 0 ? (sumReal / sumMeta) * 100 : 0;
      const pontNum = parsePtBrNumber(tmpl.pontuacao);

      let totalStr = '';
      if (pontNum > 0) {
        totalStr = formatPtBrPercent((pontNum * calculatedAting) / 100);
      } else {
        totalStr = sumReal >= sumMeta ? 'SIM' : 'NÃO';
      }

      let metaFormatted = '';
      let realFormatted = '';

      if (isCurrency) {
        metaFormatted = formatPtBrCurrency(sumMeta);
        realFormatted = formatPtBrCurrency(sumReal);
      } else {
        metaFormatted = Math.round(sumMeta).toString();
        realFormatted = Math.round(sumReal).toString();
      }

      return {
        ...tmpl,
        meta: metaFormatted,
        realizado: realFormatted,
        atingimento: formatPtBrPercent(calculatedAting),
        total: totalStr,
      };
    });

    // Calcular Resultado Total Consolidado
    let totalSum = 0;
    summedRows.forEach(r => {
      if (r.total && r.total.includes('%')) {
        totalSum += parsePtBrNumber(r.total);
      }
    });

    return {
      rows: summedRows,
      totalPercent: formatPtBrPercent(totalSum),
    };
  }, [isConsolidated, targetExecutivos, activeMonth, selectedExecutivoId, salesRealBL, salesRealCel, salesRealTV]);

  // Linhas atualmente exibidas na tabela (com suporte a simulação em modo consolidado)
  const displayRows = isConsolidated ? (simulatedRows || consolidatedData?.rows || rows) : rows;

  // Cálculo automático do RESULTADO TOTAL individual ou consolidado/simulado
  const resultadoTotalPercent = useMemo(() => {
    let sum = 0;
    displayRows.forEach(r => {
      if (r.total && r.total.includes('%')) {
        sum += parsePtBrNumber(r.total);
      }
    });
    return formatPtBrPercent(sum);
  }, [displayRows]);

  // CRITÉRIOS OBRIGATÓRIOS DE ELEGIBILIDADE AO RVV:
  // "incluir uma tarja de ELEGÍVEL quando os campos banda larga gross, banda larga pme gross,
  // tv gross, movel gross, acelerador bl, acelerador movel e acelerador tv estirem como SIM,
  // e se um desses campos estiverem como NÃO aparecer na tarja como NÃO ELEGÍVEL."
  const eligibilityReport = useMemo(() => {
    const criteriaList = [
      { id: 'bl_gross', label: 'Banda Larga Gross' },
      { id: 'bl_pme_gross', label: 'Banda Larga PME Gross' },
      { id: 'tv_gross', label: 'TV Gross' },
      { id: 'movel_gross', label: 'Móvel Gross' },
      { id: 'acelerador_bl', label: 'Acelerador BL' },
      { id: 'acelerador_movel', label: 'Acelerador Móvel' },
      { id: 'acelerador_tv', label: 'Acelerador TV' },
    ];

    const evaluated = criteriaList.map(crit => {
      const row = displayRows.find(r => r.id === crit.id);
      const isSim = (row?.total || '').trim().toUpperCase() === 'SIM';
      return {
        ...crit,
        meta: row?.meta || '0',
        realizado: row?.realizado || '0',
        atingimento: row?.atingimento || '0,00%',
        total: isSim ? 'SIM' : 'NÃO',
        isSim,
      };
    });

    const isEligible = evaluated.every(item => item.isSim);
    const countSim = evaluated.filter(item => item.isSim).length;
    const pendingItems = evaluated.filter(item => !item.isSim);

    return {
      isEligible,
      countSim,
      totalCriteria: evaluated.length,
      evaluated,
      pendingItems,
    };
  }, [displayRows]);

  // Salvar no storage (para executivo individual)
  const handleSave = () => {
    if (!isSingleMode || isSaving) return;
    setIsSaving(true);

    const record: SavedRvvRecord = {
      executivoId: effectiveIndividualId,
      mes: activeMonth,
      rows,
      resultadoTotal: resultadoTotalPercent,
      tetoRemuneracao,
      updatedAt: new Date().toISOString(),
    };
    saveStoredRvvRecord(record);

    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLastSavedAt(now);
    setIsSaving(false);
    setSaveSuccess(true);
    const execName = availableExecutivos.find(u => u.id === effectiveIndividualId)?.nome || 'Executivo';
    setSaveNotification(`Extrato RVV de ${execName} (${activeMonth}) salvo com sucesso!`);
    setTimeout(() => {
      setSaveSuccess(false);
      setSaveNotification(null);
    }, 3000);
  };

  // Restaurar padrões
  const handleResetToDefaults = () => {
    if (!isSingleMode) return;

    if (window.confirm('Deseja restaurar as metas e valores do Extrato RVV deste executivo para o padrão oficial?')) {
      const freshRows = normalizeRevenueRows(createDefaultRvvRowsForNewExecutive());
      setRows(freshRows);
      setTetoRemuneracao('200,00%');
      setDayValues({});
      setEditingRowIds({});
      setSaveSuccess(false);
      setSaveNotification('Metas e valores padrão restaurados com sucesso!');
      setTimeout(() => setSaveNotification(null), 3500);
    }
  };

  const currentMonthObj = MONTHS_LIST.find(m => m.value === activeMonth);
  const selectedIndividualUser = availableExecutivos.find(u => u.id === effectiveIndividualId);

  return (
    <div className="space-y-4">
      {/* CARD DE FILTROS: PADRÃO EXATO DA ABA DASHBOARD */}
      <div className="bg-white rounded-xl border-2 border-[#EE2E24] p-4 md:p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-black uppercase text-[#EE2E24] tracking-wider flex items-center gap-2">
                <Sparkles size={16} />
                Filtros do Extrato RVV
              </h2>
              {!isSingleMode && (
                <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  <Layers size={12} />
                  Visão Consolidada ({targetExecutivos.length} exec. / {activeMonths.length} meses)
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Selecione um ou mais Executivos(as) (ou "TODOS") e Meses para acompanhar o extrato individual ou consolidado
            </p>
          </div>

          {/* Botões de Ação do Extrato */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {lastSavedAt && isSingleMode && (
              <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">
                Salvo em: {lastSavedAt}
              </span>
            )}

            {isSingleMode && (
              <button
                onClick={handleResetToDefaults}
                title="Restaurar valores padrão"
                className="p-2 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>
            )}

            {!isSingleMode && simulatedRows !== null && (
              <button
                onClick={() => {
                  setSimulatedRows(null);
                  setSimulatedTeto(null);
                  setSaveNotification('Simulação reiniciada: soma original da equipe restaurada!');
                  setTimeout(() => setSaveNotification(null), 3000);
                }}
                title="Restaurar valores calculados originais da equipe"
                className="px-3 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                <RotateCcw size={14} className="text-amber-700" />
                <span>Restaurar Soma Real</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!isSingleMode || isSaving}
              title={
                !isSingleMode 
                  ? 'Modo de simulação temporária: os campos podem ser editados para verificar o resultado em tempo real, mas as alterações não são salvas no banco.' 
                  : 'Salvar alterações deste executivo e mês'
              }
              className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-black flex items-center gap-2 shadow-md transition-all ${
                !isSingleMode
                  ? 'bg-neutral-200 text-neutral-600 border border-neutral-300 cursor-not-allowed select-none'
                  : saveSuccess
                  ? 'bg-emerald-600 text-white cursor-pointer'
                  : 'bg-[#EE2E24] hover:bg-[#c9241b] text-white cursor-pointer'
              } ${isSingleMode ? 'active:scale-95' : ''}`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>SALVO COM SUCESSO!</span>
                </>
              ) : !isSingleMode ? (
                <>
                  <Calculator size={16} className="text-neutral-500" />
                  <span>SIMULAÇÃO (NÃO SALVA)</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isSaving ? 'SALVANDO...' : 'SALVAR EXTRATO'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {/* Filtro: Coordenador(a) */}
          <div>
            <label className="block text-[10px] md:text-xs font-black uppercase text-gray-600 mb-1 flex items-center gap-1.5">
              <Shield size={14} className="text-[#EE2E24]" />
              Coordenador(a)
            </label>
            {isExecutivo ? (
              <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-700 truncate">
                {coordenadores.find(c => c.id === currentUser?.coordenadorId)?.nome || 'Coordenação Comercial Claro'}
              </div>
            ) : (
              <select
                value={activeCoordId}
                onChange={(e) => {
                  const newCoord = e.target.value;
                  setCoordId(newCoord);
                  if (newCoord && newCoord !== 'all') {
                    const filtered = users.filter(u => u.perfil === 'executivo' && u.coordenadorId === newCoord);
                    setExecIds(filtered.map(u => u.id));
                  } else {
                    const allExecs = users.filter(u => u.perfil === 'executivo');
                    setExecIds(allExecs.map(u => u.id));
                  }
                }}
                className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-300 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-800 outline-none transition-colors cursor-pointer"
              >
                <option value="all">TODOS OS COORDENADORES</option>
                {coordenadores.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro MultiSelect: Executivo(a) com opção TODOS */}
          <div>
            {isExecutivo ? (
              <div>
                <label className="block text-[10px] md:text-xs font-black uppercase text-gray-600 mb-1 flex items-center gap-1.5">
                  <Users size={14} className="text-[#00AEEF]" />
                  Executivo(a)
                </label>
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs md:text-sm font-black text-blue-900 flex items-center justify-between">
                  <span className="truncate">{currentUser?.nome}</span>
                  <span className="text-[9px] bg-[#00AEEF] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ml-2">
                    Seu Resultado
                  </span>
                </div>
              </div>
            ) : (
              <MultiSelectDropdown
                id="rvv-filter-executivos-multiselect"
                label="Executivo(a)"
                icon={<Users size={14} className="text-[#00AEEF]" />}
                options={executivoOptions}
                selectedValues={activeExecIds}
                onChange={setExecIds}
                allOptionLabel="TODOS OS EXECUTIVOS(AS)"
                placeholder="Selecione executivos..."
                badgeColor="blue"
              />
            )}
          </div>

          {/* Filtro MultiSelect: Mês com seleção múltipla e TODOS */}
          <div>
            <MultiSelectDropdown
              id="rvv-filter-meses-multiselect"
              label="Mês de Referência"
              icon={<Calendar size={14} className="text-[#EE2E24]" />}
              options={monthOptions}
              selectedValues={activeMonths}
              onChange={setMonths}
              allOptionLabel="TODOS OS MESES (ANO COMPLETO)"
              placeholder="Selecione meses..."
              badgeColor="red"
            />
          </div>
        </div>
      </div>

      {/* Banner de Identificação no mesmo padrão da aba Dashboard */}
      <div className={`bg-white border-l-4 ${isSingleMode ? 'border-[#00AEEF]' : 'border-[#EE2E24]'} px-4 py-2.5 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-600 gap-2`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 uppercase">
            {isSingleMode ? 'Extrato do(a) Executivo(a): ' : 'Extrato Consolidado: '}
          </span>
          {isSingleMode ? (
            <>
              <span className="font-black text-[#00AEEF] text-sm">{selectedIndividualUser?.nome}</span>
              <span className="text-gray-400 font-mono ml-1">(@{selectedIndividualUser?.login})</span>
            </>
          ) : activeExecIds.length === availableExecutivos.length ? (
            <span className="font-black text-[#EE2E24] text-sm">
              TODOS OS EXECUTIVOS ({availableExecutivos.length})
            </span>
          ) : (
            <span className="font-black text-[#EE2E24] text-sm">
              {targetExecutivos.length} EXECUTIVOS SELECIONADOS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
          <span>Mês: <strong className="text-gray-900">{activeMonths.map(m => MONTHS_LIST.find(mo => mo.value === m)?.label || m).join(', ')}</strong></span>
          {isConsolidated && (
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1 border ${
              simulatedRows !== null 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <FlaskConical size={12} className={simulatedRows !== null ? 'text-amber-700' : 'text-amber-600'} />
              {simulatedRows !== null ? 'Simulação Temporária Ativa' : 'Soma da Equipe (Editável para Simulação)'}
            </span>
          )}
        </div>
      </div>

      {/* Banner Informativo de Simulação no Modo Consolidado */}
      {!isSingleMode && (
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs transition-colors ${
          simulatedRows !== null
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-sky-50/70 border-sky-200 text-sky-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg shrink-0 ${
              simulatedRows !== null ? 'bg-amber-200 text-amber-900' : 'bg-sky-200 text-sky-900'
            }`}>
              <Calculator size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide ${
                  simulatedRows !== null ? 'bg-amber-200 text-amber-900' : 'bg-sky-200 text-sky-900'
                }`}>
                  {simulatedRows !== null ? 'Modo Simulação Ativo' : 'Simulação Temporária Habilitada'}
                </span>
                <span className="font-bold text-[11px]">
                  {simulatedRows !== null
                    ? 'Valores alterados temporariamente na tela para testar o resultado'
                    : 'Edite qualquer meta ou realizado da equipe para testar cenários em tempo real'}
                </span>
              </div>
              <p className="text-[11px] opacity-85 mt-0.5 font-medium">
                {simulatedRows !== null
                  ? 'Os cálculos, atingimentos e a tarja de elegibilidade estão respondendo aos dados simulados. As alterações não são salvas no banco.'
                  : 'Nenhuma informação digitada será salva no banco. Utilize livremente para simular o atingimento da equipe e elegibilidade.'}
              </p>
            </div>
          </div>

          {simulatedRows !== null && (
            <button
              onClick={() => {
                setSimulatedRows(null);
                setSimulatedTeto(null);
                setSaveNotification('Simulação reiniciada: valores reais da equipe restaurados!');
                setTimeout(() => setSaveNotification(null), 3000);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <RotateCcw size={13} />
              <span>Desfazer Simulação</span>
            </button>
          )}
        </div>
      )}

      {/* Notificação Temporária de Sucesso */}
      {saveNotification && (
        <div className="flex items-center gap-2 p-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* TARJA OFICIAL DE ELEGIBILIDADE AO RVV */}
      {/* "incluir uma tarja de ELEGÍVEL quando os campos banda larga gross, banda larga pme gross, tv gross, movel gross, acelerador bl, acelerador movel e acelerador tv estirem como SIM, e se um desses campos estiverem como NÃO aparecer na tarja como NÃO ELEGÍVEL." */}
      <div 
        id="tarja-elegibilidade-rvv"
        className={`rounded-xl p-4 sm:p-5 shadow-lg border-2 transition-all ${
          eligibilityReport.isEligible
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 border-emerald-300 text-white shadow-emerald-900/25'
            : 'bg-gradient-to-r from-red-600 via-[#d3271e] to-[#a81c15] border-red-300 text-white shadow-red-900/25'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 sm:p-3 rounded-xl shadow-inner shrink-0 ${
              eligibilityReport.isEligible 
                ? 'bg-emerald-500/40 text-emerald-100 ring-2 ring-emerald-300' 
                : 'bg-red-500/40 text-red-100 ring-2 ring-red-300'
            }`}>
              {eligibilityReport.isEligible ? (
                <Trophy size={28} strokeWidth={2.2} className="text-amber-300" />
              ) : (
                <XCircle size={28} strokeWidth={2.2} className="text-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-black tracking-widest uppercase opacity-90">
                  STATUS DO RVV:
                </span>
                <span className={`px-4 py-1 rounded-full text-base sm:text-lg font-black tracking-wider uppercase shadow-md ${
                  eligibilityReport.isEligible 
                    ? 'bg-white text-emerald-800' 
                    : 'bg-white text-red-700'
                }`}>
                  {eligibilityReport.isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}
                </span>
                <span className="text-xs font-bold bg-black/30 text-white px-3 py-1 rounded-full border border-white/20">
                  {eligibilityReport.countSim} de {eligibilityReport.totalCriteria} critérios atingidos (SIM)
                </span>
              </div>
              
              <p className="text-xs sm:text-sm text-white/95 mt-1.5 font-medium leading-relaxed max-w-4xl">
                {eligibilityReport.isEligible ? (
                  <span>
                    <strong>Elegibilidade Confirmada!</strong> Todos os 7 indicadores obrigatórios atingiram a meta com <strong>SIM</strong>: Banda Larga Gross, Banda Larga PME Gross, TV Gross, Móvel Gross, Acelerador BL, Acelerador Móvel e Acelerador TV.
                  </span>
                ) : (
                  <span>
                    Atenção: Para garantir a elegibilidade, todos os 7 indicadores obrigatórios precisam estar como <strong>SIM</strong>. {eligibilityReport.pendingItems.length === 1 ? 'Falta 1 indicador:' : `Faltam ${eligibilityReport.pendingItems.length} indicadores:`} <strong className="underline underline-offset-2 text-amber-200">{eligibilityReport.pendingItems.map(p => p.label).join(', ')}</strong>.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Grade de Acompanhamento em Tempo Real dos 7 Critérios */}
        <div className="mt-3.5 pt-3 border-t border-white/25 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {eligibilityReport.evaluated.map(item => (
            <div
              key={item.id}
              className={`rounded-lg p-2 flex flex-col justify-between text-center transition-all ${
                item.isSim
                  ? 'bg-emerald-950/40 border border-emerald-300/50 text-emerald-100 shadow-xs'
                  : 'bg-black/35 border border-white/30 text-white'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-bold truncate" title={item.label}>
                {item.label}
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className={`text-[11px] font-black px-2 py-0.5 rounded font-mono ${
                  item.isSim ? 'bg-emerald-400 text-emerald-950' : 'bg-red-200 text-red-950'
                }`}>
                  {item.total}
                </span>
                <span className="text-[10px] font-mono opacity-85">
                  {item.realizado}/{item.meta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODELO OFICIAL DO EXTRATO PAP PREMIUM */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden">
        {/* TOPO: BANNER PRETO "EXTRATO PAP PREMIUM" */}
        <div className="bg-[#212121] text-white py-2.5 px-4 text-center font-black tracking-widest text-sm md:text-base uppercase shadow-inner border-b border-neutral-700">
          EXTRATO PAP PREMIUM
        </div>

        {/* SUBHEADER: "CÁLCULO DOS INDICADORES" */}
        <div className="bg-[#303030] text-gray-200 py-1.5 px-4 text-center font-bold tracking-wider text-xs uppercase border-b border-neutral-600">
          CÁLCULO DOS INDICADORES
        </div>

        {/* TABELA COM TODAS AS COLUNAS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[#3e3e3e] text-white text-[10px] md:text-[11px] font-black uppercase tracking-wider divide-x divide-neutral-600 border-b border-neutral-600">
                <th className="py-2.5 px-3 w-[27%] text-left">INDICADOR</th>
                <th className="py-2.5 px-2 w-[13%] text-center">META</th>
                <th className="py-2.5 px-2 w-[13%] text-center">REALIZADO</th>
                {/* COLUNA VALOR DIA ENTRE REALIZADO E ATINGIMENTO */}
                <th className="py-2.5 px-2 w-[15%] text-center bg-[#4a4a4a] text-amber-300">
                  <div className="flex items-center justify-center gap-1">
                    <span>VALOR DIA</span>
                    <Sparkles size={11} className="text-amber-300" />
                  </div>
                </th>
                <th className="py-2.5 px-2 w-[11%] text-center">ATINGIMENTO</th>
                <th className="py-2.5 px-2 w-[10%] text-center">PONTUAÇÃO</th>
                <th className="py-2.5 px-2 w-[11%] text-center">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs md:text-sm font-medium">
              {displayRows.map((row, idx) => {
                const isAccelerator = Boolean(row.acceleratorSource);
                const isGross = GROSS_ROW_IDS.includes(row.id);
                const isEligibilityField = ELIGIBILITY_ROW_IDS.includes(row.id);
                const isEditableRevenue = EDITABLE_REVENUE_ROW_IDS.includes(row.id);
                const isEditing = Boolean(editingRowIds[row.id]);
                const isOdd = idx % 2 === 1;

                return (
                  <tr 
                    key={row.id}
                    className={`hover:bg-red-50/40 transition-colors divide-x divide-gray-200 ${
                      isEditing ? 'bg-emerald-50/30' : isOdd ? 'bg-gray-50/60' : 'bg-white'
                    }`}
                  >
                    {/* INDICADOR COM BOTÃO DE EDITAR AO LADO DAS RECEITAS E BADGE DE ELEGIBILIDADE */}
                    <td className="py-2.5 px-3 font-bold text-gray-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isAccelerator ? (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title="Acelerador" />
                          ) : isGross ? (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Indicador Gross" />
                          ) : null}
                          <span className="truncate">{row.indicador}</span>
                          {isEligibilityField && (
                            <span 
                              className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0 select-none"
                              title="Critério obrigatório para elegibilidade ao RVV"
                            >
                              Elegibilidade
                            </span>
                          )}
                        </div>

                        {/* Botão de Editar ao lado das 5 Receitas */}
                        {isEditableRevenue && (
                          <button
                            type="button"
                            onClick={() => toggleEditRow(row.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs cursor-pointer select-none shrink-0 ${
                              isEditing
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                                : 'bg-white hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 hover:border-red-300 active:scale-95'
                            }`}
                            title={isEditing ? 'Concluir edição da linha' : `Editar valor realizado de ${row.indicador}`}
                          >
                            {isEditing ? (
                              <>
                                <Check size={12} strokeWidth={2.5} />
                                <span>Concluir</span>
                              </>
                            ) : (
                              <>
                                <Pencil size={11} />
                                <span>Editar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* META (CAMPOS DAS METAS EDITÁVEIS CONFORME SOLICITADO) */}
                    <td className="py-1 px-1.5 text-center">
                      {row.id === 'clientes_conectados' ? (
                        <div className="py-1 px-1 text-center font-mono text-gray-400 text-xs select-none">
                          -
                        </div>
                      ) : (
                        <input
                          type="text"
                          onFocus={(e) => e.target.select()}
                          value={row.meta}
                          onChange={(e) => handleCellChange(row.id, 'meta', e.target.value)}
                          placeholder={isEditableRevenue ? 'R$ 0,00' : '0'}
                          className={`w-full text-center py-1 px-1 rounded font-mono font-semibold text-xs md:text-[13px] transition-all outline-none ${
                            isConsolidated
                              ? 'border border-amber-300 hover:border-amber-400 focus:border-amber-500 bg-amber-50/50 focus:bg-white text-gray-900 focus:ring-1 focus:ring-amber-400'
                              : isAccelerator 
                              ? 'border border-gray-300 hover:border-red-400 focus:border-red-500 focus:bg-white focus:ring-1 focus:ring-red-400 text-gray-900 bg-white'
                              : isEditableRevenue
                              ? 'border border-gray-300 hover:border-red-400 focus:border-red-500 focus:bg-white focus:ring-1 focus:ring-red-400 text-gray-900 bg-white'
                              : 'border border-gray-300 hover:border-gray-400 focus:border-red-500 focus:bg-white focus:ring-1 focus:ring-red-400 text-gray-700 bg-white'
                          }`}
                          title={isConsolidated ? `Simulação: Clique para editar a meta consolidada de ${row.indicador}` : `Clique para editar a meta de ${row.indicador}`}
                        />
                      )}
                    </td>

                    {/* REALIZADO */}
                    <td className="py-1 px-1.5 text-center">
                      {row.id === 'clientes_conectados' ? (
                        <input
                          type="text"
                          value={row.realizado}
                          onChange={(e) => handleCellChange(row.id, 'realizado', e.target.value)}
                          className={`w-full text-center py-1 px-1 rounded border font-mono font-bold text-xs md:text-[13px] text-gray-900 transition-all outline-none ${
                            isConsolidated
                              ? 'border-amber-300 hover:border-amber-400 focus:border-amber-500 bg-amber-50/50 focus:bg-white focus:ring-1 focus:ring-amber-400'
                              : 'border-gray-300 hover:border-gray-400 focus:border-red-500 focus:bg-white focus:ring-1 focus:ring-red-400 bg-white'
                          }`}
                          title={isConsolidated ? "Simulação: Clique para editar o realizado de Clientes Conectados" : "Clique para editar o realizado de Clientes Conectados"}
                        />
                      ) : isGross ? (
                        <input
                          type="text"
                          onFocus={(e) => e.target.select()}
                          value={row.realizado}
                          onChange={(e) => handleCellChange(row.id, 'realizado', e.target.value)}
                          placeholder="0"
                          className={`w-full text-center py-1 px-1 rounded border font-mono font-bold text-xs md:text-[13px] text-gray-900 transition-all outline-none ${
                            isConsolidated
                              ? 'border-amber-300 hover:border-blue-400 focus:border-blue-500 bg-amber-50/50 focus:bg-white focus:ring-1 focus:ring-blue-400'
                              : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-400 bg-white'
                          }`}
                          title={isConsolidated ? `Simulação: Clique para editar o realizado de ${row.indicador} ou use a coluna Valor Dia (+)` : `Clique para editar o realizado de ${row.indicador} ou use a coluna Valor Dia (+) para somar`}
                        />
                      ) : isAccelerator && isConsolidated ? (
                        <input
                          type="text"
                          onFocus={(e) => e.target.select()}
                          value={row.realizado}
                          onChange={(e) => handleCellChange(row.id, 'realizado', e.target.value)}
                          placeholder="0"
                          className="w-full text-center py-1 px-1 rounded border border-amber-300 hover:border-red-400 focus:border-red-500 bg-amber-50/50 focus:bg-white focus:ring-1 focus:ring-red-400 font-mono font-bold text-xs md:text-[13px] text-red-900 transition-all outline-none"
                          title="Simulação: Clique para alterar o realizado consolidado deste acelerador e testar o resultado"
                        />
                      ) : isAccelerator ? (
                        <div 
                          className="py-1 px-1 text-center font-mono font-bold text-xs md:text-[13px] text-red-900 bg-red-50/60 rounded border border-red-100 select-none"
                          title={`Sincronizado automaticamente de Vendas (${row.acceleratorSource?.toUpperCase()})`}
                        >
                          {row.realizado}
                        </div>
                      ) : isEditableRevenue && isEditing ? (
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            placeholder="R$ 0,00"
                            value={row.realizado}
                            onChange={(e) => handleCellChange(row.id, 'realizado', e.target.value)}
                            onBlur={() => {
                              if (!row.realizado || row.realizado.trim() === '' || row.realizado.trim() === 'R$') {
                                handleCellChange(row.id, 'realizado', 'R$ 0,00');
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                toggleEditRow(row.id);
                              }
                            }}
                            className="w-full text-center py-1 px-1 rounded border-2 border-emerald-500 bg-emerald-50/60 text-emerald-950 font-mono font-bold text-xs md:text-[13px] focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                            title="Digite o novo valor realizado em Reais (ex: R$ 80) e clique em Concluir"
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => isEditableRevenue && toggleEditRow(row.id)}
                          className={`py-1 px-1 text-center font-mono font-bold text-xs md:text-[13px] ${
                            isConsolidated ? 'text-gray-900 bg-amber-50/40 rounded border border-amber-200' : 'text-gray-800'
                          } ${isEditableRevenue ? 'cursor-pointer hover:text-emerald-700 hover:border-emerald-300' : 'select-none'}`}
                          title={isEditableRevenue ? 'Clique para editar este valor' : undefined}
                        >
                          {row.realizado}
                        </div>
                      )}
                    </td>

                    {/* COLUNA VALOR DIA:
                        - Regra solicitada: "retire o botão acionar desses 3 campos" (Acelerador BL, Móvel e TV)
                    */}
                    <td className="py-1 px-1.5 bg-amber-50/30">
                      {isAccelerator ? (
                        // BOTÃO ACIONAR RETIRADO DOS 3 CAMPOS DE ACELERADOR (BL, Móvel, TV)
                        <div className="text-center font-mono text-gray-400 text-xs py-1 select-none">
                          -
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center max-w-[135px] mx-auto">
                          <input
                            type="text"
                            placeholder={isEditableRevenue ? '0,00' : '0'}
                            value={dayValues[row.id] || ''}
                            onChange={(e) => setDayValues(prev => ({ ...prev, [row.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDayValue(row.id);
                              }
                            }}
                            className={`w-full text-center py-1 px-1 bg-white border ${
                              isConsolidated ? 'border-amber-400 focus:border-amber-600 focus:ring-amber-500' : 'border-amber-300 hover:border-amber-400 focus:border-amber-500 focus:ring-amber-500'
                            } rounded text-xs font-mono font-semibold text-gray-900 shadow-2xs outline-none`}
                            title={isConsolidated ? `Simulação: Digite o valor do dia e clique '+' para somar ao Realizado` : `Digite o valor do dia e clique no botão '+' para somar ao Realizado`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddDayValue(row.id)}
                            disabled={!dayValues[row.id] || dayValues[row.id].trim() === ''}
                            className="flex items-center justify-center p-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
                            title="Somar este valor ao Realizado"
                          >
                            <Plus size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* ATINGIMENTO */}
                    <td className="py-1 px-1.5 text-center">
                      <div className="font-mono font-bold text-xs md:text-[13px] text-gray-900 py-1 select-none">
                        {row.atingimento}
                      </div>
                    </td>

                    {/* PONTUAÇÃO */}
                    <td className="py-1 px-1.5 text-center">
                      <div className="font-mono font-bold text-xs md:text-[13px] text-gray-700 py-1 select-none">
                        {row.pontuacao}
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="py-1 px-1.5 text-center">
                      <div className="py-1 px-1 flex items-center justify-center">
                        {row.total === 'SIM' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded font-mono font-black text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 select-none">
                            SIM
                          </span>
                        ) : row.total === 'NÃO' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded font-mono font-black text-xs text-red-800 bg-red-100 border border-red-300 select-none">
                            NÃO
                          </span>
                        ) : (
                          <span className="font-mono font-black text-xs md:text-[13px] text-neutral-900 select-none">
                            {row.total}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* LINHA: RESULTADO TOTAL */}
              <tr className="bg-gray-100 font-black text-xs md:text-sm divide-x divide-gray-300 border-t-2 border-gray-400">
                <td className="py-3 px-3 uppercase text-gray-800">
                  RESULTADO TOTAL
                </td>
                <td className="py-3 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-3 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-3 px-2 text-center text-gray-400 bg-amber-50/20 font-mono">-</td>
                <td className="py-3 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-3 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-3 px-2 text-center bg-white border-l-2 border-red-600 text-red-600 text-sm md:text-base font-black font-mono shadow-inner">
                  {resultadoTotalPercent}
                </td>
              </tr>

              {/* LINHA: TETO DE REMUNERAÇÃO */}
              <tr className="bg-gray-100 font-black text-xs md:text-sm divide-x divide-gray-300 border-t border-gray-300">
                <td className="py-2.5 px-3 uppercase text-gray-800">
                  TETO DE REMUNERAÇÃO
                </td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 bg-amber-50/20 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center bg-white font-mono font-black text-gray-900 border-l-2 border-gray-400">
                  <input
                    type="text"
                    value={isConsolidated ? (simulatedTeto ?? tetoRemuneracao) : tetoRemuneracao}
                    onChange={(e) => {
                      if (isConsolidated) {
                        setSimulatedTeto(e.target.value);
                      } else {
                        setTetoRemuneracao(e.target.value);
                      }
                    }}
                    className={`w-full text-center font-mono font-black text-xs md:text-sm text-gray-900 rounded outline-none py-0.5 ${
                      isConsolidated 
                        ? 'border border-amber-300 bg-amber-50/40 focus:bg-white focus:ring-1 focus:ring-amber-400' 
                        : 'bg-transparent border border-transparent hover:border-gray-300 focus:border-red-500'
                    }`}
                    title={isConsolidated ? "Simulação: Clique para editar o teto de remuneração consolidado" : "Clique para editar o teto de remuneração"}
                  />
                </td>
              </tr>

              {/* LINHA: STATUS DE ELEGIBILIDADE */}
              <tr className="bg-gray-100 font-black text-xs md:text-sm divide-x divide-gray-300 border-t border-gray-300">
                <td className="py-2.5 px-3 uppercase text-gray-800 flex items-center justify-between">
                  <span>STATUS DE ELEGIBILIDADE</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-normal">
                    {eligibilityReport.countSim}/7 critérios
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 bg-amber-50/20 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center text-gray-400 font-mono">-</td>
                <td className="py-2.5 px-2 text-center border-l-2 border-gray-400">
                  <span className={`inline-block w-full py-1 px-2 rounded font-black font-mono text-xs uppercase tracking-wider ${
                    eligibilityReport.isEligible
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-red-600 text-white shadow-xs'
                  }`}>
                    {eligibilityReport.isEligible ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Informativos de Uso */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600">
        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-2 shadow-2xs">
          <Award size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-800">Regra de Elegibilidade</p>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Tarja <b>ELEGÍVEL</b> é ativada quando todos os 7 indicadores (BL Gross, BL PME Gross, TV Gross, Móvel Gross, Acelerador BL, Móvel e TV) estão como <b>SIM</b>.
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-2 shadow-2xs">
          <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-800">Metas Pré-definidas Gross</p>
            <p className="text-gray-500 text-[11px] mt-0.5">
              BL Gross: <b>5</b> | BL PME Gross: <b>1</b> | TV Gross: <b>3</b> | Móvel Gross: <b>4</b>. Bateu a meta, fica como <b>SIM</b> no Total.
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-2 shadow-2xs">
          <Users size={16} className="text-[#EE2E24] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-800">Filtro Executivos & Simulação</p>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Ao selecionar <b>TODOS OS EXECUTIVOS</b>, os valores são somados. É permitido editar metas e realizados para <b>simulação temporária</b> de cenários (sem salvar no banco).
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-start gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-800">Lançamento de Valor Dia</p>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Nos campos Gross e Receitas, use a coluna Valor Dia e clique em <span className="font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">+</span> para somar diretamente ao Realizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
