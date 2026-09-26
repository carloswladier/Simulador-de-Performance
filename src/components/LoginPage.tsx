import { useState, type FormEvent } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';
import { User } from '../types';

interface LoginPageProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export function LoginPage({ users, onLoginSuccess }: LoginPageProps) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanLogin = loginInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanLogin || !cleanPass) {
      setErrorMsg('Por favor, informe seu login e senha.');
      return;
    }

    setIsLoading(true);

    // Procurar usuário (case-insensitive para o login)
    const found = users.find(
      u => u.login.toLowerCase() === cleanLogin.toLowerCase() && u.senha === cleanPass
    );

    setTimeout(() => {
      setIsLoading(false);
      if (found) {
        onLoginSuccess(found);
      } else {
        setErrorMsg('Usuário ou senha incorretos. Verifique as credenciais e tente novamente.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header de Identidade Claro */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#EE2E24] text-white px-3 py-1 rounded-md text-xs font-black tracking-widest uppercase shadow-sm">
            Claro
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase">
            Simulador de Performance
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Acesso Restrito • Gestão de Vendas e Qualidade
          </p>
        </div>

        {/* Card Principal de Login */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#EE2E24] flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Autenticação de Usuário</h2>
              <p className="text-xs text-gray-500">Entre com seu login institucional e senha</p>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Login */}
            <div className="space-y-1.5">
              <label 
                htmlFor="input-login"
                className="block text-xs font-black uppercase tracking-wider text-gray-700"
              >
                Usuário / Login
              </label>
              <div className="relative">
                <input
                  id="input-login"
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Ex: ADMIN ou seu login"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all"
                />
                <UserIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label 
                htmlFor="input-password"
                className="block text-xs font-black uppercase tracking-wider text-gray-700"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#EE2E24] focus:ring-2 focus:ring-[#EE2E24]/20 outline-none transition-all font-mono"
                />
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#EE2E24] hover:bg-[#D01B12] active:bg-[#B3130B] text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Rodapé institucional */}
        <div className="text-center text-[11px] text-gray-400">
          Claro S.A. • Sistema de Simulação e Gestão de Metas Comerciais
        </div>
      </div>
    </div>
  );
}
