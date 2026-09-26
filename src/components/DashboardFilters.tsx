import { User } from '../types';
import { MONTHS_LIST } from '../utils/storage';
import { 
  Users, 
  Shield, 
  Calendar, 
  Save, 
  CheckCircle2, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { MultiSelectDropdown, MultiSelectOption } from './MultiSelectDropdown';

interface DashboardFiltersProps {
  users: User[];
  currentUser: User;
  selectedCoordenadorId: string;
  onSelectCoordenadorId: (id: string) => void;
  selectedExecutivoIds: string[];
  onSelectExecutivoIds: (ids: string[]) => void;
  selectedMonths: string[];
  onSelectMonths: (months: string[]) => void;
  onSaveData: () => void;
  onResetData: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  lastSavedAt?: string;
  canEdit: boolean;
  isSingleMode: boolean;
}

export function DashboardFilters({
  users,
  currentUser,
  selectedCoordenadorId,
  onSelectCoordenadorId,
  selectedExecutivoIds,
  onSelectExecutivoIds,
  selectedMonths,
  onSelectMonths,
  onSaveData,
  onResetData,
  hasUnsavedChanges,
  isSaving,
  saveSuccess,
  lastSavedAt,
  canEdit,
  isSingleMode,
}: DashboardFiltersProps) {
  const isExecutivo = currentUser.perfil === 'executivo';
  const coordenadores = users.filter(u => u.perfil === 'coordenador');

  // Filtrar executivos com base no coordenador selecionado, se houver
  const executivos = users.filter(u => {
    if (u.perfil !== 'executivo') return false;
    if (!selectedCoordenadorId || selectedCoordenadorId === 'all') return true;
    return u.coordenadorId === selectedCoordenadorId;
  });

  // Opções para o MultiSelect de Executivos(as)
  const executivoOptions: MultiSelectOption[] = executivos.map(e => ({
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

  return (
    <div className="bg-white rounded-xl border-2 border-[#EE2E24] p-4 md:p-5 shadow-lg space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-black uppercase text-[#EE2E24] tracking-wider flex items-center gap-2">
              <Sparkles size={16} />
              Filtros da Operação
            </h2>
            {!isSingleMode && (
              <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                <Layers size={12} />
                Visão Consolidada ({selectedExecutivoIds.length} exec. / {selectedMonths.length} meses)
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            Selecione um ou mais Executivos(as) (ou "TODOS") e Meses para acompanhar o desempenho individual ou consolidado
          </p>
        </div>

        {/* Botão de Salvar Indicadores */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {lastSavedAt && isSingleMode && (
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">
              Salvo em: {lastSavedAt}
            </span>
          )}

          {isSingleMode && (
            <button
              onClick={onResetData}
              title="Restaurar valores padrão"
              className="p-2 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          )}

          <button
            onClick={onSaveData}
            disabled={!canEdit || !isSingleMode || isSaving}
            title={
              !isSingleMode 
                ? 'Para salvar alterações nos indicadores, selecione apenas 1 executivo(a) e 1 mês' 
                : 'Salvar alterações deste executivo e mês'
            }
            className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-black flex items-center gap-2 shadow-md transition-all ${
              !isSingleMode
                ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-80'
                : saveSuccess
                ? 'bg-emerald-600 text-white cursor-pointer'
                : hasUnsavedChanges
                ? 'bg-[#EE2E24] hover:bg-[#c9241b] text-white animate-pulse cursor-pointer'
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
                <Layers size={16} />
                <span>MODO CONSOLIDADO</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isSaving ? 'SALVANDO...' : 'SALVAR CAMPOS'}</span>
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
              {coordenadores.find(c => c.id === currentUser.coordenadorId)?.nome || 'Coordenação Comercial Claro'}
            </div>
          ) : (
            <select
              value={selectedCoordenadorId}
              onChange={(e) => {
                const newCoord = e.target.value;
                onSelectCoordenadorId(newCoord);
                // Atualizar lista de executivos selecionados de acordo com o coordenador
                if (newCoord && newCoord !== 'all') {
                  const filtered = users.filter(u => u.perfil === 'executivo' && u.coordenadorId === newCoord);
                  onSelectExecutivoIds(filtered.map(u => u.id));
                } else {
                  const allExecs = users.filter(u => u.perfil === 'executivo');
                  onSelectExecutivoIds(allExecs.map(u => u.id));
                }
              }}
              className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-300 focus:border-[#EE2E24] focus:ring-1 focus:ring-[#EE2E24] rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-800 outline-none transition-colors"
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
                <span className="truncate">{currentUser.nome}</span>
                <span className="text-[9px] bg-[#00AEEF] text-white px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ml-2">
                  Seu Resultado
                </span>
              </div>
            </div>
          ) : (
            <MultiSelectDropdown
              id="filter-executivos-multiselect"
              label="Executivo(a)"
              icon={<Users size={14} className="text-[#00AEEF]" />}
              options={executivoOptions}
              selectedValues={selectedExecutivoIds}
              onChange={onSelectExecutivoIds}
              allOptionLabel="TODOS OS EXECUTIVOS(AS)"
              placeholder="Selecione executivos..."
              badgeColor="blue"
            />
          )}
        </div>

        {/* Filtro MultiSelect: Mês com seleção múltipla e TODOS */}
        <div>
          <MultiSelectDropdown
            id="filter-meses-multiselect"
            label="Mês de Referência"
            icon={<Calendar size={14} className="text-[#EE2E24]" />}
            options={monthOptions}
            selectedValues={selectedMonths}
            onChange={onSelectMonths}
            allOptionLabel="TODOS OS MESES (ANO COMPLETO)"
            placeholder="Selecione meses..."
            badgeColor="red"
          />
        </div>
      </div>
    </div>
  );
}
