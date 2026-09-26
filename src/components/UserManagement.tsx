import { useState, type FormEvent } from 'react';
import { 
  User, 
  UserProfile 
} from '../types';
import { 
  UserPlus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  X,
  User as UserIcon,
  Crown,
  AlertTriangle
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser?: (user: User) => void;
}

export function UserManagement({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagementProps) {
  const isAdmin = currentUser.perfil === 'admin';
  const isCoordenador = currentUser.perfil === 'coordenador' || isAdmin;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [login, setLogin] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<UserProfile>('executivo');
  const [coordenadorId, setCoordenadorId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal de confirmação de exclusão (sem usar window.confirm que falha em iframe)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [cannotDeleteSelfAlert, setCannotDeleteSelfAlert] = useState(false);

  // Lista de coordenadores (exclui admin)
  const coordenadores = users.filter(u => u.perfil === 'coordenador');

  // Filtragem estrita de segurança:
  // Se o usuário conectado NÃO for o Admin Master, ele NÃO deve visualizar nem gerenciar os dados do Admin Master
  const visibleUsers = users.filter(u => {
    if (!isAdmin && (u.perfil === 'admin' || u.login.toUpperCase() === 'ADMIN')) {
      return false;
    }
    return true;
  });

  const openNewUserForm = () => {
    if (!isCoordenador) return;
    setEditingUserId(null);
    setLogin('');
    setNome('');
    setSenha('');
    setPerfil('executivo');
    setCoordenadorId(coordenadores[0]?.id || '');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const openEditUserForm = (user: User) => {
    if (!isCoordenador) return;
    if (!isAdmin && (user.perfil === 'admin' || user.login.toUpperCase() === 'ADMIN')) {
      setErrorMsg('Apenas o Administrador Master tem permissão para visualizar ou editar os dados do Admin Master.');
      return;
    }
    setEditingUserId(user.id);
    setLogin(user.login);
    setNome(user.nome);
    setSenha(user.senha);
    setPerfil(user.perfil);
    setCoordenadorId(user.coordenadorId || coordenadores[0]?.id || '');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!login.trim() || !nome.trim() || !senha.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (Login, Nome e Senha).');
      return;
    }

    // Verificar login duplicado
    const duplicate = users.find(
      u => u.login.toLowerCase() === login.trim().toLowerCase() && u.id !== editingUserId
    );
    if (duplicate) {
      setErrorMsg('Este login já está em uso por outro usuário. Escolha outro login.');
      return;
    }

    if (editingUserId) {
      const userToUpdate = users.find(u => u.id === editingUserId);
      if (userToUpdate) {
        if (!isAdmin && (userToUpdate.perfil === 'admin' || userToUpdate.login.toUpperCase() === 'ADMIN')) {
          setErrorMsg('Você não tem permissão para alterar os dados do Administrador Master.');
          return;
        }
        onUpdateUser({
          ...userToUpdate,
          login: login.trim(),
          nome: nome.trim(),
          senha: senha.trim(),
          perfil: isAdmin ? perfil : (userToUpdate.perfil === 'admin' ? 'admin' : perfil === 'admin' ? 'executivo' : perfil),
          coordenadorId: perfil === 'executivo' ? coordenadorId : undefined,
        });
        setSuccessMsg(`Usuário "${nome}" atualizado com sucesso!`);
      }
    } else {
      onAddUser({
        login: login.trim(),
        nome: nome.trim(),
        senha: senha.trim(),
        perfil: isAdmin ? perfil : (perfil === 'admin' ? 'executivo' : perfil),
        coordenadorId: perfil === 'executivo' ? coordenadorId : undefined,
      });
      setSuccessMsg(`Usuário "${nome}" cadastrado com sucesso!`);
    }

    setIsFormOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePromptDelete = (user: User) => {
    if (!isCoordenador) return;
    if (!isAdmin && (user.perfil === 'admin' || user.login.toUpperCase() === 'ADMIN')) {
      setErrorMsg('Você não tem permissão para excluir o Administrador Master.');
      return;
    }
    if (user.id === currentUser.id) {
      setCannotDeleteSelfAlert(true);
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    const removedNome = userToDelete.nome;
    onDeleteUser(userToDelete.id);
    setUserToDelete(null);
    setSuccessMsg(`Usuário "${removedNome}" removido com sucesso.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Informações da Sessão Ativa */}
      <div className="bg-white border-2 border-[#EE2E24] rounded-xl p-4 md:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isCoordenador ? 'bg-[#EE2E24] text-white' : 'bg-[#00AEEF] text-white'}`}>
            {isCoordenador ? <Crown size={24} /> : <UserIcon size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-gray-500">Usuário Conectado:</span>
              <span className={`text-[10px] md:text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                currentUser.perfil === 'admin' 
                  ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                  : currentUser.perfil === 'coordenador' 
                  ? 'bg-red-100 text-[#EE2E24] border border-red-200' 
                  : 'bg-blue-100 text-[#00AEEF] border border-blue-200'
              }`}>
                {currentUser.perfil === 'admin' ? 'ADMIN MASTER' : currentUser.perfil === 'coordenador' ? 'Coordenador(a)' : 'Executivo(a)'}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">{currentUser.nome}</h3>
            <p className="text-xs text-gray-500 font-mono">Login: @{currentUser.login}</p>
          </div>
        </div>
      </div>

      {/* Alerta informativo de Permissões */}
      {currentUser.perfil === 'admin' ? (
        <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-xl flex items-start gap-3 text-purple-900 text-xs md:text-sm shadow-sm">
          <ShieldCheck size={20} className="shrink-0 text-purple-600 mt-0.5" />
          <div>
            <p className="font-bold">Permissão de Administrador Master (ADMIN)</p>
            <p className="mt-0.5 opacity-90">
              Você possui acesso total irrestrito: visualiza e edita o desempenho de todos os executivos, gerencia todas as contas de usuários e configura o Banco de Dados Hostinger.
            </p>
          </div>
        </div>
      ) : isCoordenador ? (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3 text-emerald-900 text-xs md:text-sm shadow-sm">
          <ShieldCheck size={20} className="shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-bold">Permissão de Perfil Coordenador(a)</p>
            <p className="mt-0.5 opacity-90">
              Você possui permissão de acesso à gestão: cadastrar, editar e excluir usuários, além de monitorar o resultado de todos os executivos.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3 text-amber-800 text-xs md:text-sm shadow-sm">
          <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Permissão de Perfil Executivo(a)</p>
            <p className="mt-0.5 opacity-90">
              Você está conectado como perfil <strong>Executivo(a)</strong>. Seu acesso é restrito exclusivamente ao seu próprio desempenho na aba <strong>DASHBOARD</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Feedback de sucesso */}
      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cabeçalho da Lista de Usuários e Botão Novo Usuário */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-gray-200 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900">
            Usuários Cadastrados
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Gerenciamento de contas de Executivos(as) e Coordenadores(as) da operação Claro
          </p>
        </div>

        {isCoordenador && (
          <button
            onClick={openNewUserForm}
            className="bg-[#EE2E24] hover:bg-[#c9241b] text-white px-4 py-2.5 rounded-lg text-xs md:text-sm font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus size={16} />
            <span>CADASTRAR NOVO USUÁRIO</span>
          </button>
        )}
      </div>

      {/* Formulário Modal/Card para Cadastro ou Edição */}
      {isFormOpen && (
        <div className="bg-white border-2 border-[#EE2E24] rounded-xl p-5 md:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="text-base md:text-lg font-black uppercase text-[#EE2E24] flex items-center gap-2">
              {editingUserId ? <Edit3 size={18} /> : <UserPlus size={18} />}
              {editingUserId ? 'Editar Usuário' : 'Novo Cadastro de Usuário'}
            </h3>
            <button 
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Login */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Login de Acesso *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="ex: carlos.silva"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm font-mono font-medium focus:border-[#EE2E24] focus:bg-white outline-none"
                  required
                />
              </div>
            </div>

            {/* Campo Nome */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex: Carlos Silva"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm font-medium focus:border-[#EE2E24] focus:bg-white outline-none"
                required
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Senha *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 pr-10 text-xs md:text-sm font-mono font-medium focus:border-[#EE2E24] focus:bg-white outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 p-1 text-gray-500 hover:text-gray-800"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo Perfil */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Perfil de Acesso *
              </label>
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value as UserProfile)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:border-[#EE2E24] focus:bg-white outline-none"
              >
                {isAdmin && (
                  <option value="admin">Admin Master (Acesso Total ao Sistema)</option>
                )}
                <option value="coordenador">Coordenador(a) (Gestão de Usuários e Executivos(as))</option>
                <option value="executivo">Executivo(a) (Acompanhamento Individual)</option>
              </select>
            </div>

            {/* Coordenador Responsável (se perfil for executivo) */}
            {perfil === 'executivo' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Coordenador(a) Responsável
                </label>
                <select
                  value={coordenadorId}
                  onChange={(e) => setCoordenadorId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm font-bold text-gray-800 focus:border-[#EE2E24] focus:bg-white outline-none"
                >
                  <option value="">Selecione o coordenador responsável...</option>
                  {coordenadores.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#EE2E24] hover:bg-[#c9241b] text-white px-6 py-2 rounded-lg text-xs md:text-sm font-black shadow-md cursor-pointer"
              >
                {editingUserId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-[10px] md:text-xs font-black uppercase text-gray-600 tracking-wider">
                <th className="p-3 md:p-4">Nome do Usuário</th>
                <th className="p-3 md:p-4">Login</th>
                <th className="p-3 md:p-4">Perfil</th>
                <th className="p-3 md:p-4">Coordenador Vinculado</th>
                <th className="p-3 md:p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
              {visibleUsers.map((user) => {
                const coord = user.coordenadorId ? users.find(u => u.id === user.coordenadorId) : null;
                const isSelected = user.id === currentUser.id;
                const isMasterAdmin = user.login.toUpperCase() === 'ADMIN' || user.perfil === 'admin';

                return (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-red-50/40 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}
                  >
                    <td className="p-3 md:p-4 font-bold text-gray-900 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                        user.perfil === 'admin' ? 'bg-purple-700' : user.perfil === 'coordenador' ? 'bg-[#EE2E24]' : 'bg-[#00AEEF]'
                      }`}>
                        {user.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{user.nome}</div>
                        {isSelected && (
                          <span className="text-[9px] text-amber-700 font-bold uppercase bg-amber-100 px-1.5 py-0.2 rounded">Você</span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 md:p-4 font-mono text-gray-600">
                      @{user.login}
                    </td>

                    <td className="p-3 md:p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                        user.perfil === 'admin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : user.perfil === 'coordenador' 
                          ? 'bg-red-100 text-[#EE2E24] border border-red-200' 
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {user.perfil === 'admin' ? <Crown size={12} className="text-purple-700" /> : user.perfil === 'coordenador' ? <Crown size={12} /> : <UserCheck size={12} />}
                        {user.perfil === 'admin' ? 'ADMIN MASTER' : user.perfil === 'coordenador' ? 'Coordenador(a)' : 'Executivo(a)'}
                      </span>
                    </td>

                    <td className="p-3 md:p-4 text-gray-600">
                      {user.perfil === 'admin' ? (
                        <span className="text-purple-600 font-bold text-xs">Acesso Total</span>
                      ) : user.perfil === 'coordenador' ? (
                        <span className="text-gray-400 italic text-xs">Gestão</span>
                      ) : (
                        coord ? coord.nome : <span className="text-gray-400 italic text-xs">Não atribuído</span>
                      )}
                    </td>

                    <td className="p-3 md:p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCoordenador ? (
                          <>
                            <button
                              onClick={() => openEditUserForm(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Usuário"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              id={`btn-delete-user-${user.id}`}
                              onClick={() => handlePromptDelete(user)}
                              disabled={user.id === currentUser.id || isMasterAdmin}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.id === currentUser.id || isMasterAdmin
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-red-600 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={
                                isMasterAdmin
                                  ? 'Usuário ADMIN Master protegido contra exclusão'
                                  : user.id === currentUser.id 
                                  ? 'Não pode excluir usuário conectado' 
                                  : 'Excluir Usuário'
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Somente leitura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão (In-App, sem bloqueio de iframe) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            id="modal-confirm-delete"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <AlertTriangle size={28} />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-black text-gray-900">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Tem certeza que deseja remover o usuário <strong className="text-gray-900">{userToDelete.nome}</strong> (<span className="font-mono text-gray-700">@{userToDelete.login}</span>)?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  ⚠️ Esta ação removerá o acesso do usuário ao sistema e ao banco de dados.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-delete-user"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={16} />
                Sim, Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta caso tente excluir o usuário atualmente conectado */}
      {cannotDeleteSelfAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-2 border-amber-500 text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">Ação Não Permitida</h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Você não pode excluir o usuário que está conectado no momento. Troque de usuário no simulador de sessão acima antes de remover esta conta.
            </p>
            <button
              type="button"
              id="btn-close-self-delete-alert"
              onClick={() => setCannotDeleteSelfAlert(false)}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
