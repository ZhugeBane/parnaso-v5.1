import React, { useState, useEffect } from 'react';
import { User, UserReward, ClaimedReward } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getUserRewards,
  saveUserReward,
  deleteUserReward,
  getClaimedRewards,
  claimReward,
  deleteClaimedReward,
  wordsToDiamonds
} from '../services/rewardService';
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
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('🎁');
  const [formCategory, setFormCategory] = useState<'lazer' | 'comida' | 'compras' | 'descanso' | 'outro'>('outro');

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

  // Purple Diamond calculations
  const totalEarnedDiamonds = wordsToDiamonds(totalWords);
  const totalSpentDiamonds = claims.reduce((acc, c) => acc + (c.cost || 0), 0);
  const balanceDiamonds = Math.max(0, totalEarnedDiamonds - totalSpentDiamonds);

  // Open modal for new reward
  const handleOpenCreateModal = () => {
    setEditingReward(null);
    setFormTitle('');
    setFormCost(30);
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

  // Redeem reward
  const handleConfirmRedeem = async () => {
    if (!rewardToRedeem) return;
    if (balanceDiamonds < rewardToRedeem.cost) return;

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-purple-500/20">
        {/* Decorative sparkles background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>{t('rewards.ruleBadge')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>{t('rewards.title')}</span>
              <span className="text-purple-300">💎</span>
            </h2>

            <p className="text-sm sm:text-base text-purple-200/90 leading-relaxed">
              {t('rewards.subtitle')}
            </p>
          </div>

          {/* Balance Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full lg:w-auto">
            {/* Available Balance (Main) */}
            <div className="bg-white/10 backdrop-blur-md border border-purple-300/30 p-4 rounded-2xl flex flex-col justify-center min-w-[170px] shadow-inner">
              <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {t('rewards.availableBalance')}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                  {balanceDiamonds.toLocaleString('pt-BR')}
                </span>
                <span className="text-xl">💎</span>
              </div>
              <span className="text-[11px] text-purple-300/80 mt-1">
                ≈ {(balanceDiamonds * 2).toLocaleString('pt-BR')} {t('dashboard.words')}
              </span>
            </div>

            {/* Total Earned */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col justify-center min-w-[140px]">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {t('rewards.totalEarned')}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-purple-100">
                  {totalEarnedDiamonds.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm">💎</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {totalWords.toLocaleString('pt-BR')} {t('dashboard.words')}
              </span>
            </div>

            {/* Total Spent */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl flex flex-col justify-center min-w-[140px]">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                {t('rewards.totalSpent')}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-rose-300">
                  {totalSpentDiamonds.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm">💎</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {claims.length} {claims.length === 1 ? 'resgate' : 'resgates'}
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
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
            {[
              { id: 'all', label: t('rewards.allCategories'), icon: '✨' },
              { id: 'comida', label: t('rewards.categoryFood'), icon: '🍕' },
              { id: 'lazer', label: t('rewards.categoryLeisure'), icon: '🎬' },
              { id: 'descanso', label: t('rewards.categoryRest'), icon: '☕' },
              { id: 'compras', label: t('rewards.categoryShopping'), icon: '🛍️' },
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
                const canAfford = balanceDiamonds >= reward.cost;
                const deficitDiamonds = reward.cost - balanceDiamonds;
                const deficitWords = deficitDiamonds * 2;

                return (
                  <div
                    key={reward.id}
                    className="relative group bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Row: Icon, Category & Actions */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-200 flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform">
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
                          <span className="text-xl font-black text-purple-700">
                            {reward.cost}
                          </span>
                          <span className="text-sm">💎</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({(reward.cost * 2).toLocaleString('pt-BR')} palavras)
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
                            className="w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Gift className="w-4 h-4" />
                            <span>{t('rewards.redeem')}</span>
                          </button>
                        ) : (
                          <div className="w-full py-2.5 px-3 rounded-2xl text-xs font-semibold bg-slate-100 text-slate-500 text-center border border-slate-200/80">
                            <span>
                              {t('rewards.insufficientBalance')
                                .replace('{diamonds}', String(deficitDiamonds))
                                .replace('{words}', deficitWords.toLocaleString('pt-BR'))}
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
                <div className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-full">
                  Total gasto: {totalSpentDiamonds} 💎
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {claims.map(claim => {
                  return (
                    <div
                      key={claim.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl flex-shrink-0">
                          🎉
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm sm:text-base">
                              {claim.rewardTitle}
                            </span>
                            <span className="text-xs font-extrabold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                              -{claim.cost} 💎
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

              {/* Cost in Diamonds */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('rewards.rewardCost')} *
                  </label>
                  <span className="text-xs text-purple-700 font-bold">
                    = {(formCost * 2).toLocaleString('pt-BR')} palavras
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
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900 text-base"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                    💎
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-br from-purple-700 to-indigo-700 text-white p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 text-3xl flex items-center justify-center shadow-inner mb-3">
                {rewardToRedeem.icon || '🎁'}
              </div>
              <h3 className="text-xl font-black">
                {rewardToRedeem.title}
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                Custo de {rewardToRedeem.cost} diamantes roxos ({(rewardToRedeem.cost * 2).toLocaleString('pt-BR')} palavras)
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl text-xs text-purple-900 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Seu saldo atual:</span>
                  <span className="font-bold">{balanceDiamonds} 💎</span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Custo deste mimo:</span>
                  <span className="font-bold">-{rewardToRedeem.cost} 💎</span>
                </div>
                <div className="pt-2 border-t border-purple-200/80 flex justify-between font-bold text-slate-800 text-sm">
                  <span>Saldo restante:</span>
                  <span className="text-purple-700">{(balanceDiamonds - rewardToRedeem.cost)} 💎</span>
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
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>{t('rewards.confirmRedeem')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CELEBRATION / SUCCESS */}
      {celebrationReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-purple-300 text-center p-6 sm:p-8 relative">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-4xl shadow-xl shadow-purple-400/30 mb-4 animate-bounce">
              🎉
            </div>

            <h3 className="text-2xl font-black text-slate-900">
              {t('rewards.congratulations')}
            </h3>

            <p className="text-base font-bold text-purple-700 mt-2">
              {t('rewards.redeemedSuccess').replace('{title}', celebrationReward.rewardTitle)}
            </p>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {t('rewards.spentMessage').replace('{diamonds}', String(celebrationReward.cost))}
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
