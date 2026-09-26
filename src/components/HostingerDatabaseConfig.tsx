import { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Download,
  FileCode,
  Globe,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';
import { 
  apiGetDbStatus, 
  apiTestDb, 
  apiSaveDbConfig, 
  apiSyncToHostinger,
  getAllLocalPerformanceRecords 
} from '../utils/storage';
import {
  HOSTINGER_API_PHP_CONTENT,
  HOSTINGER_HTACCESS_CONTENT,
  downloadTextFile
} from '../utils/hostingerFiles';

const HOSTINGER_DRAFT_KEY = 'claro_hostinger_db_draft';

interface HostingerDatabaseConfigProps {
  users: User[];
  currentUser: User;
  onRefreshUsers: () => Promise<void>;
}

export function HostingerDatabaseConfig({
  users,
  currentUser,
  onRefreshUsers
}: HostingerDatabaseConfigProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [ssl, setSsl] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isHtmlError, setIsHtmlError] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPhp, setCopiedPhp] = useState(false);
  const [copiedHtaccess, setCopiedHtaccess] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [showCodeViewer, setShowCodeViewer] = useState<'php' | 'htaccess' | 'sql' | null>(null);

  // Detecta se está rodando em domínio da Hostinger
  const isHostingerDomain = typeof window !== 'undefined' && 
    (window.location.hostname.includes('hostingersite.com') || window.location.hostname.includes('hostinger'));

  // Salva rascunho dos campos localmente para não perder ao recarregar a tela
  const saveDraft = (newHost?: string, newPort?: string, newUser?: string, newDb?: string, newSsl?: boolean) => {
    try {
      const draft = {
        host: newHost ?? host,
        port: newPort ?? port,
        user: newUser ?? user,
        database: newDb ?? database,
        ssl: newSsl ?? ssl,
      };
      localStorage.setItem(HOSTINGER_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // ignore
    }
  };

  // Carregar status atual do banco ao montar
  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await apiGetDbStatus();
      setIsConnected(Boolean(data.connected));
      setLastError(data.lastError || null);
      setIsHtmlError(Boolean(data.isHtmlError));

      if (data.config && data.config.host) {
        setHost(data.config.host || '');
        setPort(String(data.config.port || '3306'));
        setUser(data.config.user || '');
        setDatabase(data.config.database || '');
        setSsl(Boolean(data.config.ssl));
      } else {
        // Se a API ainda não tiver config, recupera o draft digitado anteriormente pelo usuário
        const savedDraft = localStorage.getItem(HOSTINGER_DRAFT_KEY);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.host) setHost(parsed.host);
            if (parsed.port) setPort(parsed.port);
            if (parsed.user) setUser(parsed.user);
            if (parsed.database) setDatabase(parsed.database);
            if (typeof parsed.ssl === 'boolean') setSsl(parsed.ssl);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestConnection = async () => {
    setFeedback(null);
    if (!host.trim() || !user.trim() || !database.trim()) {
      setFeedback({
        type: 'error',
        message: 'Preencha os campos obrigatórios: Host, Usuário e Nome do Banco de Dados.'
      });
      return;
    }

    saveDraft();
    setIsTesting(true);
    try {
      const res = await apiTestDb({
        host: host.trim(),
        port: parseInt(port, 10) || 3306,
        user: user.trim(),
        password,
        database: database.trim(),
        ssl,
      });

      if (res.success) {
        setIsConnected(true);
        setLastError(null);
        setIsHtmlError(false);
        setFeedback({
          type: 'success',
          message: '✅ Conexão estabelecida com sucesso com o banco de dados da Hostinger!'
        });
      } else {
        if (res.isHtmlError) {
          setIsHtmlError(true);
          setShowDeployGuide(true);
        }
        setFeedback({
          type: 'error',
          message: `❌ Falha na conexão: ${res.message || res.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao testar conexão: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setFeedback(null);
    if (!host.trim() || !user.trim() || !database.trim()) {
      setFeedback({
        type: 'error',
        message: 'Preencha os campos obrigatórios: Host, Usuário e Nome do Banco de Dados.'
      });
      return;
    }

    saveDraft();
    setIsSaving(true);
    try {
      const res = await apiSaveDbConfig({
        host: host.trim(),
        port: parseInt(port, 10) || 3306,
        user: user.trim(),
        password,
        database: database.trim(),
        ssl,
      });

      if (res.success || res.connected) {
        setIsConnected(true);
        setLastError(null);
        setIsHtmlError(false);
        setFeedback({
          type: 'success',
          message: 'Configuração salva e banco Hostinger ativado com sucesso! As tabelas foram inicializadas.'
        });
        await onRefreshUsers();
      } else {
        setIsConnected(false);
        setLastError(res.message);
        if (res.isHtmlError) {
          setIsHtmlError(true);
          setShowDeployGuide(true);
        }
        setFeedback({
          type: 'error',
          message: `Não foi possível conectar: ${res.message || res.error}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao salvar: ${err.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAll = async () => {
    if (!isConnected) {
      setFeedback({
        type: 'error',
        message: 'Conecte-se primeiro ao banco da Hostinger antes de sincronizar.'
      });
      return;
    }

    setIsSyncing(true);
    try {
      const records = getAllLocalPerformanceRecords();
      const res = await apiSyncToHostinger(users, records);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Sincronização concluída: ${res.syncedUsers} usuários e ${res.syncedRecords} registros de metas gravados na Hostinger!`
        });
        await onRefreshUsers();
      } else {
        setFeedback({
          type: 'error',
          message: `Erro na sincronização: ${res.message}`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao sincronizar: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const sqlScript = `-- SCRIPT DE CRIAÇÃO MANUAL DAS TABELAS NO PHPMYADMIN (HOSTINGER)
-- O sistema cria automaticamente ao conectar, mas você pode executar se preferir:

CREATE TABLE IF NOT EXISTS claro_users (
  id VARCHAR(64) PRIMARY KEY,
  login VARCHAR(64) NOT NULL UNIQUE,
  nome VARCHAR(128) NOT NULL,
  senha VARCHAR(128) NOT NULL,
  perfil VARCHAR(32) NOT NULL,
  coordenador_id VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS claro_performance (
  id VARCHAR(128) PRIMARY KEY,
  executivo_id VARCHAR(64) NOT NULL,
  mes VARCHAR(16) NOT NULL,
  sales_json LONGTEXT NOT NULL,
  quality_json LONGTEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exec_mes (executivo_id, mes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const copyPhpToClipboard = () => {
    navigator.clipboard.writeText(HOSTINGER_API_PHP_CONTENT);
    setCopiedPhp(true);
    setTimeout(() => setCopiedPhp(false), 3000);
  };

  const copyHtaccessToClipboard = () => {
    navigator.clipboard.writeText(HOSTINGER_HTACCESS_CONTENT);
    setCopiedHtaccess(true);
    setTimeout(() => setCopiedHtaccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Status Principal */}
      <div className={`rounded-2xl p-5 md:p-6 border-2 shadow-lg transition-all ${
        isConnected 
          ? 'bg-emerald-50/70 border-emerald-500' 
          : lastError 
            ? 'bg-red-50/70 border-red-400' 
            : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 ${
              isConnected 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : lastError 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20' 
                  : 'bg-gray-800 text-white'
            }`}>
              <Database size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">
                  Banco de Dados Hostinger (MySQL)
                </h2>
                <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  isConnected 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {isConnected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {isConnected ? 'Conectado e Ativo' : 'Modo Local / Não Conectado'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isConnected 
                  ? `Os usuários e metas estão sendo salvos diretamente no banco da Hostinger (${database || 'MySQL'}).` 
                  : 'Os dados estão operando em memória/cache local. Configure os dados de acesso da Hostinger abaixo para persistência direta no seu site.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStatus}
              disabled={isLoadingStatus}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Atualizar status da conexão"
            >
              <RefreshCw size={14} className={isLoadingStatus ? 'animate-spin' : ''} />
              Checar Conexão
            </button>
          </div>
        </div>

        {/* Mensagem de Erro detalhada se houver */}
        {lastError && !isConnected && (
          <div className="mt-4 p-3.5 bg-red-100/90 border border-red-300 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <div className="leading-relaxed">
              <strong>Diagnóstico de Conexão:</strong> {lastError}
            </div>
          </div>
        )}
      </div>

      {/* CARD DE SOLUÇÃO EM DESTAQUE PARA HOSPEDAGEM WEB HOSTINGER */}
      {(isHostingerDomain || isHtmlError || !isConnected) && (
        <div className="bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-300/90 rounded-2xl p-5 md:p-6 shadow-md space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
                <Globe size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                  Ativação do Banco MySQL no Site da Hostinger
                  {isHostingerDomain && (
                    <span className="text-[10px] uppercase font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                      Ambiente Hostinger Detectado
                    </span>
                  )}
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  Em hospedagens compartilhadas da Hostinger, o backend opera através de <strong>PHP</strong>. Para que o botão de teste e gravação no banco funcione diretamente pelo navegador no seu site, os arquivos <code className="bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950 font-bold font-mono">api.php</code> e <code className="bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950 font-bold font-mono">.htaccess</code> precisam estar na pasta <strong>public_html</strong> do seu domínio.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeployGuide(!showDeployGuide)}
              className="text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {showDeployGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showDeployGuide ? 'Ocultar Guia' : 'Ver Passo a Passo'}
            </button>
          </div>

          {/* Botões de Download Direto com 1 clique */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => downloadTextFile('api.php', HOSTINGER_API_PHP_CONTENT)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              title="Baixar o arquivo api.php para colocar na pasta public_html da Hostinger"
            >
              <Download size={15} />
              Baixar api.php (Backend Hostinger)
            </button>

            <button
              type="button"
              onClick={() => downloadTextFile('.htaccess', HOSTINGER_HTACCESS_CONTENT)}
              className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-950 border border-amber-400 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title="Baixar o arquivo .htaccess para a pasta public_html da Hostinger"
            >
              <Download size={15} />
              Baixar .htaccess (Roteamento)
            </button>

            <button
              type="button"
              onClick={() => setShowCodeViewer(showCodeViewer === 'php' ? null : 'php')}
              className="px-3.5 py-2 text-xs font-bold text-amber-900 hover:text-amber-950 hover:bg-amber-100/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <FileCode size={14} />
              {showCodeViewer === 'php' ? 'Fechar Código PHP' : 'Visualizar Código PHP'}
            </button>
          </div>

          {/* Guia Passo a Passo Desdobrável */}
          {showDeployGuide && (
            <div className="mt-4 pt-4 border-t border-amber-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-amber-950">
              <div className="bg-white/80 p-4 rounded-xl border border-amber-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-gray-900">Baixe os 2 arquivos</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Clique nos botões acima para baixar o <strong>api.php</strong> e o <strong>.htaccess</strong> no seu computador.
                </p>
              </div>

              <div className="bg-white/80 p-4 rounded-xl border border-amber-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-gray-900">Suba no Gerenciador da Hostinger</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  No hPanel da Hostinger, abra o <strong>Gerenciador de Arquivos</strong>, vá na pasta <strong>public_html</strong> e faça o upload de <strong>api.php</strong> e <strong>.htaccess</strong> (junto com seu <code className="font-mono">index.html</code>).
                </p>
              </div>

              <div className="bg-white/80 p-4 rounded-xl border border-amber-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="font-bold text-gray-900">Preencha e Salve</h4>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  Preencha o formulário abaixo com os dados do seu banco MySQL da Hostinger e clique em <strong>Salvar e Conectar</strong>. O banco será ativado na hora!
                </p>
              </div>
            </div>
          )}

          {/* Visualizador de Código PHP caso o usuário prefira criar o arquivo manualmente */}
          {showCodeViewer === 'php' && (
            <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <FileCode size={14} />
                  Conteúdo do arquivo <code>api.php</code> (Copie e crie no Gerenciador de Arquivos da Hostinger):
                </span>
                <button
                  type="button"
                  onClick={copyPhpToClipboard}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {copiedPhp ? <Check size={13} /> : <Copy size={13} />}
                  {copiedPhp ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>
              <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-56 scrollbar-thin">
                {HOSTINGER_API_PHP_CONTENT}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Feedback contextual */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : feedback.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Grid Principal: Formulário + Guia Hostinger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Configuração */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-md space-y-5">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Server size={18} className="text-[#EE2E24]" />
              Parâmetros de Conexão Hostinger MySQL
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Obtenha estes dados no seu painel Hostinger (hPanel) em <strong>Bancos de Dados MySQL</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Host / Servidor MySQL *
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    saveDraft(e.target.value);
                  }}
                  placeholder="ex: srv1663.hstgr.io ou localhost"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all font-mono"
                />
                <span className="text-[10px] text-gray-400">Host de conexão fornecido no hPanel (ou "localhost" se o site estiver na Hostinger)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Porta
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value);
                    saveDraft(undefined, e.target.value);
                  }}
                  placeholder="3306"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all font-mono"
                />
                <span className="text-[10px] text-gray-400">Padrão: 3306</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Nome do Banco de Dados *
                </label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => {
                    setDatabase(e.target.value);
                    saveDraft(undefined, undefined, undefined, e.target.value);
                  }}
                  placeholder="ex: u123456789_claro"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Usuário do Banco *
                </label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => {
                    setUser(e.target.value);
                    saveDraft(undefined, undefined, e.target.value);
                  }}
                  placeholder="ex: u123456789_admin"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center justify-between">
                <span>Senha do Banco de Dados *</span>
                <span className="text-[10px] text-gray-400 font-normal">Armazenada com segurança no servidor</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ssl-checkbox"
                checked={ssl}
                onChange={(e) => {
                  setSsl(e.target.checked);
                  saveDraft(undefined, undefined, undefined, undefined, e.target.checked);
                }}
                className="w-4 h-4 text-[#EE2E24] rounded border-gray-300 focus:ring-[#EE2E24] cursor-pointer"
              />
              <label htmlFor="ssl-checkbox" className="text-xs text-gray-700 font-medium cursor-pointer">
                Habilitar Conexão Segura SSL (Recomendado se configurado na Hostinger)
              </label>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="px-4 py-2.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-600" />}
              {isTesting ? 'Testando Conexão...' : 'Testar Conexão'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving || isTesting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#EE2E24] hover:bg-[#D01B12] rounded-xl transition-all shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {isSaving ? 'Salvando...' : 'Salvar e Conectar'}
              </button>
            </div>
          </div>

          {/* Botão de Sincronização em Lote */}
          {isConnected && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw size={13} className="text-emerald-700" />
                  Sincronizar Dados Locais para a Hostinger
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Importa {users.length} usuários e todos os registros salvos do simulador para as tabelas da Hostinger.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
            </div>
          )}
        </div>

        {/* Guia Hostinger hPanel & Instruções */}
        <div className="lg:col-span-5 space-y-6">
          {/* Instruções do hPanel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Info size={16} className="text-blue-600" />
              Como liberar o acesso no painel da Hostinger
            </h3>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-[#EE2E24] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong>No hPanel da Hostinger:</strong> Vá até a seção <em>Bancos de Dados</em> &rarr; <em>Bancos de Dados MySQL</em> e anote o <strong>Nome do Banco</strong>, <strong>Usuário</strong> e <strong>Host</strong> (ou use <code className="bg-gray-100 px-1 rounded font-bold">localhost</code>).
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-[#EE2E24] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong>Habilitar MySQL Remoto (Crucial):</strong> No menu de Bancos de Dados, clique em <strong>MySQL Remoto</strong>. No campo <strong>Host (IP)</strong> digite <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[#EE2E24] font-bold">%</code> (permite conexão da aplicação) e selecione seu banco.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-100 text-[#EE2E24] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong>Salvar e Conectar:</strong> Digite a senha criada e clique em <em>Salvar e Conectar</em>. As tabelas necessárias (<code className="font-mono text-gray-800">claro_users</code> e <code className="font-mono text-gray-800">claro_performance</code>) são criadas automaticamente!
                </div>
              </div>
            </div>
          </div>

          {/* Script SQL das Tabelas (Opcional para rodar no phpMyAdmin) */}
          <div className="bg-gray-900 text-gray-200 rounded-2xl p-5 shadow-md space-y-3 border border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Script SQL (phpMyAdmin)
                </span>
              </div>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg transition-colors border border-gray-700 cursor-pointer"
              >
                {copiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copiedSql ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              O sistema cria as tabelas automaticamente. Se preferir rodar manualmente no phpMyAdmin da Hostinger, copie o SQL abaixo:
            </p>
            <pre className="p-3 bg-black/60 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-44 scrollbar-thin">
              {sqlScript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
