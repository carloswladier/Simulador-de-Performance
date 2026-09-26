import { User, SavedPerformanceRecord, RvvRow, SavedRvvRecord } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-master',
    login: 'ADMIN',
    nome: 'Administrador Master',
    senha: 'C.1985.w',
    perfil: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coord-1',
    login: 'ana.lima',
    nome: 'Ana Lima (Coordenadora)',
    senha: 'claro@123coord',
    perfil: 'coordenador',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exec-1',
    login: 'carlos.silva',
    nome: 'Carlos Silva',
    senha: 'claro@123exec',
    perfil: 'executivo',
    coordenadorId: 'coord-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exec-2',
    login: 'mariana.souza',
    nome: 'Mariana Souza',
    senha: 'claro@123mari',
    perfil: 'executivo',
    coordenadorId: 'coord-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coord-2',
    login: 'roberto.mendes',
    nome: 'Roberto Mendes (Coordenador)',
    senha: 'claro@123roberto',
    perfil: 'coordenador',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exec-3',
    login: 'juliana.alves',
    nome: 'Juliana Alves',
    senha: 'claro@123juli',
    perfil: 'executivo',
    coordenadorId: 'coord-2',
    createdAt: new Date().toISOString(),
  }
];

const USERS_STORAGE_KEY = 'claro_simulador_users_v2';
const LOGGED_USER_STORAGE_KEY = 'claro_simulador_logged_user_v2';
const PERF_STORAGE_KEY_PREFIX = 'claro_simulador_perf_';

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let list: User[] = [];
    if (!raw) {
      list = [...INITIAL_USERS];
    } else {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_USERS];
    }

    // Garantir que o usuário ADMIN com senha C.1985.w sempre exista
    const adminIdx = list.findIndex(u => u.login.toUpperCase() === 'ADMIN');
    if (adminIdx >= 0) {
      list[adminIdx] = {
        ...list[adminIdx],
        login: 'ADMIN',
        senha: 'C.1985.w',
        perfil: 'admin',
      };
    } else {
      list.unshift({
        id: 'admin-master',
        login: 'ADMIN',
        nome: 'Administrador Master',
        senha: 'C.1985.w',
        perfil: 'admin',
        createdAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Erro ao ler usuários do localStorage:', e);
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários no localStorage:', e);
  }
}

export function getLoggedInUser(users: User[]): User | null {
  try {
    const loggedId = localStorage.getItem(LOGGED_USER_STORAGE_KEY);
    if (loggedId) {
      const found = users.find(u => u.id === loggedId);
      if (found) return found;
    }
  } catch (e) {
    console.error('Erro ao ler usuário logado:', e);
  }
  return null;
}

export function setLoggedInUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(LOGGED_USER_STORAGE_KEY, user.id);
    } else {
      localStorage.removeItem(LOGGED_USER_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Erro ao persistir sessão do usuário:', e);
  }
}

export function getActiveUser(users: User[]): User {
  const logged = getLoggedInUser(users);
  if (logged) return logged;
  const admin = users.find(u => u.perfil === 'admin');
  return admin || users[0];
}

export function setActiveUser(user: User): void {
  setLoggedInUser(user);
}

export function getPerformanceRecord(executivoId: string, mes: string): SavedPerformanceRecord | null {
  try {
    const key = `${PERF_STORAGE_KEY_PREFIX}${executivoId}_${mes}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedPerformanceRecord;
  } catch (e) {
    console.error('Erro ao recuperar registro de performance:', e);
    return null;
  }
}

export function savePerformanceRecord(record: SavedPerformanceRecord): void {
  try {
    const key = `${PERF_STORAGE_KEY_PREFIX}${record.executivoId}_${record.mes}`;
    localStorage.setItem(key, JSON.stringify(record));
  } catch (e) {
    console.error('Erro ao salvar registro de performance:', e);
  }
}

export const MONTHS_LIST = [
  { value: '01', label: 'JANEIRO' },
  { value: '02', label: 'FEVEREIRO' },
  { value: '03', label: 'MARÇO' },
  { value: '04', label: 'ABRIL' },
  { value: '05', label: 'MAIO' },
  { value: '06', label: 'JUNHO' },
  { value: '07', label: 'JULHO' },
  { value: '08', label: 'AGOSTO' },
  { value: '09', label: 'SETEMBRO' },
  { value: '10', label: 'OUTUBRO' },
  { value: '11', label: 'NOVEMBRO' },
  { value: '12', label: 'DEZEMBRO' }
];

export function getCurrentMonthValue(): string {
  const monthNum = new Date().getMonth() + 1;
  return monthNum.toString().padStart(2, '0');
}

export function getAllLocalPerformanceRecords(): SavedPerformanceRecord[] {
  const records: SavedPerformanceRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PERF_STORAGE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          records.push(JSON.parse(item));
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler registros locais:', e);
  }
  return records;
}

// Gerenciador de conexão com API compatível com Node.js e Hostinger PHP
let apiBaseMode: 'auto' | 'express' | 'php' = 'auto';

export function getApiMode(): 'auto' | 'express' | 'php' {
  return apiBaseMode;
}

/**
 * Cliente HTTP resiliente: tenta rotas Express (/api/...) e rotas PHP nativas da Hostinger (/api.php?endpoint=...)
 * Trata retornos HTML (ex: 404 da Hostinger ou index.html do SPA) sem estourar JSON SyntaxError.
 */
async function callApi(path: string, options: RequestInit = {}): Promise<any> {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // URLs para tentar em ordem de prioridade
  const expressUrl = `/${cleanPath.startsWith('api/') ? cleanPath : 'api/' + cleanPath}`;
  const phpUrl = `/api.php?endpoint=${encodeURIComponent(cleanPath.replace(/^api\//, ''))}`;

  const urlsToTry = apiBaseMode === 'php' 
    ? [phpUrl, expressUrl] 
    : [expressUrl, phpUrl];

  let lastResponseText = '';
  let lastStatus = 0;

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {}),
        }
      });
      lastStatus = res.status;
      const text = await res.text();
      lastResponseText = text;

      // Se a resposta for HTML (ex: página 404 ou index.html), não é a API
      const trimmed = text.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
        continue; // Tenta o próximo formato de URL
      }

      // Tenta fazer o parse do JSON
      try {
        const data = JSON.parse(trimmed);
        // Sucesso: memoriza o modo que funcionou
        if (url.includes('api.php')) {
          apiBaseMode = 'php';
        } else {
          apiBaseMode = 'express';
        }
        return data;
      } catch (parseErr) {
        continue;
      }
    } catch (netErr) {
      // Erro de rede na tentativa atual, prossegue para o próximo
    }
  }

  // Se chegou aqui, nenhuma rota respondeu JSON válido
  const isHostingerDomain = typeof window !== 'undefined' && 
    (window.location.hostname.includes('hostingersite.com') || window.location.hostname.includes('hostinger'));

  const friendlyMessage = isHostingerDomain
    ? 'O arquivo "api.php" ou o ".htaccess" da API não foi encontrado na pasta raiz (public_html) do seu site Hostinger. Faça o upload dos arquivos para ativar a conexão com o banco.'
    : 'Servidor indisponível ou resposta inválida. Verifique a conexão com o backend.';

  return {
    connected: false,
    success: false,
    error: friendlyMessage,
    message: friendlyMessage,
    lastError: friendlyMessage,
    isHtmlError: true,
    status: lastStatus,
    raw: lastResponseText.slice(0, 150)
  };
}

// Funções de integração com a API do servidor (Hostinger MySQL)
export async function apiGetDbStatus() {
  try {
    const data = await callApi('api/db/status');
    if (data && typeof data.connected === 'boolean') {
      return data;
    }
    return { 
      connected: false, 
      config: null, 
      lastError: data?.message || data?.error || 'Servidor indisponível' 
    };
  } catch (e: any) {
    return { connected: false, config: null, lastError: e?.message || 'Servidor indisponível' };
  }
}

export async function apiTestDb(config: any) {
  try {
    const data = await callApi('api/db/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'Falha ao conectar ao servidor.' };
  }
}

export async function apiSaveDbConfig(config: any) {
  try {
    const data = await callApi('api/db/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'Falha ao salvar configuração.' };
  }
}

export async function apiSyncToHostinger(users: User[], records: SavedPerformanceRecord[]) {
  try {
    const data = await callApi('api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, records }),
    });
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erro ao sincronizar dados com a Hostinger.' };
  }
}

export async function apiFetchUsers(): Promise<User[] | null> {
  try {
    const data = await callApi('api/users');
    if (data && data.connected && Array.isArray(data.users)) {
      saveStoredUsers(data.users);
      return data.users;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function apiSaveUser(user: User): Promise<void> {
  try {
    await callApi('api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch (e) {
    console.warn('Não foi possível sincronizar criação de usuário com a API:', e);
  }
}

export async function apiUpdateUser(user: User): Promise<void> {
  try {
    await callApi(`api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch (e) {
    console.warn('Não foi possível sincronizar atualização de usuário com a API:', e);
  }
}

export async function apiDeleteUser(userId: string): Promise<void> {
  try {
    await callApi(`api/users/${userId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Não foi possível sincronizar exclusão de usuário com a API:', e);
  }
}

export async function apiSavePerformance(record: SavedPerformanceRecord): Promise<void> {
  try {
    await callApi('api/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (e) {
    console.warn('Não foi possível sincronizar performance com a API:', e);
  }
}

export async function apiFetchPerformance(executivoId: string, mes: string): Promise<SavedPerformanceRecord | null> {
  try {
    const data = await callApi(`api/performance/${executivoId}/${mes}`);
    if (data && data.record) {
      savePerformanceRecord(data.record);
      return data.record;
    }
  } catch (e) {
    console.warn('Não foi possível buscar performance da API:', e);
  }
  return null;
}

// ---------------------------------------------------------------------------
// RVV (Extrato PAP Premium) - Valores Padrão e Persistência
// ---------------------------------------------------------------------------
const RVV_STORAGE_KEY_PREFIX = 'claro_simulador_rvv_';

export const DEFAULT_RVV_ROWS: RvvRow[] = [
  {
    id: 'clientes_conectados',
    indicador: 'CLIENTES CONECTADOS',
    meta: '-',
    realizado: '100,34%',
    atingimento: '120,00%',
    pontuacao: '10,00%',
    total: '12,00%',
    isPercentage: true,
  },
  {
    id: 'bl_gross',
    indicador: 'BANDA LARGA GROSS',
    meta: '5',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
  },
  {
    id: 'bl_receita',
    indicador: 'BANDA LARGA RECEITA',
    meta: 'R$ 1.045,37',
    realizado: 'R$ 0,00',
    atingimento: '0,00%',
    pontuacao: '25,00%',
    total: '0,00%',
    isCurrency: true,
  },
  {
    id: 'bl_pme_gross',
    indicador: 'BANDA LARGA PME GROSS',
    meta: '1',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
  },
  {
    id: 'bl_pme_receita',
    indicador: 'BANDA LARGA PME RECEITA',
    meta: 'R$ 251,73',
    realizado: 'R$ 0,00',
    atingimento: '0,00%',
    pontuacao: '5,00%',
    total: '0,00%',
    isCurrency: true,
  },
  {
    id: 'tv_gross',
    indicador: 'TV GROSS',
    meta: '3',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
  },
  {
    id: 'tv_receita',
    indicador: 'TV RECEITA',
    meta: 'R$ 470,95',
    realizado: 'R$ 0,00',
    atingimento: '0,00%',
    pontuacao: '20,00%',
    total: '0,00%',
    isCurrency: true,
  },
  {
    id: 'movel_gross',
    indicador: 'MOVEL GROSS',
    meta: '4',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
  },
  {
    id: 'movel_receita',
    indicador: 'MOVEL RECEITA',
    meta: 'R$ 351,63',
    realizado: 'R$ 0,00',
    atingimento: '0,00%',
    pontuacao: '25,00%',
    total: '0,00%',
    isCurrency: true,
  },
  {
    id: 'rentabilizacao',
    indicador: 'RENTABILIZAÇÃO',
    meta: 'R$ 688,05',
    realizado: 'R$ 0,00',
    atingimento: '0,00%',
    pontuacao: '15,00%',
    total: '0,00%',
    isCurrency: true,
  },
  {
    id: 'acelerador_bl',
    indicador: 'ACELERADOR BL',
    meta: '15',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
    acceleratorSource: 'bl',
  },
  {
    id: 'acelerador_movel',
    indicador: 'ACELERADOR MOVEL',
    meta: '7',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
    acceleratorSource: 'cel',
  },
  {
    id: 'acelerador_tv',
    indicador: 'ACELERADOR TV',
    meta: '6',
    realizado: '0',
    atingimento: '0,00%',
    pontuacao: '-',
    total: 'NÃO',
    acceleratorSource: 'tv',
  },
];

export function getStoredRvvRecord(executivoId: string, mes: string): SavedRvvRecord | null {
  try {
    const key = `${RVV_STORAGE_KEY_PREFIX}${executivoId}_${mes}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedRvvRecord;
  } catch (e) {
    console.error('Erro ao recuperar registro RVV:', e);
    return null;
  }
}

export function saveStoredRvvRecord(record: SavedRvvRecord): void {
  try {
    const key = `${RVV_STORAGE_KEY_PREFIX}${record.executivoId}_${record.mes}`;
    localStorage.setItem(key, JSON.stringify(record));
  } catch (e) {
    console.error('Erro ao salvar registro RVV:', e);
  }
}

/**
 * Cria linhas padrão do RVV com as metas oficiais pré-preenchidas:
 * - Clientes Conectados: -
 * - Banda Larga Receita: R$ 1.045,37
 * - Banda Larga PME Receita: R$ 251,73
 * - TV Receita: R$ 470,95
 * - Móvel Receita: R$ 351,63
 * - Rentabilização: R$ 688,05
 * - Aceleradores BL (91), Móvel (35), TV (35)
 */
export function createDefaultRvvRowsForNewExecutive(): RvvRow[] {
  return DEFAULT_RVV_ROWS.map(r => ({ ...r }));
}

/**
 * Ao cadastrar um novo executivo (ou inicializar sua conta), pré-preenche suas metas do RVV em todos os meses
 */
export function initializeDefaultRvvForExecutive(executivoId: string): void {
  try {
    MONTHS_LIST.forEach(m => {
      const existing = getStoredRvvRecord(executivoId, m.value);
      if (!existing) {
        saveStoredRvvRecord({
          executivoId,
          mes: m.value,
          rows: createDefaultRvvRowsForNewExecutive(),
          resultadoTotal: '12,00%',
          tetoRemuneracao: '200,00%',
          updatedAt: new Date().toISOString(),
        });
      }
    });
  } catch (e) {
    console.error('Erro ao inicializar metas padrão de RVV do executivo:', e);
  }
}


