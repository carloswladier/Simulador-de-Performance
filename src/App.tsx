/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react';
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
  Info,
  LayoutDashboard,
  Users,
  UserCheck,
  Crown,
  Database,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Layers,
  Calculator
} from 'lucide-react';
import { User, Indicator, SavedPerformanceRecord } from './types';
import { 
  getStoredUsers, 
  saveStoredUsers, 
  getActiveUser, 
  setActiveUser, 
  getLoggedInUser,
  setLoggedInUser,
  getPerformanceRecord, 
  savePerformanceRecord, 
  getCurrentMonthValue,
  MONTHS_LIST,
  apiGetDbStatus,
  apiFetchUsers,
  apiSaveUser,
  apiUpdateUser,
  apiDeleteUser,
  apiSavePerformance,
  apiFetchPerformance,
  initializeDefaultRvvForExecutive
} from './utils/storage';
import { UserManagement } from './components/UserManagement';
import { DashboardFilters } from './components/DashboardFilters';
import { HostingerDatabaseConfig } from './components/HostingerDatabaseConfig';
import { LoginPage } from './components/LoginPage';
import { MonthlyClassificationChart } from './components/MonthlyClassificationChart';
import { RvvTab } from './components/RvvTab';

const DEFAULT_SALES: Indicator[] = [
  { id: 'bl', label: 'BANDA LARGA *', pontos: 20, target: 15, targetStr: '15', real: 20, realStr: '20', isPercentage: false },
  { id: 'cel', label: 'CELULAR *', pontos: 10, target: 7, targetStr: '7', real: 10, realStr: '10', isPercentage: false },
  { id: 'tv', label: 'TV*', pontos: 10, target: 6, targetStr: '6', real: 9, realStr: '9', isPercentage: false },
  { id: 'mesh', label: 'MESH', pontos: 5, target: 5, targetStr: '5', real: 8, realStr: '8', isPercentage: false },
  { id: 'port', label: 'PORTABILIDADE', pontos: 5, target: 40, targetStr: '40', real: 4, realStr: '4', isPercentage: true },
];

const DEFAULT_QUALITY: Indicator[] = [
  { id: 'churn', label: 'CHURN - DOMICÍLIO', pontos: 15, target: 0.80, targetStr: '0,80', real: 0.67, realStr: '0,67', isPercentage: true, isLowerBetter: true },
  { id: 'vol', label: 'VOL. ATENDIMENTO', pontos: 5, target: 120, targetStr: '120', real: 165, realStr: '165', isPercentage: false },
  { id: 'blind', label: 'BLINDAGEM', pontos: 10, target: 10, targetStr: '10', real: 10, realStr: '10', isPercentage: false },
  { id: 'cart', label: 'REPRESENT VENDAS CART', pontos: 15, target: 25, targetStr: '25', real: 27.1, realStr: '27,1', isPercentage: true },
  { id: 'nps', label: 'NPS (NOTA * TRATATIVA)', pontos: 5, target: 30.0, targetStr: '30', real: 30, realStr: '30', isPercentage: false },
];

export default function App() {
  // Aba ativa: 'dashboard' | 'rvv' | 'usuarios' | 'hostinger'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rvv' | 'usuarios' | 'hostinger'>('dashboard');

  // Gerenciamento de Usuários e Autenticação
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getLoggedInUser(users));
  const [isHostingerConnected, setIsHostingerConnected] = useState<boolean>(false);

  // Regras de Perfil e Acesso
  const isAdmin = currentUser?.perfil === 'admin';
  const isCoordenador = currentUser?.perfil === 'coordenador';
  const isExecutivo = currentUser?.perfil === 'executivo';
  const canManageSystem = Boolean(isAdmin || isCoordenador);

  // Sincronizar usuários e status com o backend (Hostinger MySQL)
  const refreshUsersFromDb = async () => {
    try {
      const status = await apiGetDbStatus();
      setIsHostingerConnected(Boolean(status.connected));
      const apiUsers = await apiFetchUsers();
      if (apiUsers && Array.isArray(apiUsers) && apiUsers.length > 0) {
        setUsers(apiUsers);
        // Atualiza currentUser com os dados atualizados do banco
        setCurrentUserState(prev => {
          if (!prev) return null;
          const matched = apiUsers.find(u => u.id === prev.id);
          return matched || prev;
        });
      }
    } catch (e) {
      console.warn('Erro ao verificar status da Hostinger:', e);
    }
  };

  useEffect(() => {
    refreshUsersFromDb();
    // Garante que todos os executivos da base tenham suas metas de RVV pré-preenchidas
    users.filter(u => u.perfil === 'executivo').forEach(u => {
      initializeDefaultRvvForExecutive(u.id);
    });
  }, []);

  // Proteger abas contra acessos não autorizados por perfil
  useEffect(() => {
    if (activeTab === 'hostinger' && !isAdmin) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'usuarios' && !canManageSystem) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin, canManageSystem]);

  // Filtros da Dashboard
  const [selectedCoordenadorId, setSelectedCoordenadorId] = useState<string>('all');
  const [selectedExecutivoIds, setSelectedExecutivoIds] = useState<string[]>(() => {
    if (currentUser && currentUser.perfil === 'executivo') {
      return [currentUser.id];
    }
    const execs = users.filter(u => u.perfil === 'executivo');
    // Por padrão inicia com todos os executivos da base
    return execs.length > 0 ? execs.map(e => e.id) : (users[0]?.id ? [users[0].id] : []);
  });
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => [getCurrentMonthValue()]);

  // Se o usuário logado for executivo, forçar o selectedExecutivoIds a ser apenas o seu próprio ID e garantir dados do RVV
  useEffect(() => {
    if (currentUser && currentUser.perfil === 'executivo') {
      setSelectedExecutivoIds([currentUser.id]);
      if (currentUser.coordenadorId) {
        setSelectedCoordenadorId(currentUser.coordenadorId);
      }
      initializeDefaultRvvForExecutive(currentUser.id);
    }
  }, [currentUser]);

  // Modo individual vs consolidado
  const isSingleMode = selectedExecutivoIds.length === 1 && selectedMonths.length === 1;
  const singleExecutivoId = selectedExecutivoIds[0] || '';
  const singleMonth = selectedMonths[0] || getCurrentMonthValue();

  // Proteger contra acessos não autorizados por perfil: abas administrativas (usuários, hostinger)
  useEffect(() => {
    if (!canManageSystem && activeTab !== 'dashboard' && activeTab !== 'rvv') {
      setActiveTab('dashboard');
    }
  }, [canManageSystem, activeTab]);

  // Indicadores de Vendas e Qualidade
  const [salesIndicators, setSalesIndicators] = useState<Indicator[]>(DEFAULT_SALES);
  const [qualityIndicators, setQualityIndicators] = useState<Indicator[]>(DEFAULT_QUALITY);

  // Estados de salvamento
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Modal de ajuda / faixas de classificação
  const [showInfo, setShowInfo] = useState(false);

  // Atualizar currentUser ao trocar de usuário pela gestão
  const handleSwitchUser = (user: User) => {
    setCurrentUserState(user);
    setLoggedInUser(user);
    setActiveUser(user);
    if (user.perfil === 'executivo') {
      setSelectedExecutivoIds([user.id]);
      if (user.coordenadorId) {
        setSelectedCoordenadorId(user.coordenadorId);
      }
    } else if (user.perfil === 'coordenador') {
      setSelectedCoordenadorId(user.id);
      const coordExecs = users.filter(u => u.perfil === 'executivo' && u.coordenadorId === user.id);
      setSelectedExecutivoIds(coordExecs.map(e => e.id));
    } else {
      setSelectedCoordenadorId('all');
      const allExecs = users.filter(u => u.perfil === 'executivo');
      setSelectedExecutivoIds(allExecs.map(e => e.id));
    }
  };

  // Sucesso no login
  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    setLoggedInUser(user);
    setActiveUser(user);
    if (user.perfil === 'executivo') {
      setSelectedExecutivoIds([user.id]);
      if (user.coordenadorId) {
        setSelectedCoordenadorId(user.coordenadorId);
      }
    } else if (user.perfil === 'coordenador') {
      setSelectedCoordenadorId(user.id);
      const coordExecs = users.filter(u => u.perfil === 'executivo' && u.coordenadorId === user.id);
      setSelectedExecutivoIds(coordExecs.map(e => e.id));
    } else {
      setSelectedCoordenadorId('all');
      const allExecs = users.filter(u => u.perfil === 'executivo');
      setSelectedExecutivoIds(allExecs.map(e => e.id));
    }
    setActiveTab('dashboard');
  };

  // Logout do sistema
  const handleLogout = () => {
    setLoggedInUser(null);
    setCurrentUserState(null);
  };

  // Carregar dados salvos ou consolidar múltiplos executivos e/ou meses
  useEffect(() => {
    if (selectedExecutivoIds.length === 0 || selectedMonths.length === 0) {
      setSalesIndicators(DEFAULT_SALES);
      setQualityIndicators(DEFAULT_QUALITY);
      setLastSavedAt(undefined);
      setHasUnsavedChanges(false);
      return;
    }

    // 1. MODO INDIVIDUAL (1 executivo e 1 mês)
    if (isSingleMode) {
      const execId = selectedExecutivoIds[0];
      const mes = selectedMonths[0];

      const saved = getPerformanceRecord(execId, mes);
      const applyRecord = (rec: SavedPerformanceRecord) => {
        setSalesIndicators(prev => prev.map(ind => {
          const found = rec.salesIndicators.find(s => s.id === ind.id);
          if (found) {
            return {
              ...ind,
              target: found.target,
              targetStr: found.targetStr ?? found.target.toString(),
              real: found.real,
              realStr: found.realStr ?? found.real.toString(),
            };
          }
          return ind;
        }));

        setQualityIndicators(prev => prev.map(ind => {
          const found = rec.qualityIndicators.find(q => q.id === ind.id);
          if (found) {
            return {
              ...ind,
              target: found.target,
              targetStr: found.targetStr ?? found.target.toString(),
              real: found.real,
              realStr: found.realStr ?? found.real.toString(),
            };
          }
          return ind;
        }));

        const dateObj = new Date(rec.updatedAt);
        setLastSavedAt(dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setHasUnsavedChanges(false);
      };

      if (saved) {
        applyRecord(saved);
      } else {
        setSalesIndicators(DEFAULT_SALES);
        setQualityIndicators(DEFAULT_QUALITY);
        setLastSavedAt(undefined);
        setHasUnsavedChanges(false);
      }

      // Se a API estiver online, busca a versão mais recente do banco Hostinger
      apiFetchPerformance(execId, mes).then(apiRec => {
        if (apiRec) {
          applyRecord(apiRec);
        }
      }).catch(() => {});
      return;
    }

    // 2. MODO CONSOLIDADO (Múltiplos executivos e/ou múltiplos meses)
    const pairs: Array<{ execId: string; month: string }> = [];
    selectedExecutivoIds.forEach(execId => {
      selectedMonths.forEach(month => {
        pairs.push({ execId, month });
      });
    });

    const records = pairs.map(p => {
      const saved = getPerformanceRecord(p.execId, p.month);
      return {
        sales: saved ? saved.salesIndicators : DEFAULT_SALES,
        quality: saved ? saved.qualityIndicators : DEFAULT_QUALITY,
      };
    });

    const totalPairs = records.length;

    // Consolidar Vendas
    const aggregatedSales = DEFAULT_SALES.map(baseInd => {
      let sumTarget = 0;
      let sumReal = 0;

      records.forEach(r => {
        const found = r.sales.find(s => s.id === baseInd.id);
        const t = found ? found.target : baseInd.target;
        const rel = found ? found.real : baseInd.real;
        sumTarget += t;
        sumReal += rel;
      });

      if (baseInd.id === 'port') {
        const avgTarget = totalPairs > 0 ? sumTarget / totalPairs : baseInd.target;
        return {
          ...baseInd,
          target: avgTarget,
          targetStr: avgTarget.toFixed(1).replace('.', ','),
          real: sumReal,
          realStr: sumReal.toString(),
        };
      }

      if (baseInd.isPercentage) {
        const avgTarget = totalPairs > 0 ? sumTarget / totalPairs : baseInd.target;
        const avgReal = totalPairs > 0 ? sumReal / totalPairs : baseInd.real;
        return {
          ...baseInd,
          target: avgTarget,
          targetStr: avgTarget.toFixed(1).replace('.', ','),
          real: avgReal,
          realStr: avgReal.toFixed(1).replace('.', ','),
        };
      }

      // Volume (BL, Celular, TV, Mesh): Soma
      return {
        ...baseInd,
        target: sumTarget,
        targetStr: sumTarget.toString(),
        real: sumReal,
        realStr: sumReal.toString(),
      };
    });

    // Consolidar Qualidade (médias)
    const aggregatedQuality = DEFAULT_QUALITY.map(baseInd => {
      let sumTarget = 0;
      let sumReal = 0;

      records.forEach(r => {
        const found = r.quality.find(q => q.id === baseInd.id);
        const t = found ? found.target : baseInd.target;
        const rel = found ? found.real : baseInd.real;
        sumTarget += t;
        sumReal += rel;
      });

      const avgTarget = totalPairs > 0 ? sumTarget / totalPairs : baseInd.target;
      const avgReal = totalPairs > 0 ? sumReal / totalPairs : baseInd.real;

      return {
        ...baseInd,
        target: avgTarget,
        targetStr: baseInd.id === 'churn' ? avgTarget.toFixed(2).replace('.', ',') : avgTarget.toFixed(1).replace('.', ','),
        real: avgReal,
        realStr: baseInd.id === 'churn' ? avgReal.toFixed(2).replace('.', ',') : avgReal.toFixed(1).replace('.', ','),
      };
    });

    setSalesIndicators(aggregatedSales);
    setQualityIndicators(aggregatedQuality);
    setLastSavedAt(undefined);
    setHasUnsavedChanges(false);
  }, [selectedExecutivoIds, selectedMonths, isSingleMode]);

  // Manipuladores de Usuários (Aba USUÁRIO)
  const handleAddUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveStoredUsers(updated);

    // Se for executivo, incluir na lista de executivos selecionados e inicializar suas metas padrão do Extrato RVV
    if (newUser.perfil === 'executivo') {
      setSelectedExecutivoIds(prev => [...prev, newUser.id]);
      initializeDefaultRvvForExecutive(newUser.id);
    }

    // Gravar no banco Hostinger em segundo plano
    await apiSaveUser(newUser);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updated);
    saveStoredUsers(updated);
    if (currentUser.id === updatedUser.id) {
      setCurrentUserState(updatedUser);
      setActiveUser(updatedUser);
    }

    // Atualizar no banco Hostinger
    await apiUpdateUser(updatedUser);
  };

  const handleDeleteUser = async (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveStoredUsers(updated);

    setSelectedExecutivoIds(prev => {
      const filtered = prev.filter(id => id !== userId);
      if (filtered.length > 0) return filtered;
      const nextExec = updated.filter(u => u.perfil === 'executivo');
      return nextExec.length > 0 ? [nextExec[0].id] : [];
    });

    // Deletar no banco Hostinger
    await apiDeleteUser(userId);
  };

  // Salvar registro de performance do Executivo para o Mês selecionado (somente quando 1 executivo e 1 mês selecionados)
  const handleSaveData = async () => {
    if (!isSingleMode || !singleExecutivoId) return;

    setIsSaving(true);
    const now = new Date();
    const record: SavedPerformanceRecord = {
      executivoId: singleExecutivoId,
      mes: singleMonth,
      salesIndicators: salesIndicators.map(ind => ({
        id: ind.id,
        target: ind.target,
        targetStr: ind.targetStr,
        real: ind.real,
        realStr: ind.realStr,
      })),
      qualityIndicators: qualityIndicators.map(ind => ({
        id: ind.id,
        target: ind.target,
        targetStr: ind.targetStr,
        real: ind.real,
        realStr: ind.realStr,
      })),
      updatedAt: now.toISOString(),
    };

    savePerformanceRecord(record);
    await apiSavePerformance(record);

    setIsSaving(false);
    setHasUnsavedChanges(false);
    setSaveSuccess(true);
    setLastSavedAt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // Restaurar dados padrão para o executivo/mês
  const handleResetData = () => {
    if (!isSingleMode) return;
    if (confirm('Deseja restaurar os indicadores para os valores padrão deste mês?')) {
      setSalesIndicators(DEFAULT_SALES);
      setQualityIndicators(DEFAULT_QUALITY);
      setHasUnsavedChanges(true);
    }
  };

  // Mapeamento de Ícones
  const getSalesIcon = (id: string): ReactNode => {
    switch (id) {
      case 'bl': return <Wifi size={18} />;
      case 'cel': return <Smartphone size={18} />;
      case 'tv': return <Monitor size={18} />;
      case 'mesh': return <Wifi size={18} className="rotate-45" />;
      case 'port': return <Smartphone size={18} />;
      default: return <Target size={18} />;
    }
  };

  const getQualityIcon = (id: string): ReactNode => {
    switch (id) {
      case 'churn': return <Target size={18} />;
      case 'vol': return <PhoneCall size={18} />;
      case 'blind': return <Shield size={18} />;
      case 'cart': return <ShoppingCart size={18} />;
      case 'nps': return <MessageSquare size={18} />;
      default: return <Target size={18} />;
    }
  };

  // Obter o real do celular para cálculo da meta de portabilidade (40% sobre celular real)
  const celularReal = salesIndicators.find(ind => ind.id === 'cel')?.real ?? 0;

  const calculateAting = (indicator: Indicator) => {
    // Cálculo específico de Portabilidade (% da meta sobre o real do Celular)
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
  };

  const calculatePontuacao = (indicator: Indicator) => {
    const ating = calculateAting(indicator) / 100;
    return Math.min(indicator.pontos, indicator.pontos * ating);
  };

  const calculateGap = (indicator: Indicator) => {
    if (indicator.id === 'port') {
      const targetQty = celularReal * (indicator.target / 100);
      const gap = targetQty - indicator.real;
      return gap > 0 ? gap : 0;
    }
    if (indicator.isLowerBetter) {
      const gap = indicator.real - indicator.target;
      return gap > 0 ? gap : 0;
    }
    const gap = indicator.target - indicator.real;
    return gap > 0 ? gap : 0;
  };

  const handleInputChange = (id: string, value: string, type: 'sales' | 'quality', field: 'real' | 'target') => {
    if (!isSingleMode) return; // Em modo consolidado não edita diretamente

    const cleanVal = value.replace(',', '.');
    const numValue = parseFloat(cleanVal);
    const parsed = isNaN(numValue) ? 0 : numValue;
    const strField = field === 'real' ? 'realStr' : 'targetStr';

    setHasUnsavedChanges(true);

    if (type === 'sales') {
      setSalesIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, [field]: parsed, [strField]: value } : ind));
    } else {
      setQualityIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, [field]: parsed, [strField]: value } : ind));
    }
  };

  const totalSalesPontos = salesIndicators.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalSalesPontuacao = salesIndicators.reduce((acc, curr) => acc + calculatePontuacao(curr), 0);
  const finalSalesAting = totalSalesPontos > 0 ? (totalSalesPontuacao / totalSalesPontos) * 100 : 0;

  const totalQualityPontos = qualityIndicators.reduce((acc, curr) => acc + curr.pontos, 0);
  const totalQualityPontuacao = qualityIndicators.reduce((acc, curr) => acc + calculatePontuacao(curr), 0);
  const finalQualityAting = totalQualityPontos > 0 ? (totalQualityPontuacao / totalQualityPontos) * 100 : 0;

  // Regras de Classificação especificadas:
  // DIAMANTE: vendas > 89% e qualidade > 96%
  // OURO: vendas >= 77% e <= 89% e qualidade >= 86% e <= 96%
  // PRATA: vendas >= 58% e <= 77% e qualidade >= 76% e <= 86%
  // BRONZE: vendas de 0% a <= 58% e qualidade de 0% a <= 76%
  const getClassification = (vendas: number, quali: number) => {
    if (vendas > 89 && quali > 96) {
      return { label: 'DIAMANTE', color: 'bg-[#00AEEF]', textColor: 'text-white' };
    }
    if (vendas >= 77 && quali >= 86) {
      return { label: 'OURO', color: 'bg-[#FFFF00]', textColor: 'text-[#333]' };
    }
    if (vendas >= 58 && quali >= 76) {
      return { label: 'PRATA', color: 'bg-[#CCCCCC]', textColor: 'text-[#333]' };
    }
    return { label: 'BRONZE', color: 'bg-[#D96924]', textColor: 'text-white' };
  };

  const classification = getClassification(finalSalesAting, finalQualityAting);

  // Objetos dos executivos selecionados
  const selectedExecutivosObjects = useMemo(() => {
    return users.filter(u => selectedExecutivoIds.includes(u.id));
  }, [users, selectedExecutivoIds]);

  const allExecutivosCount = users.filter(u => u.perfil === 'executivo').length;
  const isAllExecutivosSelected = selectedExecutivosObjects.length > 0 && selectedExecutivosObjects.length === allExecutivosCount;

  // Rótulo dos meses selecionados
  const selectedMonthsLabel = useMemo(() => {
    if (selectedMonths.length === 0) return 'NENHUM MÊS';
    if (selectedMonths.length === 12) return 'TODOS OS MESES (ANO COMPLETO)';
    if (selectedMonths.length === 1) {
      const found = MONTHS_LIST.find(m => m.value === selectedMonths[0]);
      return found ? `${found.label} 2026` : 'SETEMBRO 2026';
    }
    const names = selectedMonths
      .map(mVal => MONTHS_LIST.find(m => m.value === mVal)?.label?.substring(0, 3))
      .filter(Boolean)
      .join(', ');
    return `${selectedMonths.length} MESES (${names})`;
  }, [selectedMonths]);

  // Se não estiver autenticado, exibir a tela de login
  if (!currentUser) {
    return <LoginPage users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#333333] font-sans p-2 sm:p-4 md:p-8">
      <div className="max-w-[1440px] mx-auto space-y-4 md:space-y-6">
        
        {/* Barra Superior com Identidade Claro e Sessão do Usuário */}
        <header className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-[#EE2E24] text-white font-black px-2.5 py-0.5 text-xs rounded tracking-widest uppercase">Claro</span>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-gray-900 uppercase">
                Simulador de Performance
              </h1>
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              Gestão de Vendas e Qualidade • Operação Comercial
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
            {/* Hostinger Status Pill / Atalho (Apenas para Admin Master) */}
            {isAdmin && (
              <button
                type="button"
                id="header-btn-hostinger-status"
                onClick={() => setActiveTab('hostinger')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  isHostingerConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title="Clique para abrir as configurações do banco de dados Hostinger"
              >
                <Database size={14} className={isHostingerConnected ? 'text-emerald-600' : 'text-amber-600'} />
                <span>Hostinger:</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isHostingerConnected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isHostingerConnected ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                  {isHostingerConnected ? 'Conectado' : 'Configurar'}
                </span>
              </button>
            )}

            {/* Usuário Ativo Mini-Card */}
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                currentUser.perfil === 'admin' 
                  ? 'bg-purple-700' 
                  : currentUser.perfil === 'coordenador' 
                  ? 'bg-[#EE2E24]' 
                  : 'bg-[#00AEEF]'
              }`}>
                {currentUser.perfil === 'admin' ? <Crown size={16} /> : currentUser.perfil === 'coordenador' ? <Crown size={16} /> : <UserCheck size={16} />}
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-gray-900 leading-tight">{currentUser.nome}</div>
                <div className="text-[10px] uppercase font-bold text-gray-500">
                  Perfil:{' '}
                  <span className={
                    currentUser.perfil === 'admin' 
                      ? 'text-purple-700 font-black' 
                      : currentUser.perfil === 'coordenador' 
                      ? 'text-[#EE2E24] font-black' 
                      : 'text-[#00AEEF] font-black'
                  }>
                    {currentUser.perfil === 'admin' ? 'ADMIN MASTER' : currentUser.perfil === 'coordenador' ? 'Coordenador(a)' : 'Executivo(a)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Sair / Logout */}
            <button
              type="button"
              id="header-btn-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-white hover:bg-[#EE2E24] hover:border-[#EE2E24] text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Encerrar sessão e voltar para tela de login"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>

            {/* Distintivo de Mês */}
            <div className="bg-[#EE2E24] text-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black shadow-md flex items-center gap-2 tracking-wide uppercase">
              <TrendingUp size={16} className="shrink-0" />
              <span>{selectedMonthsLabel}</span>
            </div>
          </div>
        </header>

        {/* Navegação entre as Abas: DASHBOARD, RVV, USUÁRIO e BANCO HOSTINGER */}
        <nav className="flex flex-wrap items-center gap-2 border-b-2 border-gray-200 pb-1" aria-label="Abas de navegação">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#EE2E24] text-white shadow-md border-b-4 border-red-800'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <LayoutDashboard size={18} />
            <span>DASHBOARD</span>
          </button>

          <button
            id="tab-rvv"
            onClick={() => setActiveTab('rvv')}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'rvv'
                ? 'bg-[#EE2E24] text-white shadow-md border-b-4 border-red-800'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <Calculator size={18} />
            <span>RVV</span>
          </button>

          {canManageSystem && (
            <button
              id="tab-usuario"
              onClick={() => setActiveTab('usuarios')}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'usuarios'
                  ? 'bg-[#EE2E24] text-white shadow-md border-b-4 border-red-800'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Users size={18} />
              <span>USUÁRIO</span>
              <span className="ml-1 bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {isAdmin ? users.length : users.filter(u => u.perfil !== 'admin' && u.login.toUpperCase() !== 'ADMIN').length}
              </span>
            </button>
          )}

          {isAdmin && (
            <button
              id="tab-hostinger"
              onClick={() => setActiveTab('hostinger')}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-black text-xs md:text-sm tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === 'hostinger'
                  ? 'bg-[#EE2E24] text-white shadow-md border-b-4 border-red-800'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <Database size={18} />
              <span>BANCO HOSTINGER</span>
              <span className={`w-2.5 h-2.5 rounded-full ${isHostingerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </button>
          )}
        </nav>

        {/* CONTEÚDO DA ABA RVV (Extrato PAP Premium) */}
        {activeTab === 'rvv' && (
          <RvvTab
            currentUser={currentUser}
            selectedCoordenadorId={selectedCoordenadorId}
            onSelectCoordenadorId={setSelectedCoordenadorId}
            selectedExecutivoIds={selectedExecutivoIds}
            onSelectExecutivoIds={setSelectedExecutivoIds}
            selectedMonths={selectedMonths}
            onSelectMonths={setSelectedMonths}
            selectedExecutivoId={selectedExecutivoIds[0] || currentUser?.id || 'exec-1'}
            selectedMonth={selectedMonths[0] || getCurrentMonthValue()}
            users={users}
            salesRealBL={salesIndicators.find(s => s.id === 'bl')?.real ?? 0}
            salesRealCel={salesIndicators.find(s => s.id === 'cel')?.real ?? 0}
            salesRealTV={salesIndicators.find(s => s.id === 'tv')?.real ?? 0}
          />
        )}

        {/* CONTEÚDO DA ABA BANCO HOSTINGER (Apenas Admin) */}
        {isAdmin && activeTab === 'hostinger' && (
          <HostingerDatabaseConfig
            users={users}
            currentUser={currentUser}
            onRefreshUsers={refreshUsersFromDb}
          />
        )}

        {/* CONTEÚDO DA ABA USUÁRIO (Apenas Admin e Coordenador) */}
        {canManageSystem && activeTab === 'usuarios' && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onSwitchUser={handleSwitchUser}
          />
        )}

        {/* CONTEÚDO DA ABA DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6 animate-in fade-in duration-200">
            
            {/* Barra de Filtros: Executivo(a), Coordenador(a) e Mês + Ação Salvar */}
            <DashboardFilters
              users={users}
              currentUser={currentUser}
              selectedCoordenadorId={selectedCoordenadorId}
              onSelectCoordenadorId={setSelectedCoordenadorId}
              selectedExecutivoIds={selectedExecutivoIds}
              onSelectExecutivoIds={setSelectedExecutivoIds}
              selectedMonths={selectedMonths}
              onSelectMonths={setSelectedMonths}
              onSaveData={handleSaveData}
              onResetData={handleResetData}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
              lastSavedAt={lastSavedAt}
              canEdit={true}
              isSingleMode={isSingleMode}
            />

            {/* Banner de Identificação dos Executivos Selecionados */}
            {selectedExecutivosObjects.length > 0 && (
              <div className={`bg-white border-l-4 ${isSingleMode ? 'border-[#00AEEF]' : 'border-[#EE2E24]'} px-4 py-2.5 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-600 gap-2`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 uppercase">
                    {isSingleMode ? 'Simulação do(a) Executivo(a): ' : 'Simulação Consolidada: '}
                  </span>
                  {isSingleMode ? (
                    <>
                      <span className="font-black text-[#00AEEF] text-sm">{selectedExecutivosObjects[0]?.nome}</span>
                      <span className="text-gray-400 font-mono ml-1">(@{selectedExecutivosObjects[0]?.login})</span>
                    </>
                  ) : isAllExecutivosSelected ? (
                    <span className="font-black text-[#EE2E24] text-sm bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1.5">
                      <Users size={14} />
                      TODOS OS EXECUTIVOS(AS) ({selectedExecutivosObjects.length} profissionais)
                    </span>
                  ) : (
                    <span className="font-black text-[#EE2E24] text-sm bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1.5">
                      <Users size={14} />
                      {selectedExecutivosObjects.length} EXECUTIVOS(AS) SELECIONADOS(AS)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                  <span>Referência: <strong className="text-gray-800">{selectedMonthsLabel}</strong></span>
                  {!isSingleMode && (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <Layers size={11} />
                      Visão Consolidada
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Card de Classificação Final */}
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

              <button 
                onClick={() => setShowInfo(!showInfo)}
                className="bg-white/20 hover:bg-white/30 text-current p-2 rounded-full transition-colors self-end sm:self-center"
                title="Ver Faixas de Classificação"
              >
                <Info size={18} />
              </button>
            </div>

            {/* Tabela de Referência de Faixas (Retrátil) */}
            {showInfo && (
              <div className="bg-white border-2 border-[#EE2E24] rounded-xl p-4 md:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-x-auto">
                <h3 className="text-center font-black text-[#EE2E24] mb-4 uppercase tracking-widest text-xs md:text-base">
                  Faixas de Classificação Oficiais
                </h3>
                <div className="min-w-[400px]">
                  <div className="grid grid-cols-3 border-2 border-gray-200 rounded-lg overflow-hidden max-w-2xl mx-auto">
                    <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-r border-white/20">Vendas</div>
                    <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-r border-white/20">Qualidade</div>
                    <div className="bg-[#EE2E24] text-white p-2 text-center text-[10px] md:text-xs font-bold uppercase border-b border-white/20">Classificação</div>
                    
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">{">"} 89%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">{">"} 96%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#00AEEF] text-white border-b">DIAMANTE</div>

                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">77% a 89%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">86% a 96%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#FFFF00] text-[#333] border-b">OURO</div>

                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">58% a 77%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-b border-r border-gray-100">76% a 86%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#CCCCCC] text-[#333] border-b">PRATA</div>

                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-r border-gray-100">0% a 58%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-bold border-r border-gray-100">0% a 76%</div>
                    <div className="p-2 md:p-3 text-center text-xs md:text-sm font-black bg-[#D96924] text-white">BRONZE</div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráfico Mensal de Classificação (Diamante, Ouro, Prata e Bronze) */}
            <MonthlyClassificationChart
              selectedExecutivoIds={selectedExecutivoIds}
              users={users}
              selectedMonths={selectedMonths}
              onSelectMonth={(m) => setSelectedMonths([m])}
              currentSalesIndicators={salesIndicators}
              currentQualityIndicators={qualityIndicators}
            />

            {/* Aviso quando em Modo Consolidado */}
            {!isSingleMode && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-200 text-amber-900 p-1.5 rounded-lg shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <span className="font-black uppercase tracking-wide">Visão Agrupada Consolidada: </span>
                    <span>
                      Exibindo somatório de volumes e médias ponderadas para {selectedExecutivosObjects.length} executivo(s) e {selectedMonths.length} mês(es).
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200 shrink-0">
                  Para editar valores individuais, selecione 1 executivo(a) e 1 mês
                </span>
              </div>
            )}

            {/* Grid Principal: Tabelas de Vendas e Qualidade */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
              
              {/* Tabela de Vendas */}
              <section className="flex flex-col h-full space-y-3 md:space-y-4">
                <div className="flex-grow overflow-x-auto rounded-xl border-2 border-[#EE2E24] shadow-xl bg-white flex flex-col">
                  <div className="min-w-[580px]">
                    <div className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] bg-[#EE2E24] text-white text-[8px] md:text-[9px] font-black uppercase tracking-wider divide-x divide-white/20 border-b border-[#EE2E24]">
                      <div className="px-3 py-2.5 flex items-center">Indicadores de Vendas</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Pontos</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Target</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Real</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center whitespace-nowrap">Gap Meta</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Ating</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Pontuação</div>
                    </div>

                    <div className="flex-grow">
                      {salesIndicators.map((ind) => {
                        const ating = calculateAting(ind);
                        const pontuacao = calculatePontuacao(ind);
                        const gap = calculateGap(ind);
                        const targetPortQty = ind.id === 'port' ? celularReal * (ind.target / 100) : 0;

                        return (
                          <div key={ind.id} className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] border-b border-gray-200 divide-x divide-gray-100 hover:bg-red-50/40 transition-colors items-stretch">
                            <div className="flex items-center gap-2 px-3 py-2 text-[10px] md:text-[11px] font-bold min-h-[50px] md:min-h-[54px]">
                              <span className="text-[#EE2E24] shrink-0">{getSalesIcon(ind.id)}</span>
                              <span className="leading-tight text-gray-900">{ind.label}</span>
                            </div>
                            <div className="flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono font-bold text-gray-700 min-h-[50px] md:min-h-[54px]">
                              {ind.pontos}
                            </div>
                            
                            {/* Campo Target */}
                            <div className="flex flex-col items-center justify-center p-1.5 min-h-[50px] md:min-h-[54px]">
                              <div className="relative w-full max-w-[66px] flex items-center justify-center">
                                <input 
                                  type="text" 
                                  value={ind.targetStr ?? ind.target}
                                  disabled={!isSingleMode}
                                  readOnly={!isSingleMode}
                                  onChange={(e) => handleInputChange(ind.id, e.target.value, 'sales', 'target')}
                                  className={`w-full h-7 text-center rounded text-[10px] md:text-[11px] font-mono font-bold transition-all shadow-xs ${
                                    ind.isPercentage ? 'pr-3.5' : ''
                                  } ${
                                    !isSingleMode 
                                      ? 'bg-amber-50/60 border border-amber-200 text-gray-800 cursor-default' 
                                      : 'bg-white border border-gray-300 hover:border-gray-400 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] outline-none'
                                  }`}
                                  title={!isSingleMode ? 'Valor consolidado (somatório/média dos filtros selecionados)' : 'Clique para editar o target'}
                                />
                                {ind.isPercentage && (
                                  <span className="absolute right-1 text-[8px] md:text-[9px] text-gray-400 font-bold pointer-events-none">%</span>
                                )}
                              </div>
                              {ind.id === 'port' && (
                                <span className="text-[8px] text-gray-500 block text-center mt-0.5 leading-none font-sans font-medium" title="Quantidade necessária para 100%">
                                  Meta: {Number.isInteger(targetPortQty) ? targetPortQty : targetPortQty.toFixed(1).replace('.', ',')} un.
                                </span>
                              )}
                            </div>

                            {/* Campo Real */}
                            <div className="flex flex-col items-center justify-center p-1.5 min-h-[50px] md:min-h-[54px]">
                              <div className="relative w-full max-w-[66px] flex items-center justify-center">
                                <input 
                                  type="text" 
                                  value={ind.realStr ?? ind.real}
                                  disabled={!isSingleMode}
                                  readOnly={!isSingleMode}
                                  onChange={(e) => handleInputChange(ind.id, e.target.value, 'sales', 'real')}
                                  className={`w-full h-7 text-center rounded text-[10px] md:text-[11px] font-mono font-bold transition-all shadow-xs ${
                                    ind.isPercentage && ind.id !== 'port' ? 'pr-3.5' : ''
                                  } ${
                                    !isSingleMode 
                                      ? 'bg-amber-50/60 border border-amber-200 text-gray-800 cursor-default' 
                                      : 'bg-white border border-gray-300 hover:border-gray-400 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] outline-none'
                                  }`}
                                  title={!isSingleMode ? 'Valor consolidado (somatório/média dos filtros selecionados)' : 'Clique para editar o valor realizado'}
                                />
                                {ind.isPercentage && ind.id !== 'port' && (
                                  <span className="absolute right-1 text-[8px] md:text-[9px] text-gray-400 font-bold pointer-events-none">%</span>
                                )}
                              </div>
                              {ind.id === 'port' && (
                                <span className="text-[8px] text-gray-500 block text-center mt-0.5 leading-none font-sans font-medium" title="Percentual sobre celular">
                                  {celularReal > 0 ? ((ind.real / celularReal) * 100).toFixed(1).replace('.', ',') : '0,0'}%
                                </span>
                              )}
                            </div>

                            {/* Gap */}
                            <div className={`flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono min-h-[50px] md:min-h-[54px] ${
                              gap > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'
                            }`}>
                              {gap === 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">OK</span>
                              ) : (
                                `${Number.isInteger(gap) ? gap : gap.toFixed(1).replace('.', ',')}${ind.isPercentage && ind.id !== 'port' ? '%' : ''}`
                              )}
                            </div>

                            {/* Atingimento */}
                            <div className="flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono font-bold text-gray-800 min-h-[50px] md:min-h-[54px]">
                              {ating.toFixed(1).replace('.', ',')}%
                            </div>

                            {/* Pontuação */}
                            <div className="flex items-center justify-center gap-1.5 px-2 py-2 bg-gray-50/80 text-[10px] md:text-[11px] font-mono min-h-[50px] md:min-h-[54px]">
                              {ating >= 100 ? (
                                <ChevronUp size={12} className="text-emerald-600 shrink-0" />
                              ) : (
                                <TrendingDown size={12} className="text-red-600 shrink-0" />
                              )}
                              <span className="font-black text-[#EE2E24] text-xs md:text-[13px] tracking-tight">
                                {pontuacao.toFixed(1).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] bg-gray-100 font-black text-[10px] md:text-[11px] mt-auto divide-x divide-gray-200 border-t-2 border-gray-300">
                      <div className="px-3 py-2.5 uppercase text-gray-700 flex items-center font-black">Total</div>
                      <div className="px-1 py-2.5 font-mono text-gray-900 flex items-center justify-center font-bold">{totalSalesPontos}</div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="px-1 py-2.5 bg-white text-[#EE2E24] text-sm md:text-base font-black font-mono flex items-center justify-center border-l-2 border-[#EE2E24] shadow-inner">
                        {totalSalesPontuacao.toFixed(1).replace('.', ',')}
                      </div>
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

              {/* Tabela de Qualidade */}
              <section className="flex flex-col h-full space-y-3 md:space-y-4">
                <div className="flex-grow overflow-x-auto rounded-xl border-2 border-[#EE2E24] shadow-xl bg-white flex flex-col">
                  <div className="min-w-[580px]">
                    <div className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] bg-[#EE2E24] text-white text-[8px] md:text-[9px] font-black uppercase tracking-wider divide-x divide-white/20 border-b border-[#EE2E24]">
                      <div className="px-3 py-2.5 flex items-center">Indicadores de Qualidade</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Pontos</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Target</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Real</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center whitespace-nowrap">Gap Meta</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Ating</div>
                      <div className="px-1 py-2.5 flex items-center justify-center text-center">Pontuação</div>
                    </div>

                    <div className="flex-grow">
                      {qualityIndicators.map((ind) => {
                        const ating = calculateAting(ind);
                        const pontuacao = calculatePontuacao(ind);
                        const gap = calculateGap(ind);
                        return (
                          <div key={ind.id} className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] border-b border-gray-200 divide-x divide-gray-100 hover:bg-red-50/40 transition-colors items-stretch">
                            <div className="flex items-center gap-2 px-3 py-2 text-[10px] md:text-[11px] font-bold min-h-[50px] md:min-h-[54px]">
                              <span className="text-[#EE2E24] shrink-0">{getQualityIcon(ind.id)}</span>
                              <span className="leading-tight text-gray-900">{ind.label}</span>
                            </div>
                            <div className="flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono font-bold text-gray-700 min-h-[50px] md:min-h-[54px]">
                              {ind.pontos}
                            </div>
                            
                            {/* Campo Target */}
                            <div className="flex flex-col items-center justify-center p-1.5 min-h-[50px] md:min-h-[54px]">
                              <div className="relative w-full max-w-[66px] flex items-center justify-center">
                                <input 
                                  type="text" 
                                  value={ind.targetStr ?? ind.target}
                                  disabled={!isSingleMode}
                                  readOnly={!isSingleMode}
                                  onChange={(e) => handleInputChange(ind.id, e.target.value, 'quality', 'target')}
                                  className={`w-full h-7 text-center rounded text-[10px] md:text-[11px] font-mono font-bold transition-all shadow-xs ${
                                    ind.isPercentage ? 'pr-3.5' : ''
                                  } ${
                                    !isSingleMode 
                                      ? 'bg-amber-50/60 border border-amber-200 text-gray-800 cursor-default' 
                                      : 'bg-white border border-gray-300 hover:border-gray-400 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] outline-none'
                                  }`}
                                  title={!isSingleMode ? 'Valor consolidado (somatório/média dos filtros selecionados)' : 'Clique para editar o target'}
                                />
                                {ind.isPercentage && (
                                  <span className="absolute right-1 text-[8px] md:text-[9px] text-gray-400 font-bold pointer-events-none">%</span>
                                )}
                              </div>
                            </div>

                            {/* Campo Real */}
                            <div className="flex flex-col items-center justify-center p-1.5 min-h-[50px] md:min-h-[54px]">
                              <div className="relative w-full max-w-[66px] flex items-center justify-center">
                                <input 
                                  type="text" 
                                  value={ind.realStr ?? ind.real}
                                  disabled={!isSingleMode}
                                  readOnly={!isSingleMode}
                                  onChange={(e) => handleInputChange(ind.id, e.target.value, 'quality', 'real')}
                                  className={`w-full h-7 text-center rounded text-[10px] md:text-[11px] font-mono font-bold transition-all shadow-xs ${
                                    ind.isPercentage ? 'pr-3.5' : ''
                                  } ${
                                    !isSingleMode 
                                      ? 'bg-amber-50/60 border border-amber-200 text-gray-800 cursor-default' 
                                      : 'bg-white border border-gray-300 hover:border-gray-400 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] outline-none'
                                  }`}
                                  title={!isSingleMode ? 'Valor consolidado (somatório/média dos filtros selecionados)' : 'Clique para editar o valor realizado'}
                                />
                                {ind.isPercentage && (
                                  <span className="absolute right-1 text-[8px] md:text-[9px] text-gray-400 font-bold pointer-events-none">%</span>
                                )}
                              </div>
                            </div>

                            {/* Gap */}
                            <div className={`flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono min-h-[50px] md:min-h-[54px] ${
                              gap > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'
                            }`}>
                              {gap === 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">OK</span>
                              ) : (
                                `${ind.id === 'churn' ? gap.toFixed(2).replace('.', ',') : (Number.isInteger(gap) ? gap : gap.toFixed(1).replace('.', ','))}${ind.isPercentage ? '%' : ''}`
                              )}
                            </div>

                            {/* Atingimento */}
                            <div className="flex items-center justify-center text-center px-1 py-2 text-[10px] md:text-[11px] font-mono font-bold text-gray-800 min-h-[50px] md:min-h-[54px]">
                              {ating.toFixed(1).replace('.', ',')}%
                            </div>

                            {/* Pontuação */}
                            <div className="flex items-center justify-center gap-1.5 px-2 py-2 bg-gray-50/80 text-[10px] md:text-[11px] font-mono min-h-[50px] md:min-h-[54px]">
                              {ating >= 100 ? (
                                <ChevronUp size={12} className="text-emerald-600 shrink-0" />
                              ) : (
                                <TrendingDown size={12} className="text-red-600 shrink-0" />
                              )}
                              <span className="font-black text-[#EE2E24] text-xs md:text-[13px] tracking-tight">
                                {pontuacao.toFixed(1).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-[minmax(130px,1.4fr)_56px_74px_74px_72px_74px_82px] bg-gray-100 font-black text-[10px] md:text-[11px] mt-auto divide-x divide-gray-200 border-t-2 border-gray-300">
                      <div className="px-3 py-2.5 uppercase text-gray-700 flex items-center font-black">Total</div>
                      <div className="px-1 py-2.5 font-mono text-gray-900 flex items-center justify-center font-bold">{totalQualityPontos}</div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="bg-gray-50/40"></div>
                      <div className="px-1 py-2.5 bg-white text-[#EE2E24] text-sm md:text-base font-black font-mono flex items-center justify-center border-l-2 border-[#EE2E24] shadow-inner">
                        {totalQualityPontuacao.toFixed(1).replace('.', ',')}
                      </div>
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
          </div>
        )}

        <footer className="mt-8 pt-6 border-t-2 border-[#EE2E24]/20 text-[10px] uppercase font-bold tracking-widest opacity-40 text-center">
          Claro Simulador de Performance • Gestão de Vendas e Qualidade
        </footer>
      </div>
    </div>
  );
}
