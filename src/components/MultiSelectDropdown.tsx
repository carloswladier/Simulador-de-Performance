import { useState, useRef, useEffect, ReactNode } from 'react';
import { Check, ChevronDown, Search, X, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface MultiSelectDropdownProps {
  id: string;
  label: string;
  icon?: ReactNode;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allOptionLabel?: string;
  disabled?: boolean;
  disabledMessage?: string;
  badgeColor?: 'red' | 'blue' | 'emerald';
}

export function MultiSelectDropdown({
  id,
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder = 'Selecione...',
  allOptionLabel = 'TODOS',
  disabled = false,
  disabledMessage,
  badgeColor = 'blue',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar ao pressionar ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allSelected = options.length > 0 && selectedValues.length === options.length;
  const isIndeterminate = selectedValues.length > 0 && selectedValues.length < options.length;

  const handleToggleAll = () => {
    if (allSelected) {
      // Se todos estiverem selecionados, desseleciona tudo (ou deixa vazio)
      onChange([]);
    } else {
      // Seleciona todos os itens disponíveis
      onChange(options.map(o => o.value));
    }
  };

  const handleToggleItem = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  // Filtragem pela busca
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Formatação do texto do botão principal
  const getButtonSummary = () => {
    if (options.length === 0) {
      return <span className="text-gray-400 italic">Nenhum item disponível</span>;
    }
    if (selectedValues.length === 0) {
      return <span className="text-gray-400 italic">Nenhum selecionado ({placeholder})</span>;
    }
    if (allSelected) {
      return (
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-black text-gray-900 truncate">{allOptionLabel}</span>
          <span className="text-[10px] bg-red-100 text-[#EE2E24] font-black px-1.5 py-0.5 rounded shrink-0">
            {options.length} de {options.length}
          </span>
        </div>
      );
    }
    if (selectedValues.length === 1) {
      const found = options.find(o => o.value === selectedValues[0]);
      return (
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-gray-900 truncate">{found?.label || selectedValues[0]}</span>
          {found?.sublabel && <span className="text-gray-400 text-xs truncate">({found.sublabel})</span>}
        </div>
      );
    }
    // Múltiplos selecionados (mas não todos)
    const firstTwo = selectedValues
      .map(val => options.find(o => o.value === val)?.label)
      .filter(Boolean)
      .slice(0, 2)
      .join(', ');

    return (
      <div className="flex items-center gap-1.5 truncate">
        <span className="text-xs bg-[#00AEEF] text-white font-black px-1.5 py-0.5 rounded shrink-0">
          {selectedValues.length} sel.
        </span>
        <span className="font-bold text-gray-800 text-xs truncate" title={firstTwo}>
          {firstTwo}{selectedValues.length > 2 ? '...' : ''}
        </span>
      </div>
    );
  };

  if (disabled) {
    return (
      <div className="w-full">
        <label className="block text-[10px] md:text-xs font-black uppercase text-gray-600 mb-1 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-600 flex items-center justify-between">
          <span className="truncate">{disabledMessage || getButtonSummary()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label 
          htmlFor={id} 
          className="text-[10px] md:text-xs font-black uppercase text-gray-600 flex items-center gap-1.5 cursor-pointer"
          onClick={() => setIsOpen(prev => !prev)}
        >
          {icon}
          {label}
        </label>
        {selectedValues.length > 0 && (
          <span className="text-[10px] font-bold text-gray-500">
            {selectedValues.length} de {options.length}
          </span>
        )}
      </div>

      {/* Botão Gatilho / Trigger */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full bg-gray-50 hover:bg-gray-100/80 border rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-left flex items-center justify-between gap-2 transition-all outline-none cursor-pointer ${
          isOpen 
            ? 'border-[#EE2E24] ring-2 ring-[#EE2E24]/20 bg-white' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="truncate flex-grow">
          {getButtonSummary()}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[#EE2E24]' : ''}`} 
        />
      </button>

      {/* Painel Dropdown Flutuante */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-[#EE2E24] rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col min-w-[260px]"
        >
          {/* Campo de Busca se houver mais de 5 itens */}
          {options.length > 5 && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar opções..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#EE2E24]"
                autoFocus
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Ações Rápidas: Todos / Limpar */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 pt-0.5 px-1">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-800 hover:text-[#EE2E24] transition-colors cursor-pointer"
            >
              {allSelected ? (
                <CheckSquare size={16} className="text-[#EE2E24]" />
              ) : isIndeterminate ? (
                <div className="w-4 h-4 rounded bg-[#EE2E24]/20 border border-[#EE2E24] flex items-center justify-center text-[#EE2E24]">
                  <div className="w-2 h-0.5 bg-[#EE2E24] rounded" />
                </div>
              ) : (
                <Square size={16} className="text-gray-400" />
              )}
              <span>{allOptionLabel}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[10px] font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              >
                Marcar Todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-800 hover:underline cursor-pointer"
              >
                Desmarcar
              </button>
            </div>
          </div>

          {/* Lista com Rolagem */}
          <div className="overflow-y-auto max-h-52 space-y-1 pr-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400">
                Nenhum item encontrado
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleToggleItem(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer text-xs ${
                      isSelected 
                        ? 'bg-red-50/80 font-bold text-gray-900 border border-red-200' 
                        : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                        isSelected 
                          ? 'bg-[#EE2E24] border-[#EE2E24] text-white' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="truncate">
                        <div className="truncate text-xs">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-gray-400 font-normal truncate">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-gray-200 text-gray-700 shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé com botão Concluir */}
          <div className="border-t border-gray-100 pt-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-gray-500">
              {selectedValues.length} de {options.length} selecionados
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-[#EE2E24] hover:bg-[#c9241b] text-white text-xs font-black px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
