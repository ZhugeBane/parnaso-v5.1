import React, { useState, useRef, useEffect } from 'react';
import { User, PublishedWork, PurchaseLink } from '../types';
import { updateAuthorProfile } from '../services/authService';
import { resizeImageToBase64 } from '../utils/imageProcessor';
import { sanitizeText } from '../utils/cryptoUtils';
import {
  X,
  MapPin,
  Mail,
  Instagram,
  Phone,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ShoppingCart,
  Check,
  Camera,
  Globe,
  Share2
} from 'lucide-react';

interface AuthorProfileModalProps {
  user: User;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCurrentUser?: (updatedUser: User) => void;
}

export const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({
  user: initialUser,
  currentUser,
  isOpen,
  onClose,
  onUpdateCurrentUser
}) => {
  const isOwnProfile = currentUser.id === initialUser.id;
  const [profileUser, setProfileUser] = useState<User>(initialUser);

  // Sync state if user prop changes
  useEffect(() => {
    setProfileUser(initialUser);
  }, [initialUser]);

  // Profile Edit Mode
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState(profileUser.name || '');
  const [editBio, setEditBio] = useState(profileUser.bio || '');
  const [editLocation, setEditLocation] = useState(profileUser.location || '');
  const [editContactEmail, setEditContactEmail] = useState(profileUser.contactEmail || '');
  const [editInstagram, setEditInstagram] = useState(profileUser.instagram || '');
  const [editWhatsapp, setEditWhatsapp] = useState(profileUser.whatsapp || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSuccessToast, setInfoSuccessToast] = useState(false);

  // Email copy toast
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Photo update
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Book Modal (Add / Edit)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookSynopsis, setBookSynopsis] = useState('');
  const [bookCoverBase64, setBookCoverBase64] = useState<string>('');
  const [bookLinks, setBookLinks] = useState<PurchaseLink[]>([
    { id: `link_${Date.now()}`, storeName: 'Amazon', url: '' }
  ]);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const bookCoverInputRef = useRef<HTMLInputElement>(null);

  // Expanded synopses toggle for cards
  const [expandedSynopsisIds, setExpandedSynopsisIds] = useState<Record<string, boolean>>({});

  // Reset form when opening edit info
  const handleOpenEditInfo = () => {
    setEditName(profileUser.name || '');
    setEditBio(profileUser.bio || '');
    setEditLocation(profileUser.location || '');
    setEditContactEmail(profileUser.contactEmail || '');
    setEditInstagram(profileUser.instagram || '');
    setEditWhatsapp(profileUser.whatsapp || '');
    setIsEditingInfo(true);
  };

  // Save Author Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setIsSavingInfo(true);
      const cleanData = {
        name: sanitizeText(editName, 80),
        bio: sanitizeText(editBio, 250),
        location: sanitizeText(editLocation, 100),
        contactEmail: sanitizeText(editContactEmail, 120),
        instagram: sanitizeText(editInstagram, 100),
        whatsapp: sanitizeText(editWhatsapp, 50)
      };

      await updateAuthorProfile(currentUser.id, cleanData);

      const updated: User = {
        ...profileUser,
        ...cleanData
      };

      setProfileUser(updated);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updated);
      }

      setIsEditingInfo(false);
      setInfoSuccessToast(true);
      setTimeout(() => setInfoSuccessToast(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar informações do autor:', err);
      alert('Não foi possível salvar as informações. Tente novamente.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUpdatingAvatar(true);
      const base64 = await resizeImageToBase64(file, 200, 200, 0.7);
      await updateAuthorProfile(currentUser.id, { photoBase64: base64 });

      const updated: User = {
        ...profileUser,
        photoBase64: base64,
        photoURL: base64
      };

      setProfileUser(updated);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updated);
      }
    } catch (err) {
      console.error('Erro ao atualizar foto de perfil:', err);
      alert('Não foi possível atualizar a foto. Escolha outra imagem.');
    } finally {
      setIsUpdatingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Copy Email to clipboard
  const handleCopyEmail = (emailToCopy: string) => {
    navigator.clipboard?.writeText(emailToCopy).catch(() => {});
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Clean social URLs
  const getInstagramUrl = (handleOrUrl: string) => {
    let clean = handleOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('@')) clean = clean.slice(1);
    return `https://instagram.com/${clean}`;
  };

  const getWhatsappUrl = (phoneOrUrl: string) => {
    let clean = phoneOrUrl.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    const digits = clean.replace(/\D/g, '');
    if (!digits) return '';
    const fullNumber = digits.length <= 11 && !digits.startsWith('55') ? `55${digits}` : digits;
    return `https://wa.me/${fullNumber}`;
  };

  // --- Book Operations ---
  const handleOpenAddBook = () => {
    setEditingBookId(null);
    setBookTitle('');
    setBookSynopsis('');
    setBookCoverBase64('');
    setBookLinks([{ id: `link_${Date.now()}`, storeName: 'Amazon', url: '' }]);
    setBookError(null);
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (work: PublishedWork) => {
    setEditingBookId(work.id);
    setBookTitle(work.title);
    setBookSynopsis(work.synopsis);
    setBookCoverBase64(work.coverBase64 || work.coverUrl || '');
    setBookLinks(
      work.links?.length
        ? work.links.map(l => ({ ...l, id: l.id || `link_${Math.random()}` }))
        : [{ id: `link_${Date.now()}`, storeName: 'Amazon', url: '' }]
    );
    setBookError(null);
    setIsBookModalOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Proporção de capa de livro 2:3 (300x450px) em JPEG qualidade 0.75 (~25KB-45KB)
      const base64 = await resizeImageToBase64(file, 300, 450, 0.75);
      setBookCoverBase64(base64);
    } catch (err) {
      console.error('Erro ao processar capa do livro:', err);
      alert('Não foi possível processar a imagem da capa. Tente outra imagem.');
    } finally {
      if (bookCoverInputRef.current) bookCoverInputRef.current.value = '';
    }
  };

  const handleAddBookLink = () => {
    setBookLinks(prev => [
      ...prev,
      { id: `link_${Date.now()}_${prev.length}`, storeName: 'Loja Online', url: '' }
    ]);
  };

  const handleUpdateBookLink = (index: number, field: 'storeName' | 'url', value: string) => {
    setBookLinks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveBookLink = (index: number) => {
    setBookLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(bookTitle, 120);
    if (!cleanTitle) {
      setBookError('Por favor, informe o título da obra.');
      return;
    }

    const cleanSynopsis = sanitizeText(bookSynopsis, 2000);
    const validLinks = bookLinks
      .map(l => ({
        id: l.id,
        storeName: sanitizeText(l.storeName || 'Loja', 50),
        url: (l.url || '').trim()
      }))
      .filter(l => l.url.startsWith('http://') || l.url.startsWith('https://'));

    try {
      setIsSavingBook(true);
      const currentWorks = profileUser.publishedWorks || [];

      let updatedWorks: PublishedWork[] = [];
      const nowIso = new Date().toISOString();

      if (editingBookId) {
        // Edit existing
        updatedWorks = currentWorks.map(w => {
          if (w.id === editingBookId) {
            return {
              ...w,
              title: cleanTitle,
              synopsis: cleanSynopsis,
              coverBase64: bookCoverBase64 || undefined,
              coverUrl: bookCoverBase64 || undefined,
              links: validLinks,
              updatedAt: nowIso
            };
          }
          return w;
        });
      } else {
        // Add new
        const newWork: PublishedWork = {
          id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          title: cleanTitle,
          synopsis: cleanSynopsis,
          coverBase64: bookCoverBase64 || undefined,
          coverUrl: bookCoverBase64 || undefined,
          links: validLinks,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        updatedWorks = [newWork, ...currentWorks];
      }

      await updateAuthorProfile(currentUser.id, { publishedWorks: updatedWorks });

      const updatedUser: User = {
        ...profileUser,
        publishedWorks: updatedWorks
      };

      setProfileUser(updatedUser);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }

      setIsBookModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar obra:', err);
      setBookError('Erro ao salvar obra no perfil. Tente novamente.');
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleDeleteBook = async (workId: string) => {
    if (!confirm('Deseja realmente remover esta obra da sua vitrine literária?')) return;

    try {
      const currentWorks = profileUser.publishedWorks || [];
      const updatedWorks = currentWorks.filter(w => w.id !== workId);

      await updateAuthorProfile(currentUser.id, { publishedWorks: updatedWorks });

      const updatedUser: User = {
        ...profileUser,
        publishedWorks: updatedWorks
      };

      setProfileUser(updatedUser);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error('Erro ao excluir obra:', err);
      alert('Não foi possível remover a obra. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  const publishedWorks = profileUser.publishedWorks || [];
  const instagramUrl = getInstagramUrl(profileUser.instagram || '');
  const whatsappUrl = getWhatsappUrl(profileUser.whatsapp || '');
  const contactEmail = (profileUser.contactEmail || '').trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                {isOwnProfile ? 'Meu Perfil de Autor & Vitrine' : `Perfil Literário de ${profileUser.name}`}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Cartão de visitas e vitrine de obras publicadas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Success Toast */}
          {infoSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Informações do perfil atualizadas com sucesso!</span>
            </div>
          )}

          {/* 1. HERO CARD (BENTO GRID DO AUTOR) */}
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-violet-50/90 via-indigo-50/70 to-emerald-50/80 border border-indigo-100 shadow-sm overflow-hidden">
            {/* Ambient Aura Backgrounds */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Avatar with Double Ring */}
              <div className="relative group/avatar flex-shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 shadow-xl ring-4 ring-white/90 overflow-hidden">
                  {(profileUser.photoBase64 || profileUser.photoURL) ? (
                    <img
                      src={profileUser.photoBase64 || profileUser.photoURL}
                      alt={profileUser.name}
                      className={`w-full h-full rounded-full object-cover border-2 border-white transition-opacity ${
                        isUpdatingAvatar ? 'opacity-40' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white text-4xl font-black border-2 border-white">
                      {profileUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Avatar change overlay (only for own profile) */}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUpdatingAvatar}
                    className="absolute inset-1 rounded-full bg-slate-950/60 text-white opacity-0 group-hover/avatar:opacity-100 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer backdrop-blur-[2px]"
                    title="Alterar foto de perfil"
                  >
                    <Camera className="w-5 h-5 text-emerald-300" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">Alterar</span>
                  </button>
                )}

                {isOwnProfile && (
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                )}
              </div>

              {/* Author Details & Bio */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {profileUser.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                    ✍️ Escritor
                  </span>
                </div>

                {/* Mini-bio or literary title */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {profileUser.bio || (
                    <span className="italic text-slate-400">
                      {isOwnProfile
                        ? 'Adicione uma mini-bio ou título literário para se apresentar aos leitores e à comunidade.'
                        : 'Escritor membro do ParnasoTec.'}
                    </span>
                  )}
                </p>

                {/* Location with Pin */}
                {profileUser.location && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                    <span>{profileUser.location}</span>
                  </div>
                )}

                {/* Contact & Social Pills */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  {/* Instagram Pill */}
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 hover:from-pink-600 hover:to-purple-600 text-pink-700 hover:text-white border border-pink-200/80 text-xs font-bold shadow-2xs transition-all transform hover:scale-105"
                      title="Visitar perfil no Instagram"
                    >
                      <Instagram className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{profileUser.instagram?.startsWith('@') ? profileUser.instagram : `@${profileUser.instagram?.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}`}</span>
                    </a>
                  )}

                  {/* WhatsApp Pill */}
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 text-xs font-bold shadow-2xs transition-all transform hover:scale-105"
                      title="Conversar no WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {/* Contact Email Pill */}
                  {contactEmail && (
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(contactEmail)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-700 text-slate-700 hover:text-white border border-slate-200 text-xs font-bold shadow-2xs transition-all cursor-pointer transform hover:scale-105"
                      title="Copiar e-mail de contato"
                    >
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{copiedEmail ? 'E-mail copiado! ✨' : contactEmail}</span>
                    </button>
                  )}

                  {/* Own Profile: Edit Bio Button */}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={handleOpenEditInfo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar Perfil</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* EDIT AUTHOR INFO DRAWER (Bento Accordion) */}
            {isOwnProfile && isEditingInfo && (
              <form onSubmit={handleSaveInfo} className="mt-6 pt-6 border-t border-indigo-200/80 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    Editar Informações do Cartão de Visitas
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome de Autor</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      placeholder="Ex: Machado de Assis"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Localidade (Cidade/Estado)</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      placeholder="Ex: Fortaleza, CE"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mini-Bio / Título Literário</label>
                    <textarea
                      maxLength={250}
                      rows={2}
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 resize-none"
                      placeholder="Conte um pouco sobre seu universo literário ou estilo de escrita..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail de Contato Comercial</label>
                    <input
                      type="email"
                      maxLength={120}
                      value={editContactEmail}
                      onChange={e => setEditContactEmail(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      placeholder="contato@seusite.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Instagram (@usuario ou link)</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={editInstagram}
                      onChange={e => setEditInstagram(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      placeholder="@meuperfil"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp (Número com DDD)</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      placeholder="(85) 99999-9999"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingInfo ? 'Salvando...' : '✓ Salvar Perfil'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 2. VITRINE DE OBRAS PUBLICADAS */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Obras Publicadas (Vitrine)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
                  {publishedWorks.length}
                </span>
              </div>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={handleOpenAddBook}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Obra ao Perfil</span>
                </button>
              )}
            </div>

            {/* Books Grid */}
            {publishedWorks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {publishedWorks.map(work => {
                  const isSynopsisExpanded = Boolean(expandedSynopsisIds[work.id]);
                  const hasLongSynopsis = (work.synopsis || '').length > 220;

                  return (
                    <div
                      key={work.id}
                      className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 relative group"
                    >
                      {/* Left: Book Cover (2:3 Vertical Ratio) with realistic book spine effect */}
                      <div className="w-28 h-40 sm:w-32 sm:h-48 rounded-lg overflow-hidden shadow-md flex-shrink-0 border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 group-hover:scale-103 transition-transform duration-300 relative mx-auto sm:mx-0">
                        {(work.coverBase64 || work.coverUrl) ? (
                          <img
                            src={work.coverBase64 || work.coverUrl}
                            alt={work.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          // Stylized Fallback Book Cover
                          <div className="w-full h-full bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 text-white p-3 flex flex-col justify-between text-center select-none">
                            <div className="w-6 h-1 bg-amber-400 mx-auto rounded-full mt-1" />
                            <div>
                              <p className="text-[11px] font-black leading-tight uppercase tracking-tight line-clamp-3">
                                {work.title}
                              </p>
                              <p className="text-[9px] text-indigo-200 mt-1 font-medium truncate">
                                {profileUser.name}
                              </p>
                            </div>
                            <span className="text-[8px] text-slate-400 font-serif italic">Parnaso Edições</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Book Details & Purchase Links */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Title & Action Buttons */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                              {work.title}
                            </h4>

                            {isOwnProfile && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBook(work)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Editar obra"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBook(work.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Excluir obra"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Synopsis with Expand/Collapse */}
                          {work.synopsis ? (
                            <div className="mt-1.5 text-xs text-slate-600 leading-relaxed font-normal">
                              <p className={isSynopsisExpanded ? '' : 'line-clamp-3'}>
                                {work.synopsis}
                              </p>
                              {hasLongSynopsis && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSynopsisIds(prev => ({
                                      ...prev,
                                      [work.id]: !prev[work.id]
                                    }))
                                  }
                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-1 cursor-pointer"
                                >
                                  {isSynopsisExpanded ? 'Recolher ↑' : 'Ler mais... ↓'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic mt-1">
                              Sem sinopse cadastrada.
                            </p>
                          )}
                        </div>

                        {/* Where to Buy Links */}
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                            Onde Comprar / Ler:
                          </p>

                          {work.links && work.links.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {work.links.map(link => (
                                <a
                                  key={link.id}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200/90 text-[11px] font-bold shadow-2xs transition-all cursor-pointer group/link"
                                  title={`Comprar na ${link.storeName}`}
                                >
                                  <ShoppingCart className="w-3 h-3 text-indigo-500 group-hover/link:text-white" />
                                  <span>{link.storeName}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Nenhum link cadastrado no momento.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Empty State for Vitrine
              <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto">
                  📚
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">
                    {isOwnProfile ? 'Sua vitrine literária está vazia' : 'Nenhuma obra cadastrada'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    {isOwnProfile
                      ? 'Adicione seus livros físicos ou digitais, informe a capa e insira links da Amazon, editoras ou sites para divulgar sua produção!'
                      : 'Este autor ainda não adicionou obras públicas à sua vitrine.'}
                  </p>
                </div>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleOpenAddBook}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    + Adicionar Minha Primeira Obra
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL: ADICIONAR / EDITAR OBRA */}
        {isBookModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
              {/* Cabeçalho Fixo no Topo */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">
                    {editingBookId ? 'Editar Obra Literária' : 'Adicionar Obra à Vitrine'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário com Corpo Rolável e Rodapé Fixo */}
              <form onSubmit={handleSaveBook} className="flex flex-col flex-1 overflow-hidden">
                {/* Corpo com Rolagem Suave */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {bookError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                      {bookError}
                    </div>
                  )}

                  {/* Grid em duas colunas responsivas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Coluna da Esquerda (1/3): Capa do Livro */}
                    <div className="md:col-span-1 flex flex-col items-center">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2 self-start md:self-center">
                        Capa do Livro
                      </label>

                      <div
                        onClick={() => bookCoverInputRef.current?.click()}
                        className="aspect-[2/3] w-full max-w-[160px] mx-auto rounded-lg border-2 border-dashed border-slate-300 hover:border-violet-500 bg-slate-50 flex flex-col items-center justify-center text-center p-3 cursor-pointer relative overflow-hidden group shadow-xs transition-colors"
                      >
                        {bookCoverBase64 ? (
                          <>
                            <img
                              src={bookCoverBase64}
                              alt="Prévia da Capa"
                              className="w-full h-full object-cover rounded"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                              <Camera className="w-5 h-5 text-violet-300" />
                              <span className="text-[11px] font-bold">Trocar Capa</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-violet-600 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-violet-50 flex items-center justify-center mb-2">
                              <Camera className="w-5 h-5 text-slate-400 group-hover:text-violet-600" />
                            </div>
                            <span className="text-xs font-black text-slate-700 group-hover:text-violet-700">Enviar Capa</span>
                            <span className="text-[10px] text-slate-400 mt-1">Formato vertical 2:3</span>
                          </div>
                        )}
                      </div>

                      {bookCoverBase64 && (
                        <button
                          type="button"
                          onClick={() => setBookCoverBase64('')}
                          className="mt-2 text-[11px] text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer"
                        >
                          Remover capa
                        </button>
                      )}

                      <input
                        type="file"
                        ref={bookCoverInputRef}
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={handleCoverUpload}
                      />
                      <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
                        PNG ou JPEG (ajustado automaticamente para 300x450px)
                      </p>
                    </div>

                    {/* Coluna da Direita (2/3): Título, Sinopse e Links */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Título da Obra */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Título da Obra <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={120}
                          value={bookTitle}
                          onChange={e => setBookTitle(e.target.value)}
                          placeholder="Ex: O Enigma da Meia-Noite"
                          className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                          required
                        />
                      </div>

                      {/* Sinopse / Pitch da Obra */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Sinopse / Pitch da Obra
                        </label>
                        <textarea
                          rows={4}
                          maxLength={2000}
                          value={bookSynopsis}
                          onChange={e => setBookSynopsis(e.target.value)}
                          placeholder="Escreva a sinopse atraente que desperte a curiosidade do leitor..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 resize-none leading-relaxed"
                        />
                      </div>

                      {/* Lista Dinâmica de Links de Compra */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                            Onde Comprar / Ler
                          </label>
                          <button
                            type="button"
                            onClick={handleAddBookLink}
                            className="text-xs font-extrabold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Adicionar Loja / Link</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {bookLinks.map((linkItem, idx) => (
                            <div key={linkItem.id} className="flex items-center gap-2">
                              <input
                                list={`stores-${idx}`}
                                type="text"
                                maxLength={50}
                                value={linkItem.storeName}
                                onChange={e => handleUpdateBookLink(idx, 'storeName', e.target.value)}
                                placeholder="Plataforma"
                                className="w-28 sm:w-32 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-violet-500"
                              />
                              <datalist id={`stores-${idx}`}>
                                <option value="Amazon" />
                                <option value="Uiclap" />
                                <option value="Submarino" />
                                <option value="Kindle" />
                                <option value="Skoob" />
                                <option value="Outro" />
                              </datalist>

                              <input
                                type="url"
                                value={linkItem.url}
                                onChange={e => handleUpdateBookLink(idx, 'url', e.target.value)}
                                placeholder="https://..."
                                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-violet-500 min-w-0"
                              />

                              {bookLinks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBookLink(idx)}
                                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
                                  title="Remover link"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé Fixo na Base */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBook}
                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{isSavingBook ? 'Salvando Obra...' : '✓ Salvar Obra'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
