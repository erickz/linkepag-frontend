'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { usePageEditor, LinkItem, headerGradients, backgroundOptions, paidLinkAccentColors } from '@/hooks/usePageEditor';
import { uploadLinkFile, deleteLinkFile } from '@/lib/api';
import { maskPriceInput, parsePrice, formatPrice, formatUrl } from '@/lib/masks';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanLimitWarning, PlanUpgradeModal } from '@/components/PlanUpgradeModal';

// Icons
const Icon = ({ path, className = "w-5 h-5" }: { path: string, className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const Icons = {
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  palette: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  share: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  check: "M5 13l4 4L19 7",
  external: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
  location: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
};

type TabId = 'links' | 'profile' | 'appearance' | 'social';

const tabs = [
  { id: 'links' as TabId, label: 'Links', icon: Icons.link },
  { id: 'profile' as TabId, label: 'Perfil', icon: Icons.user },
  { id: 'appearance' as TabId, label: 'Aparência', icon: Icons.palette },
  { id: 'social' as TabId, label: 'Redes', icon: Icons.share },
];

// Social icon components for preview
const SocialIcons = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  youtube: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z",
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  github: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  website: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
};

// Preview Component
function PagePreview({ data, links }: { data: any, links: LinkItem[] }) {
  const gradient = headerGradients.find(g => g.id === data.appearanceSettings?.headerGradient)?.preview || headerGradients[0].preview;
  const bgOption = backgroundOptions.find(b => b.id === data.appearanceSettings?.backgroundColor) || backgroundOptions[0];
  const accent = paidLinkAccentColors.find(a => a.id === data.appearanceSettings?.paidLinkAccent) || paidLinkAccentColors[0];
  const activeLinks = links.filter(l => l.isActive).sort((a, b) => a.order - b.order).slice(0, 3);

  // Get active social links
  const socialPlatforms = ['instagram', 'youtube', 'twitter', 'linkedin', 'github', 'tiktok', 'website'] as const;
  const activeSocialLinks = socialPlatforms.filter(
    platform => data.socialLinks?.[platform]
  );

  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg border border-slate-200 ${bgOption.class}`}>
      <div className={`h-16 ${gradient}`} />
      <div className="px-4 pb-4 -mt-8">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
            {data.profilePhoto ? (
              <img src={data.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Icon path={Icons.user} className="w-8 h-8 text-indigo-300" />
              </div>
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-900 text-sm">@{data.username || 'username'}</p>
          {data.displayName && <p className="text-xs text-indigo-600">{data.displayName}</p>}
          {data.bio && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{data.bio}</p>}
          
          {/* Location */}
          {data.location && (
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mt-1.5">
              <Icon path={Icons.location} className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{data.location}</span>
            </div>
          )}
          
          {/* Social Links */}
          {activeSocialLinks.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2">
              {activeSocialLinks.map(platform => (
                <div 
                  key={platform}
                  className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500"
                  title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={(SocialIcons as Record<string, string>)[platform]} />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {activeLinks.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">Nenhum link ativo</div>
          ) : (
            activeLinks.map(link => (
              <div key={link.id} className={`h-8 rounded-lg flex items-center px-3 text-xs ${link.isPaid ? `bg-gradient-to-r from-slate-800 to-slate-900 text-white ${accent.borderClass}` : 'bg-white text-slate-700 border border-slate-200'}`}>
                <span className="flex-1 truncate">{link.title}</span>
                {link.isPaid && <span className={`font-bold ${accent.textClass}`}>R$ {formatPrice(link.price ?? 0)}</span>}
              </div>
            ))
          )}
          {links.filter(l => l.isActive).length > 3 && (
            <div className="text-center text-xs text-slate-400">+ {links.filter(l => l.isActive).length - 3} links</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Editor Content Component
function EditorContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('links');
  const initializedRef = useRef(false);

  useProtectedRoute('/login');

  const {
    profile, links, isLoading: isLoadingData, previewData, profileDraft, appearanceDraft,
    usernameStatus, usernameError, validateUsername, updateProfileField, updateSocialLink,
    updateAppearance, saveProfile, saveAppearance, saveSocialLinks, saveUsername, createLink, updateLink,
    deleteLink, toggleLink, reorderLinks, isSavingProfile, isCreatingLink, isUpdatingLink,
    isDeletingLink, initializeDrafts, hasUnsavedChanges, hasUnsavedAppearance,
  } = usePageEditor(isAuthenticated);

  useEffect(() => { if (!initializedRef.current && profile && !isLoadingData) { initializeDrafts(); initializedRef.current = true; } }, [profile, isLoadingData, initializeDrafts]);
  useEffect(() => { const tab = searchParams.get('tab') as TabId; if (tab && tabs.find(t => t.id === tab)) setActiveTab(tab); }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  };

  if (isLoading || isLoadingData) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>;
  if (!isAuthenticated) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/admin/dashboard" className="hover:text-indigo-600 transition">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Editor da Página</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Editor da Página</h1>
            <p className="text-slate-500">Personalize seu perfil público em um só lugar</p>
          </div>
          <Link href={`/p/${profile?.username}`} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition">
            <Icon path={Icons.external} className="w-4 h-4" /> Ver Página
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Icon path={tab.icon} className="w-5 h-5" />
                  {tab.label}
                  {(tab.id === 'profile' && hasUnsavedChanges) || (tab.id === 'appearance' && hasUnsavedAppearance) ? <span className="w-2 h-2 rounded-full bg-amber-400"></span> : null}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'links' && <LinksTab links={links} onCreate={createLink} onUpdate={updateLink} onDelete={deleteLink} onToggle={toggleLink} onReorder={reorderLinks} isCreating={isCreatingLink} isUpdating={isUpdatingLink} isDeleting={isDeletingLink} />}
          {activeTab === 'profile' && <ProfileTab draft={profileDraft} original={profile} onUpdate={updateProfileField} onSave={saveProfile} isSaving={isSavingProfile} usernameStatus={usernameStatus} usernameError={usernameError} onValidateUsername={validateUsername} onSaveUsername={saveUsername} />}
          {activeTab === 'appearance' && <AppearanceTab settings={appearanceDraft} onUpdate={updateAppearance} onSave={saveAppearance} isSaving={isSavingProfile} />}
          {activeTab === 'social' && <SocialTab socialLinks={profileDraft.socialLinks || {}} onUpdate={updateSocialLink} onSave={saveSocialLinks} isSaving={isSavingProfile} />}
        </div>

        <div className="xl:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Icon path={Icons.eye} className="w-5 h-5 text-indigo-600" /> Preview em Tempo Real
              </h3>
              <PagePreview data={previewData} links={links} />
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
              <h4 className="font-semibold text-indigo-900 text-sm mb-2">💡 Dicas</h4>
              <ul className="text-xs text-indigo-700 space-y-1.5">
                <li>• Use uma foto profissional para transmitir confiança</li>
                <li>• Mantenha sua bio curta e objetiva</li>
                <li>• Escolha cores que combinem com sua marca</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function LinksTab({ links, onCreate, onUpdate, onDelete, onToggle, onReorder, isCreating, isUpdating, isDeleting }: any) {
  const { canCreatePaidLink, currentPlan, getPaidLinksUsage } = useSubscription();
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localLinks, setLocalLinks] = useState<LinkItem[]>(links);
  const [isReorderingLocal, setIsReorderingLocal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', url: '', openInNewTab: true, isPaid: false, price: 0, type: 'free' as 'free' | 'paid', paymentTimeoutMinutes: 30 });
  
  // Upload de arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Formatadores de tamanho
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => { setLocalLinks(links); setCurrentPage(1); }, [links]);

  const paidLinksCount = localLinks.filter((l: LinkItem) => l.isPaid).length;
  const paidLinksUsage = currentPlan ? getPaidLinksUsage(paidLinksCount) : { used: 0, limit: null, percentage: 0 };
  const canCreatePaid = canCreatePaidLink(paidLinksCount);

  const resetForm = () => {
    setFormData({ title: '', description: '', url: '', openInNewTab: true, isPaid: false, price: 0, type: 'free', paymentTimeoutMinutes: 30 });
    setSelectedFile(null);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFileError(null);
    
    // Só valida limite de links monetizados quando está CRIANDO um novo link
    // Não valida quando está EDITANDO um link existente
    if (!editingLink && formData.isPaid && !canCreatePaid.allowed) {
      setMessage({ type: 'error', text: canCreatePaid.message || 'Não é possível criar link monetizado' });
      if (paidLinksUsage.limit !== null && paidLinksCount >= paidLinksUsage.limit) setShowUpgradeModal(true);
      return;
    }
    
    // Validação do arquivo
    if (selectedFile && selectedFile.size > 300 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 300MB');
      return;
    }
    
    // Para links monetizados, URL é opcional (pode ter apenas arquivo)
    const formattedUrl = formatUrl(formData.url);
    const linkData: any = { 
      title: formData.title, 
      description: formData.description, 
      openInNewTab: formData.openInNewTab, 
      type: formData.type, 
      isPaid: formData.isPaid, 
      price: formData.isPaid ? formData.price : 0, 
      paymentTimeoutMinutes: formData.paymentTimeoutMinutes 
    };
    
    // Só inclui URL se tiver valor (evita enviar string vazia)
    if (formattedUrl && formattedUrl.trim() !== '' && formattedUrl !== 'https://') {
      linkData.url = formattedUrl;
    } else if (!formData.isPaid) {
      // Link gratuito precisa de URL
      linkData.url = '';
    }
    // Links monetizados sem URL não recebem o campo (undefined)
    
    try {
      let linkId: string;
      
      if (editingLink) {
        await onUpdate(editingLink.id, linkData);
        linkId = editingLink.id;
        setMessage({ type: 'success', text: 'Link atualizado!' });
      } else {
        const result = await onCreate(linkData);
        linkId = result.link?.id || result.id;
        setMessage({ type: 'success', text: 'Link criado!' });
      }
      
      // Upload do arquivo se selecionado (apenas para links monetizados)
      if (selectedFile && linkId && formData.isPaid) {
        setIsUploadingFile(true);
        try {
          await uploadLinkFile(linkId, selectedFile);
          setMessage({ type: 'success', text: editingLink ? 'Link e arquivo atualizados!' : 'Link criado com arquivo!' });
        } catch (err: any) {
          setMessage({ type: 'error', text: 'Link salvo, mas erro no upload: ' + (err.message || 'Erro ao fazer upload') });
        } finally {
          setIsUploadingFile(false);
        }
      }
      
      setShowForm(false);
      setEditingLink(null);
      resetForm();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar' });
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Só permite arquivo em links monetizados
    if (!formData.isPaid) {
      setFileError('Apenas links monetizados podem ter arquivos para download');
      return;
    }
    
    // Validações
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo', 'video/mpeg',
      'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/flac',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setFileError('Tipo de arquivo não permitido. Use: PDF, imagens, vídeos, áudios, planilhas ou documentos.');
      return;
    }
    
    if (file.size > 300 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 300MB');
      return;
    }
    
    setFileError(null);
    setSelectedFile(file);
  };
  
  const handleRemoveFile = async (linkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remover arquivo deste link?')) return;
    
    try {
      await deleteLinkFile(linkId);
      setMessage({ type: 'success', text: 'Arquivo removido!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao remover arquivo' });
    }
  };

  const handleEdit = (link: LinkItem & { hasDeliverableFile?: boolean; deliverableFile?: { originalName: string; size: number; extension: string } | null }) => {
    setEditingLink(link);
    setFormData({ title: link.title, description: link.description || '', url: link.url, openInNewTab: link.openInNewTab ?? true, isPaid: link.isPaid || false, price: link.price || 0, type: (link.type as 'free' | 'paid') || 'free', paymentTimeoutMinutes: link.paymentTimeoutMinutes || 30 });
    setSelectedFile(null);
    setFileError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => { if (!confirm('Tem certeza?')) return; try { await onDelete(id); setMessage({ type: 'success', text: 'Link deletado!' }); } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao deletar' }); } };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (isReorderingLocal) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localLinks.length) return;
    setIsReorderingLocal(true);
    const newLinks = [...localLinks];
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    setLocalLinks(newLinks);
    try { await onReorder(newLinks.map(l => l.id)); } catch { setLocalLinks(links); }
    setIsReorderingLocal(false);
  };

  return (
    <div className="space-y-6">
      {currentPlan && <PlanLimitWarning currentCount={paidLinksCount} maxCount={currentPlan.maxPaidLinks} />}
      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}><p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p></div>}
      {!showForm && <button onClick={() => setShowForm(true)} className="w-full bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"><span className="text-xl">+</span> Novo Link</button>}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">{editingLink ? 'Editar Link' : 'Novo Link'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Título *</label><input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="Ex: Meu Curso" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">URL {formData.isPaid ? '(opcional)' : '*'}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">https://</span><input type="text" value={formData.url?.replace(/^https?:\/\//, '') || ''} onChange={e => setFormData(p => ({ ...p, url: `https://${e.target.value.replace(/^https?:\/\//, '')}` }))} required={!formData.isPaid} className="w-full h-10 pl-14 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder={formData.isPaid ? 'Opcional para links com arquivo' : 'seusite.com'} /></div></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label><input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="Breve descrição" /></div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 p-1 bg-slate-200 rounded-lg w-fit">
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData(p => ({ ...p, type: 'free', isPaid: false }));
                    // Limpar arquivo selecionado ao mudar para link comum
                    setSelectedFile(null);
                    setFileError(null);
                  }} 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'free' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Link Comum
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData(p => ({ ...p, type: 'paid', isPaid: true }))} 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'paid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Link Monetizado
                </button>
              </div>
              
              {formData.isPaid && (
                <div className="space-y-4">
                  {/* Preço */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                      <input 
                        type="text" 
                        inputMode="decimal" 
                        value={formData.price > 0 ? maskPriceInput((formData.price * 100).toString()) : ''} 
                        onChange={e => setFormData(p => ({ ...p, price: parsePrice(maskPriceInput(e.target.value)) }))} 
                        required={formData.isPaid} 
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" 
                        placeholder="0,00" 
                      />
                    </div>
                  </div>
                  
                  {/* Upload de Arquivo - APENAS para links monetizados */}
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-indigo-900">Arquivo para Download (opcional)</label>
                      <span className="text-xs text-indigo-600">Máx 300MB</span>
                    </div>
                    
                    {editingLink?.hasDeliverableFile && editingLink.deliverableFile && !selectedFile && (
                      <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📎</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{editingLink.deliverableFile.originalName}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(editingLink.deliverableFile.size)} • {editingLink.deliverableFile.extension.toUpperCase()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(editingLink.id, e)}
                          className="text-rose-500 hover:text-rose-700 text-sm font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                    
                    {selectedFile && (
                      <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📎</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)} • Novo arquivo</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-rose-500 hover:text-rose-700 text-sm font-medium"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                    
                    {!selectedFile && (!editingLink?.hasDeliverableFile) && (
                      <label className="block">
                        <span className="sr-only">Escolher arquivo</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-medium
                            file:bg-indigo-100 file:text-indigo-700
                            hover:file:bg-indigo-200
                            cursor-pointer
                          "
                        />
                      </label>
                    )}
                    
                    {fileError && (
                      <p className="text-xs text-rose-600">{fileError}</p>
                    )}
                    
                    <p className="text-xs text-indigo-700">
                      PDF, imagens, vídeos (MP4, MOV), áudios (MP3), planilhas e documentos.
                      O arquivo será enviado ao comprador após o pagamento.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2"><input type="checkbox" id="openInNewTab" checked={formData.openInNewTab} onChange={e => setFormData(p => ({ ...p, openInNewTab: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /><label htmlFor="openInNewTab" className="text-sm text-slate-700">Abrir em nova aba</label></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isCreating || isUpdating || isUploadingFile} className="flex-1 h-10 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {isUploadingFile ? 'Enviando arquivo...' : (isCreating || isUpdating ? 'Salvando...' : (editingLink ? 'Salvar' : 'Criar'))}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingLink(null); resetForm(); }} className="flex-1 h-10 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Seus Links ({localLinks.length})</h3>
        {localLinks.length === 0 ? <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200"><p className="text-slate-500">Nenhum link ainda. Comece adicionando seu primeiro!</p></div> : (
          <>
            <div className="space-y-2">
              {localLinks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((link, index) => {
                const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                return (
                  <div key={link.id} className={`group flex items-center gap-2 p-3 rounded-xl border transition-all ${link.isPaid ? 'border-slate-200 bg-slate-50/30' : 'border-slate-200 hover:border-indigo-300'} ${!link.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col">
                      <button onClick={() => handleMove(actualIndex, 'up')} disabled={actualIndex === 0 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">▲</button>
                      <span className="text-[10px] text-slate-400 text-center">{actualIndex + 1}</span>
                      <button onClick={() => handleMove(actualIndex, 'down')} disabled={actualIndex === localLinks.length - 1 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">▼</button>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.isPaid ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>{link.isPaid ? '💰' : <Icon path={Icons.link} className="w-5 h-5" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">{link.title}</p>
                        {(link as LinkItem & { hasDeliverableFile?: boolean }).hasDeliverableFile && (
                          <span title="Possui arquivo para download" className="text-indigo-500 text-sm">📎</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">{link.isPaid ? <span className="font-bold text-amber-600">R$ {formatPrice(link.price ?? 0)}</span> : <span className="text-slate-400">Gratuito</span>}<span className="text-slate-300">•</span><span className="text-slate-400 truncate">{link.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onToggle(link.id)} className={`p-2 rounded-lg transition ${link.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>{link.isActive ? '👁️' : '🚫'}</button>
                      <button onClick={() => handleEdit(link)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition">✏️</button>
                      <button onClick={() => handleDelete(link.id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Paginação */}
            {localLinks.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Página {currentPage} de {Math.ceil(localLinks.length / ITEMS_PER_PAGE)}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Anterior</button>
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(localLinks.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(localLinks.length / ITEMS_PER_PAGE)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Próxima</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <PlanUpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPaidLinksCount={paidLinksCount} />
    </div>
  );
}

function ProfileTab({ draft, original, onUpdate, onSave, isSaving, usernameStatus, usernameError, onValidateUsername, onSaveUsername }: any) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localUsername, setLocalUsername] = useState('');

  // Atualiza localUsername quando draft ou original mudam
  useEffect(() => { 
    const username = draft.username || original?.username || '';
    setLocalUsername(username); 
  }, [draft.username, original?.username]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: 'error', text: 'Imagem deve ter no máximo 5MB' }); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let { width, height } = img;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }}
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }}
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        onUpdate('profilePhoto', canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setMessage(null);
    try {
      await onSave();
      if (localUsername !== original?.username && usernameStatus === 'available') await onSaveUsername(localUsername);
      setMessage({ type: 'success', text: 'Perfil salvo!' });
    } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao salvar' }); }
  };

  const handleUsernameChange = (val: string) => { const lower = val.toLowerCase(); setLocalUsername(lower); onValidateUsername(lower); };

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}><p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p></div>}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Foto de Perfil</h3>
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-slate-200 flex items-center justify-center">
              {draft.profilePhoto ? <img src={draft.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-full" /> : <Icon path={Icons.user} className="w-8 h-8 text-indigo-300" />}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition cursor-pointer"><span>Escolher foto</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" /></label>
              {draft.profilePhoto && <button type="button" onClick={() => onUpdate('profilePhoto', '')} className="px-4 h-10 border border-rose-200 text-rose-600 rounded-lg font-medium text-sm hover:bg-rose-50 transition">Remover</button>}
            </div>
            <p className="text-xs text-slate-400">JPG, PNG ou WebP. Máx 5MB.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Informações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome de exibição</label><input type="text" value={draft.displayName || ''} onChange={e => onUpdate('displayName', e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="Como quer ser chamado" /></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username / URL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">@</span>
              <input type="text" value={localUsername} onChange={e => handleUsernameChange(e.target.value)} className={`w-full h-10 pl-8 pr-10 rounded-lg border transition text-sm ${usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-200' : usernameStatus === 'unavailable' ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'} focus:border-indigo-500 focus:ring-2 outline-none`} placeholder="seuusername" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">{usernameStatus === 'checking' ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : usernameStatus === 'available' ? <Icon path={Icons.check} className="w-4 h-4 text-emerald-500" /> : null}</div>
            </div>
            {usernameError && <p className="text-xs text-rose-500 mt-1">{usernameError}</p>}
            <p className="text-xs text-slate-400 mt-1">linkpagg.com/p/{localUsername || 'username'}</p>
          </div>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Localização</label><div className="relative"><Icon path={Icons.location} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={draft.location || ''} onChange={e => onUpdate('location', e.target.value)} className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="São Paulo, Brasil" /></div></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Bio</label><textarea value={draft.bio || ''} onChange={e => onUpdate('bio', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm resize-none" placeholder="Conte um pouco sobre você..." /></div>
        <button onClick={handleSave} disabled={isSaving} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Perfil'}</button>
      </div>
    </div>
  );
}

function AppearanceTab({ settings, onUpdate, onSave, isSaving }: any) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const handleSave = async () => { setMessage(null); try { await onSave(); setMessage({ type: 'success', text: 'Aparência salva!' }); } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao salvar' }); } };

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}><p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p></div>}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Gradiente do Cabeçalho</h3>
        <div className="grid grid-cols-2 gap-3">
          {headerGradients.map((g) => (
            <button key={g.id} onClick={() => onUpdate('headerGradient', g.id)} className={`relative group rounded-xl overflow-hidden transition-all ${settings.headerGradient === g.id ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : 'hover:scale-105'}`}>
              <div className={`h-12 ${g.preview}`} />
              {settings.headerGradient === g.id && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg"><Icon path={Icons.check} className="w-3 h-3 text-indigo-600" /></div>}
              <div className="p-2 bg-white"><p className="text-xs font-semibold text-slate-900">{g.name}</p></div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Cor de Fundo</h3>
        <div className="flex flex-wrap gap-3">
          {backgroundOptions.map((bg) => (
            <button key={bg.id} onClick={() => onUpdate('backgroundColor', bg.id)} className={`relative group w-14 h-14 rounded-xl border-2 transition-all ${settings.backgroundColor === bg.id ? 'border-indigo-500 ring-2 ring-indigo-200 scale-110' : 'border-slate-200 hover:border-slate-300'} ${bg.class}`}>
              {settings.backgroundColor === bg.id && <div className="absolute inset-0 flex items-center justify-center"><svg className={`w-5 h-5 ${bg.textColor === 'text-white' ? 'text-white' : 'text-indigo-600'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Destaque de Links Pagos</h3>
        <div className="flex flex-wrap gap-3">
          {paidLinkAccentColors.map((a) => (
            <button key={a.id} onClick={() => onUpdate('paidLinkAccent', a.id)} className={`relative group w-12 h-12 rounded-full transition-all ${a.class} ${settings.paidLinkAccent === a.id ? 'ring-4 ring-offset-2 ring-slate-300 scale-110' : 'hover:scale-110'}`}>
              {settings.paidLinkAccent === a.id && <div className="absolute inset-0 flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={isSaving} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Aparência'}</button>
    </div>
  );
}

function SocialTab({ socialLinks, onUpdate, onSave, isSaving }: any) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const handleSave = async () => { setMessage(null); try { await onSave(); setMessage({ type: 'success', text: 'Redes sociais salvas!' }); } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao salvar' }); } };
  const platforms = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/seuusuario' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@seucanal' },
    { key: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/seuusuario' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seuusuario' },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/seuusuario' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@seuusuario' },
    { key: 'website', label: 'Site Pessoal', placeholder: 'https://seusite.com' },
  ];

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}><p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p></div>}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Redes Sociais</h3>
        <p className="text-sm text-slate-500 mb-4">Adicione links para suas redes sociais que aparecerão no seu perfil público.</p>
        <div className="space-y-4">
          {platforms.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input type="url" value={socialLinks[key] || ''} onChange={e => onUpdate(key, e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder={placeholder} />
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={isSaving} className="w-full h-11 mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Redes Sociais'}</button>
      </div>
    </div>
  );
}

// Main Page Component with Suspense
export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
