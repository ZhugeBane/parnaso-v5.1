import React, { useState, useEffect } from 'react';
import { User, UserReward, ClaimedReward, WritingSession } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getUserRewards,
  saveUserReward,
  deleteUserReward,
  getClaimedRewards,
  claimReward,
  deleteClaimedReward,
  wordsToScriptus,
  calculateTotalKronus,
  calculateBalances,
  HESTIUS_MAX,
  HESTIUS_REFILL_SCRIPTUS_COST,
  HESTIUS_REFILL_KRONUS_COST
} from '../services/rewardService';
import { updateUserHestius } from '../services/authService';
import { ScriptusIcon, KronusIcon, HestiusIcon, HestiusOrbs } from './ui/GamificationIcons';
import { Card } from './ui/Card';
import {
  Gift,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  History,
  CheckCircle2,
  X,
  ShoppingBag,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';

interface RewardsShopProps {
  user: User;
  totalWords: number;
  sessions?: WritingSession[];
  onUpdateUser?: (updated: Partial<User>) => void;
  readOnly?: boolean;
}

const PRESET_ICONS = [
  '🍕', '☕', '🍦', '🍔', '🍣', '🍰', '🍷',
  '🎬', '🎮', '🎧', '📚', '🏖️', '✈️', '💆',
  '🛍️', '🎁', '⭐', '💎', '🎉', '🏆'
];

export const RewardsShop: React.FC<RewardsShopProps> = ({
  user,
  totalWords,
  sessions = [],
  onUpdateUser,
  readOnly = false
}) => {
  const { t } = useLanguage();
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [claims, setClaims] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'history'>('shop');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<UserReward | null>(null);
  const [rewardToRedeem, setRewardToRedeem] = useState<UserReward | null>(null);
  const [redeemNotes, setRedeemNotes] = useState('');
  const [celebrationReward, setCelebrationReward] = useState<ClaimedReward | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCost, setFormCost] = useState<number>(30);
  const [formCurrency, setFormCurrency] = useState<'scriptus' | 'kronus'>('scriptus');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('🎁');
  const [formCategory, setFormCategory] = useState<'lazer' | 'comida' | 'compras' | 'descanso' | 'outro' | 'hestius'>('outro');

  // Load rewards and claims on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [userRewards, userClaims] = await Promise.all([
          getUserRewards(user.id),
          getClaimedRewards(user.id)
        ]);
        if (isMounted) {
          setRewards(userRewards);
          setClaims(userClaims);
        }
      } catch (err) {
        console.error('Erro ao carregar recompensas:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  // Gamification Balances (Scriptus, Kronus, Hestius)
  const balances = calculateBalances(totalWords, sessions, claims);
  const currentHestius = Math.max(0, Math.min(HESTIUS_MAX, user.hestiusCount ?? 1));

  // Open modal for new reward
  const handleOpenCreateModal = () => {
    setEditingReward(null);
    setFormTitle('');
    setFormCost(30);
    setFormCurrency('scriptus');
    setFormDescription('');
    setFormIcon('🎁');
    setFormCategory('outro');
    setIsModalOpen(true);
  };

  // Open modal to edit existing reward
  const handleOpenEditModal = (reward: UserReward) => {
    setEditingReward(reward);
    setFormTitle(reward.title);
    setFormCost(reward.cost);
    setFormCurrency(reward.currency || 'scriptus');
    setFormDescription(reward.description || '');
    setFormIcon(reward.icon || '🎁');
    setFormCategory(reward.category || 'outro');
    setIsModalOpen(true);
  };

  // Save reward (create or edit)
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      const saved = await saveUserReward(user.id, {
        id: editingReward?.id,
        title: formTitle,
        cost: formCost,
        currency: formCurrency,
        description: formDescription,
        icon: formIcon,
        category: formCategory,
        createdAt: editingReward?.createdAt
      });

      if (editingReward) {
        setRewards(prev => prev.map(r => (r.id === saved.id ? saved : r)));
      } else {
        setRewards(prev => [saved, ...prev]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar recompensa:', err);
    }
  };

  // Delete reward
  const handleDeleteReward = async (reward: UserReward) => {
    const confirmMsg = t('rewards.deleteConfirm');
    if (window.confirm(confirmMsg)) {
      try {
        await deleteUserReward(user.id, reward.id);
        setRewards(prev => prev.filter(r => r.id !== reward.id));
      } catch (err) {
        console.error('Erro ao excluir recompensa:', err);
      }
    }
  };

  // Recharge Hestius from Shop
  const handleRechargeHestius = async (currency: 'scriptus' | 'kronus') => {
    if (currentHestius >= HESTIUS_MAX) {
      alert(t('rewards.hestiusAlreadyMax'));
      return;
    }
    const cost = currency === 'scriptus' ? HESTIUS_REFILL_SCRIPTUS_COST : HESTIUS_REFILL_KRONUS_COST;
    const balance = currency === 'scriptus' ? balances.balanceScriptus : balances.balanceKronus;
    if (balance < cost) {
      alert(t('rewards.insufficientBalance')
        .replace('{amount}', String(cost - balance))
        .replace('{currency}', currency === 'scriptus' ? 'Scriptus 🪶' : 'Kronus ⏳'));
      return;
    }

    try {
      const claim = await claimReward(user.id, {
        id: 'hestius-refill',
        title: 'Recarga do Altar de Hestius (Guardião da Chama)',
        cost,
        currency,
        icon: '🔥',
        category: 'hestius',
        description: 'Carga de proteção para manter a chama de sequência acesa'
      }, 'Recarga de proteção do altar de ofensiva');

      const newCount = Math.min(HESTIUS_MAX, currentHestius + 1);
      await updateUserHestius(user.id, newCount);
      onUpdateUser?.({ hestiusCount: newCount });

      setClaims(prev => [claim, ...prev]);
      setCelebrationReward(claim);
    } catch (err) {
      console.error('Erro ao recarregar Hestius:', err);
    }
  };

  // Redeem reward
  const handleConfirmRedeem = async () => {
    if (!rewardToRedeem) return;
    const cur = rewardToRedeem.currency || 'scriptus';
    const balance = cur === 'kronus' ? balances.balanceKronus : balances.balanceScriptus;
    if (balance < rewardToRedeem.cost) return;

    try {
      const claim = await claimReward(user.id, rewardToRedeem, redeemNotes);
      setClaims(prev => [claim, ...prev]);
      setCelebrationReward(claim);
      setRewardToRedeem(null);
      setRedeemNotes('');
    } catch (err) {
      console.error('Erro ao resgatar recompensa:', err);
    }
  };

  // Delete a claim from history (refunds diamonds)
  const handleDeleteClaim = async (claimId: string) => {
    const confirmMsg = t('rewards.deleteClaimConfirm');
    if (window.confirm(confirmMsg)) {
      try {
        await deleteClaimedReward(user.id, claimId);
        setClaims(prev => prev.filter(c => c.id !== claimId));
      } catch (err) {
        console.error('Erro ao excluir resgate:', err);
      }
    }
  };

  // Filter rewards by category
  const filteredRewards = rewards.filter(r => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero / Balance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-purple-500/20">
        {/* Decorative sparkles background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>{t('rewards.ruleBadge')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>{t('rewards.title')}</span>
            </h2>

            <p className="text-sm sm:text-base text-purple-200/90 leading-relaxed">
              {t('rewards.subtitle')}
            </p>
          </div>

          {/* Balance Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto">
            {/* Scriptus Balance */}
            <div className="bg-gradient-to-br from-violet-900/40 to-purple-950/60 backdrop-blur-md border border-violet-400/30 p-4 rounded-2xl flex flex-col justify-center min-w-[160px] shadow-inner">
              <span className="text-[11px] font-bold text-violet-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
                <span>{t('rewards.scriptusBalance')}</span>
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  {balances.balanceScriptus.toLocaleString('pt-BR')}
                </span>
                <ScriptusIcon className="w-5 h-5 text-violet-300" />
              </div>
              <span className="text-[11px] text-violet-300/80 mt-1">
                ≈ {(balances.balanceScriptus * 2).toLocaleString('pt-BR')} {t('dashboard.words')}
              </span>
            </div>

            {/* Kronus Balance */}
            <div className="bg-gradient-to-br from-amber-900/40 to-orange-950/60 backdrop-blur-md border border-amber-400/30 p-4 rounded-2xl flex flex-col justify-center min-w-[160px] shadow-inner">
              <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>{t('rewards.kronusBalance')}</span>
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  {balances.balanceKronus.toLocaleString('pt-BR')}
                </span>
                <KronusIcon className="w-5 h-5 text-amber-300" />
              </div>
              <span className="text-[11px] text-amber-300/80 mt-1">
                ≈ {(balances.balanceKronus * 2).toLocaleString('pt-BR')} min de escrita
              </span>
            </div>

            {/* Hestius Status */}
            <div className="bg-gradient-to-br from-rose-900/40 to-red-950/60 backdrop-blur-md border border-rose-400/30 p-4 rounded-2xl flex flex-col justify-center min-w-[160px] shadow-inner">
              <span className="text-[11px] font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                <HestiusIcon className="w-3.5 h-3.5 text-rose-300" />
                <span>{t('rewards.hestiusStatus')}</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  {currentHestius}/3
                </span>
                <HestiusOrbs count={currentHestius} size="sm" />
              </div>
              <span className="text-[11px] text-rose-300/80 mt-1 font-semibold">
                {currentHestius > 0 ? 'Proteção Ativa' : 'Altar Desprotegido'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-tabs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Tabs: Loja vs Histórico */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('shop')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'shop'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Loja de Mimos ({rewards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t('rewards.history')} ({claims.length})</span>
          </button>
        </div>

        {/* Action Button: Create New Reward */}
        {!readOnly && activeSubTab === 'shop' && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('rewards.newReward')}</span>
          </button>
        )}
      </div>

      {/* VIEW: SHOP ITEMS */}
      {activeSubTab === 'shop' && (
        <div className="space-y-6">
          {/* Featured Hero Card: Altar de Hestius (Guardião da Chama) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-rose-950 to-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-lg text-white">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold">
                  <HestiusIcon className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Guardião da Chama • Altar de Proteção de Ofensiva</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
                  <span>Altar de Hestius</span>
                  <span className="text-xs font-extrabold text-amber-300 bg-amber-900/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    {currentHestius}/3 Cargas
                  </span>
                </h3>

                <p className="text-xs sm:text-sm text-amber-100/80 leading-relaxed">
                  {t('rewards.hestiusRechargeDesc')}
                </p>

                {/* Flame Orbs Display */}
                <div className="pt-2 flex items-center gap-3">
                  <HestiusOrbs count={currentHestius} size="md" />
                  <span className="text-xs font-bold text-amber-200">
                    {currentHestius === 3
                      ? '🔥 Capacidade máxima atingida (3/3) - Você está 100% blindado!'
                      : currentHestius > 0
                        ? `🔥 Você tem ${currentHestius} carga(s) de tolerância protegidas.`
                        : '⚠️ Altar apagado! Escreva 2 dias ou recarregue para proteger sua sequência.'}
                  </span>
                </div>
              </div>

              {/* Recharge Actions */}
              {!readOnly && (
                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0">
                  <button
                    type="button"
                    disabled={currentHestius >= HESTIUS_MAX || balances.balanceScriptus < HESTIUS_REFILL_SCRIPTUS_COST}
                    onClick={() => handleRechargeHestius('scriptus')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-between gap-3 shadow-md cursor-pointer ${
                      currentHestius >= HESTIUS_MAX
                        ? 'bg-white/10 text-slate-400 border border-white/10 cursor-not-allowed opacity-60'
                        : balances.balanceScriptus >= HESTIUS_REFILL_SCRIPTUS_COST
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-violet-500/30 hover:scale-[1.02]'
                          : 'bg-violet-950/40 text-violet-300/60 border border-violet-500/20 cursor-not-allowed'
                    }`}
                    title="Recarregar +1 carga de Hestius usando 100 Scriptus"
                  >
                    <span className="flex items-center gap-2">
                      <ScriptusIcon className="w-4 h-4 text-violet-300" />
                      <span>Recarregar +1 Carga</span>
                    </span>
                    <span className="font-extrabold px-2 py-0.5 rounded-lg bg-black/20 text-violet-100">
                      100 🪶
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={currentHestius >= HESTIUS_MAX || balances.balanceKronus < HESTIUS_REFILL_KRONUS_COST}
                    onClick={() => handleRechargeHestius('kronus')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-between gap-3 shadow-md cursor-pointer ${
                      currentHestius >= HESTIUS_MAX
                        ? 'bg-white/10 text-slate-400 border border-white/10 cursor-not-allowed opacity-60'
                        : balances.balanceKronus >= HESTIUS_REFILL_KRONUS_COST
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-500/30 hover:scale-[1.02]'
                          : 'bg-amber-950/40 text-amber-300/60 border border-amber-500/20 cursor-not-allowed'
                    }`}
                    title="Recarregar +1 carga de Hestius usando 50 Kronus"
                  >
                    <span className="flex items-center gap-2">
                      <KronusIcon className="w-4 h-4 text-amber-300" />
                      <span>Recarregar +1 Carga</span>
                    </span>
                    <span className="font-extrabold px-2 py-0.5 rounded-lg bg-black/20 text-amber-100">
                      50 ⏳
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
            {[
              { id: 'all', label: t('rewards.allCategories'), icon: '✨' },
              { id: 'comida', label: t('rewards.categoryFood'), icon: '🍕' },
              { id: 'lazer', label: t('rewards.categoryLeisure'), icon: '🎬' },
              { id: 'descanso', label: t('rewards.categoryRest'), icon: '☕' },
              { id: 'compras', label: t('rewards.categoryShopping'), icon: '🛍️' },
              { id: 'hestius', label: 'Hestius (Proteção)', icon: '🔥' },
              { id: 'outro', label: t('rewards.categoryOther'), icon: '🎁' }
            ].map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid of Custom Rewards */}
          {filteredRewards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards.map(reward => {
                const isKronus = reward.currency === 'kronus';
                const available = isKronus ? balances.balanceKronus : balances.balanceScriptus;
                const canAfford = available >= reward.cost;
                const deficit = reward.cost - available;

                return (
                  <div
                    key={reward.id}
                    className="relative group bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Row: Icon, Category & Actions */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform ${
                          isKronus
                            ? 'bg-gradient-to-br from-amber-100 to-orange-50 border border-amber-200'
                            : 'bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-200'
                        }`}>
                          {reward.icon || '🎁'}
                        </div>

                        <div className="flex items-center gap-1">
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(reward)}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
                                title={t('rewards.editReward')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReward(reward)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-purple-900 transition-colors line-clamp-2">
                        {reward.title}
                      </h3>

                      {reward.description ? (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                          {reward.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-1.5">Sem descrição</p>
                      )}
                    </div>

                    {/* Bottom Area: Cost & Redeem Button */}
                    <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                      {/* Cost Info Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Custo:</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xl font-black ${isKronus ? 'text-amber-700' : 'text-purple-700'}`}>
                            {reward.cost}
                          </span>
                          {isKronus ? (
                            <KronusIcon className="w-4 h-4 text-amber-600" />
                          ) : (
                            <ScriptusIcon className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isKronus
                              ? `(${(reward.cost * 2).toLocaleString('pt-BR')} min de escrita)`
                              : `(${(reward.cost * 2).toLocaleString('pt-BR')} palavras)`}
                          </span>
                        </div>
                      </div>

                      {/* Redeem CTA */}
                      {!readOnly && (
                        canAfford ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRewardToRedeem(reward);
                              setRedeemNotes('');
                            }}
                            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer ${
                              isKronus
                                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/25'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
                            }`}
                          >
                            <Gift className="w-4 h-4" />
                            <span>{t('rewards.redeem')}</span>
                          </button>
                        ) : (
                          <div className="w-full py-2.5 px-3 rounded-2xl text-xs font-semibold bg-slate-100 text-slate-500 text-center border border-slate-200/80">
                            <span>
                              {t('rewards.insufficientBalance')
                                .replace('{amount}', String(deficit))
                                .replace('{currency}', isKronus ? 'Kronus ⏳' : 'Scriptus 🪶')}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 text-purple-500 flex items-center justify-center text-3xl mb-4">
                💎
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t('rewards.emptyShop')}</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                {t('rewards.emptyShopHint')}
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('rewards.newReward')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: REDEMPTION HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          {claims.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    <span>{t('rewards.history')}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Histórico de momentos que você celebrou sua dedicação
                  </p>
                </div>
                <div className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-full flex items-center gap-2 flex-wrap">
                  <span>Total gasto:</span>
                  <span className="text-violet-700 font-extrabold">{balances.totalSpentScriptus} 🪶</span>
                  <span>•</span>
                  <span className="text-amber-700 font-extrabold">{balances.totalSpentKronus} ⏳</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {claims.map(claim => {
                  const isKronus = claim.currency === 'kronus';
                  return (
                    <div
                      key={claim.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          isKronus ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {claim.rewardId === 'hestius-refill' ? '🔥' : '🎉'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm sm:text-base">
                              {claim.rewardTitle}
                            </span>
                            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                              isKronus
                                ? 'text-amber-800 bg-amber-100/80 border border-amber-200/60'
                                : 'text-purple-800 bg-purple-100/80 border border-purple-200/60'
                            }`}>
                              -{claim.cost} {isKronus ? 'Kronus ⏳' : 'Scriptus 🪶'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>{t('rewards.claimedAt')}:</span>
                            <span className="font-medium text-slate-600">
                              {new Date(claim.claimedAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {claim.notes && (
                            <div className="mt-2 text-xs text-slate-600 bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/80 italic">
                              "{claim.notes}"
                            </div>
                          )}
                        </div>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClaim(claim.id)}
                          className="self-end sm:self-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Remover resgate (estorna os diamantes)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 text-purple-500 flex items-center justify-center text-3xl mb-4">
                📜
              </div>
              <h3 className="text-lg font-bold text-slate-800">{t('rewards.emptyHistory')}</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                {t('rewards.emptyHistoryHint')}
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('shop')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explorar Loja de Mimos</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT REWARD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg">
                  🎁
                </div>
                <h3 className="text-lg font-extrabold">
                  {editingReward ? t('rewards.editReward') : t('rewards.newReward')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="p-6 space-y-4">
              {/* Icon presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('rewards.selectIcon')}
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  {PRESET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        formIcon === icon
                          ? 'bg-purple-600 text-white scale-110 shadow-sm'
                          : 'bg-white hover:bg-slate-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('rewards.rewardTitle')} *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('rewards.rewardTitlePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-800 text-sm"
                />
              </div>

              {/* Currency Selector (Scriptus vs Kronus) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('rewards.selectCurrency')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormCurrency('scriptus')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formCurrency === 'scriptus'
                        ? 'bg-violet-50 text-violet-900 border-violet-400 ring-2 ring-violet-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ScriptusIcon className="w-4 h-4 text-violet-600" />
                    <span>Scriptus (Palavras 🪶)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCurrency('kronus')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formCurrency === 'kronus'
                        ? 'bg-amber-50 text-amber-900 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <KronusIcon className="w-4 h-4 text-amber-600" />
                    <span>Kronus (Tempo ⏳)</span>
                  </button>
                </div>
              </div>

              {/* Cost in selected currency */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {formCurrency === 'kronus' ? t('rewards.rewardCostKronus') : t('rewards.rewardCostScriptus')} *
                  </label>
                  <span className={`text-xs font-bold ${formCurrency === 'kronus' ? 'text-amber-700' : 'text-purple-700'}`}>
                    {formCurrency === 'kronus'
                      ? `= ${(formCost * 2).toLocaleString('pt-BR')} minutos de escrita`
                      : `= ${(formCost * 2).toLocaleString('pt-BR')} palavras`}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 font-bold text-base ${
                      formCurrency === 'kronus'
                        ? 'text-amber-900 focus:ring-amber-500'
                        : 'text-purple-900 focus:ring-purple-500'
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {formCurrency === 'kronus' ? (
                      <KronusIcon className="w-5 h-5 text-amber-600" />
                    ) : (
                      <ScriptusIcon className="w-5 h-5 text-violet-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('rewards.selectCategory')}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-800 text-sm bg-white"
                >
                  <option value="comida">{t('rewards.categoryFood')}</option>
                  <option value="lazer">{t('rewards.categoryLeisure')}</option>
                  <option value="descanso">{t('rewards.categoryRest')}</option>
                  <option value="compras">{t('rewards.categoryShopping')}</option>
                  <option value="hestius">Hestius (Proteção)</option>
                  <option value="outro">{t('rewards.categoryOther')}</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('rewards.rewardDescription')}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('rewards.rewardDescriptionPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 text-sm"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM REDEMPTION */}
      {rewardToRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {(() => {
              const cur = rewardToRedeem.currency || 'scriptus';
              const isKronus = cur === 'kronus';
              const curBalance = isKronus ? balances.balanceKronus : balances.balanceScriptus;
              const remaining = curBalance - rewardToRedeem.cost;
              const curName = isKronus ? 'Kronus ⏳' : 'Scriptus 🪶';

              return (
                <>
                  <div className={`p-6 text-center text-white ${
                    isKronus
                      ? 'bg-gradient-to-br from-amber-600 to-orange-700'
                      : 'bg-gradient-to-br from-purple-700 to-indigo-700'
                  }`}>
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 text-3xl flex items-center justify-center shadow-inner mb-3">
                      {rewardToRedeem.icon || '🎁'}
                    </div>
                    <h3 className="text-xl font-black">
                      {rewardToRedeem.title}
                    </h3>
                    <p className="text-xs text-white/80 mt-1">
                      Custo: {rewardToRedeem.cost} {curName} ({isKronus ? `${(rewardToRedeem.cost * 2).toLocaleString('pt-BR')} min de escrita` : `${(rewardToRedeem.cost * 2).toLocaleString('pt-BR')} palavras`})
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className={`border p-4 rounded-2xl text-xs space-y-2 ${
                      isKronus
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-purple-50/70 border-purple-200 text-purple-950'
                    }`}>
                      <div className="flex justify-between font-semibold">
                        <span>Seu saldo atual:</span>
                        <span className="font-bold">{curBalance.toLocaleString('pt-BR')} {curName}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-rose-600">
                        <span>Custo deste mimo:</span>
                        <span className="font-bold">-{rewardToRedeem.cost} {curName}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/80 flex justify-between font-bold text-slate-800 text-sm">
                        <span>Saldo restante:</span>
                        <span className={isKronus ? 'text-amber-700' : 'text-purple-700'}>
                          {remaining.toLocaleString('pt-BR')} {curName}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('rewards.notesPrompt')}
                      </label>
                      <textarea
                        rows={2}
                        value={redeemNotes}
                        onChange={(e) => setRedeemNotes(e.target.value)}
                        placeholder="Ex: Pedi sushi para comemorar o fim do capítulo 5!"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRewardToRedeem(null)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRedeem}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                          isKronus
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/25'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
                        }`}
                      >
                        <Gift className="w-4 h-4" />
                        <span>{t('rewards.confirmRedeem')}</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: CELEBRATION / SUCCESS */}
      {celebrationReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-purple-300 text-center p-6 sm:p-8 relative">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-4xl shadow-xl shadow-purple-400/30 mb-4 animate-bounce">
              {celebrationReward.rewardId === 'hestius-refill' ? '🔥' : '🎉'}
            </div>

            <h3 className="text-2xl font-black text-slate-900">
              {t('rewards.congratulations')}
            </h3>

            <p className="text-base font-bold text-purple-700 mt-2">
              {t('rewards.redeemedSuccess').replace('{title}', celebrationReward.rewardTitle)}
            </p>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {t('rewards.spentMessage')
                .replace('{amount}', String(celebrationReward.cost))
                .replace('{currency}', celebrationReward.currency === 'kronus' ? 'Kronus ⏳' : 'Scriptus 🪶')}
              {' '}Aproveite cada segundo deste momento merecido!
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCelebrationReward(null)}
                className="w-full py-3 px-6 rounded-2xl font-black text-sm bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all cursor-pointer"
              >
                Aproveitar Mimo! 💜
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
