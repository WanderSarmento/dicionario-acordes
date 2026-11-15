import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  Trophy,
  Medal,
  Award,
  LogIn,
  LogOut,
  Edit3,
  Check,
  Trash2,
  Flame,
  Target,
  CloudCheck,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { ADMIN_EMAIL, type StudentRankingEntry } from '../firebase';

const AVATAR_EMOJIS = ['🎹', '🎼', '🎵', '🎸', '🎧', '🎺', '🎻', '🌟', '🦊', '🦉'];

interface StudentRankingBoardProps {
  user: User | null;
  authLoading: boolean;
  rankings: StudentRankingEntry[];
  rankingsLoading: boolean;
  rankingError: string | null;
  isSyncing: boolean;
  localCompletedCount: number;
  totalQuestionsCount: number;
  localTotalHits: number;
  localAttemptsCount: number;
  localBestStreak: number;
  studentNickname: string;
  studentEmoji: string;
  onUpdateProfile: (newName: string, newEmoji: string) => Promise<void>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onDeleteEntry: (uid: string) => Promise<void>;
}

export const StudentRankingBoard: React.FC<StudentRankingBoardProps> = ({
  user,
  authLoading,
  rankings,
  rankingsLoading,
  rankingError,
  isSyncing,
  localCompletedCount,
  totalQuestionsCount,
  localTotalHits,
  localAttemptsCount,
  localBestStreak,
  studentNickname,
  studentEmoji,
  onUpdateProfile,
  onSignIn,
  onSignOut,
  onSyncNow,
  onDeleteEntry,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(studentNickname);
  const [draftEmoji, setDraftEmoji] = useState(studentEmoji);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(studentNickname);
  }, [studentNickname]);

  useEffect(() => {
    setDraftEmoji(studentEmoji);
  }, [studentEmoji]);

  const localAccuracy =
    localAttemptsCount > 0 ? Math.round((localTotalHits / localAttemptsCount) * 100) : 0;

  const myPositionIndex = user ? rankings.findIndex((r) => r.uid === user.uid) : -1;
  const isAdmin = Boolean(user?.email === ADMIN_EMAIL && user?.emailVerified);

  const handleLoginClick = async () => {
    setLocalError(null);
    setAuthActionLoading(true);
    try {
      await onSignIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setLocalError('Não foi possível conectar com o Google agora. Tente novamente.');
      }
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim();
    if (cleaned.length < 2) {
      setLocalError('Digite um nome ou apelido com pelo menos 2 letras.');
      return;
    }
    setLocalError(null);
    setProfileSaving(true);
    try {
      await onUpdateProfile(cleaned, draftEmoji);
      setIsEditingProfile(false);
    } catch {
      setLocalError('Erro ao salvar seu perfil no ranking. Verifique sua conexão.');
    } finally {
      setProfileSaving(false);
    }
  };

  const topThree = rankings.slice(0, 3);

  return (
    <div className="bg-[#fefdfb] border-2 border-[#e8dfd1] rounded-3xl p-4 sm:p-7 shadow-md space-y-5 notebook-paper">
      {/* Cabeçalho do Ranking */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8dfd1]">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-300 text-amber-950 font-black text-xs px-2.5 py-0.5 rounded-md rotate-[-1deg] mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>MURAL DE HONRA DA TURMA</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1e3a8a]">
            Ranking de Acertos dos Alunos
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Compare seu desempenho nas 20 missões práticas por quantidade de acertos, precisão (%) e sequência!
          </p>
        </div>

        {/* Cartão de Identificação / Login Google */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {authLoading ? (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500">
              Verificando conta...
            </div>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-300 px-3 py-1.5 rounded-2xl">
                <span className="text-lg">{studentEmoji}</span>
                <div className="leading-tight">
                  <div className="text-xs font-black text-emerald-950 flex items-center gap-1">
                    <span>{studentNickname}</span>
                    {isAdmin && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-black"
                        title="Administrador / Professor"
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Prof
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CloudCheck className="w-3 h-3" />
                        <span>
                          {myPositionIndex >= 0
                            ? `${myPositionIndex + 1}º lugar no ranking`
                            : 'Conectado ao mural'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingProfile((v) => !v)}
                className="px-2.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-xs cursor-pointer flex items-center gap-1 transition-all"
                title="Alterar nome e avatar no ranking"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>

              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="px-2.5 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border border-sky-300 font-bold text-xs cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
                title="Atualizar minha pontuação no mural"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs cursor-pointer flex items-center gap-1 transition-all"
                title="Sair da conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLoginClick}
              disabled={authActionLoading}
              className="px-4 py-2.5 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-extrabold text-xs shadow-sm cursor-pointer flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>
                {authActionLoading
                  ? 'Conectando...'
                  : 'Entrar com Google para participar 🏆'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Edição do Perfil do Aluno no Mural */}
      {user && isEditingProfile && (
        <form
          onSubmit={handleSaveProfile}
          className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Personalize seu perfil no Ranking da Turma
            </span>
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Nome ou Apelido no Mural (máx. 40 caracteres)
              </label>
              <input
                type="text"
                value={draftName}
                maxLength={40}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex: Lucas • Turma Manhã"
                className="w-full px-3 py-2 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-500 outline-none text-sm font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Escolha seu Ícone
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {AVATAR_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setDraftEmoji(em)}
                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border-2 cursor-pointer transition-all ${
                      draftEmoji === em
                        ? 'bg-amber-300 border-slate-900 scale-110'
                        : 'bg-white border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{profileSaving ? 'Salvando...' : 'Salvar no Ranking'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Desempenho Pessoal Atual do Aluno */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-emerald-800">
              Seus Acertos
            </div>
            <div className="text-sm sm:text-lg font-black text-emerald-950">
              {localCompletedCount} / {totalQuestionsCount}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-sky-50 border-2 border-sky-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-200 text-sky-900 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-sky-800">
              Precisão
            </div>
            <div className="text-sm sm:text-lg font-black text-sky-950">
              {localAccuracy}%
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-bold text-amber-800">
              Melhor Seq.
            </div>
            <div className="text-sm sm:text-lg font-black text-amber-950">
              {localBestStreak} 🔥
            </div>
          </div>
        </div>
      </div>

      {/* Mensagens de Erro / Aviso */}
      {(localError || rankingError) && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
          {localError || rankingError}
        </div>
      )}

      {/* Pódio Top 3 */}
      {!rankingsLoading && topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {topThree.map((entry, idx) => {
            const isMe = user?.uid === entry.uid;
            const podiumConfig = [
              {
                medal: '🥇',
                label: '1º Lugar',
                bg: 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-50',
                border: 'border-amber-400',
                badge: 'bg-amber-400 text-amber-950',
              },
              {
                medal: '🥈',
                label: '2º Lugar',
                bg: 'bg-gradient-to-br from-slate-100 via-white to-slate-50',
                border: 'border-slate-300',
                badge: 'bg-slate-300 text-slate-900',
              },
              {
                medal: '🥉',
                label: '3º Lugar',
                bg: 'bg-gradient-to-br from-orange-100 via-amber-50 to-white',
                border: 'border-orange-300',
                badge: 'bg-orange-300 text-orange-950',
              },
            ][idx];

            return (
              <div
                key={entry.uid}
                className={`p-3.5 rounded-2xl border-2 ${podiumConfig.bg} ${podiumConfig.border} ${
                  isMe ? 'ring-2 ring-[#1e3a8a]' : ''
                } flex flex-col justify-between gap-2 shadow-xs`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md ${podiumConfig.badge}`}
                  >
                    {podiumConfig.medal} {podiumConfig.label}
                  </span>
                  {isMe && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#1e3a8a] text-white">
                      Você
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center text-xl shadow-2xs shrink-0">
                    {entry.avatarEmoji}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-slate-900 truncate">
                      {entry.displayName}
                    </div>
                    <div className="text-[11px] font-bold text-slate-600">
                      {entry.correctCount}/{totalQuestionsCount} missões • {entry.accuracy}% precisão
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista Completa do Ranking */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 px-1">
          <span className="flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-amber-600" />
            Classificação Geral ({rankings.length} {rankings.length === 1 ? 'aluno' : 'alunos'})
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            Critério: Acertos ➔ Precisão % ➔ Sequência
          </span>
        </div>

        {rankingsLoading ? (
          <div className="p-6 text-center rounded-2xl bg-[#fcfaf5] border-2 border-[#e2d8c7] text-xs font-bold text-slate-500">
            Carregando placar dos alunos...
          </div>
        ) : rankings.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-[#fcfaf5] border-2 border-dashed border-[#d9ccb6] space-y-2">
            <div className="text-2xl">🏆</div>
            <div className="font-black text-sm text-slate-800">
              O mural está esperando o primeiro campeão!
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Entre com sua conta Google acima e responda às missões práticas para registrar sua pontuação no ranking oficial da turma.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {rankings.map((entry, idx) => {
              const isMe = user?.uid === entry.uid;
              const pct = Math.round((entry.correctCount / totalQuestionsCount) * 100);
              const canDelete = Boolean(user && (isMe || isAdmin));

              return (
                <div
                  key={entry.uid}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                    isMe
                      ? 'bg-amber-50 border-amber-400 shadow-xs'
                      : 'bg-white border-[#e6dccb]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                              ? 'bg-orange-300 text-orange-950'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {idx + 1}º
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-[#fcfaf5] border border-[#e2d8c7] flex items-center justify-center text-base shrink-0">
                      {entry.avatarEmoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {entry.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#1e3a8a] text-white shrink-0">
                            Você
                          </span>
                        )}
                      </div>

                      <div className="w-full max-w-[180px] h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-xs sm:text-sm text-emerald-800">
                        {entry.correctCount}/{totalQuestionsCount} acertos
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {entry.accuracy}% precisão • {entry.bestStreak}🔥
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.uid)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title={
                          isMe
                            ? 'Remover minha pontuação do mural'
                            : 'Moderação: remover registro do mural'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
