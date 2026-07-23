'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { trackLinkPaidCreated } from '@/lib/pixel-milestones';
import { usePageEditor, LinkItem, headerGradients, backgroundOptions, paidLinkAccentColors } from '@/hooks/usePageEditor';
import { uploadLinkFile, deleteLinkFile } from '@/lib/api';
import { maskPriceInput, parsePrice, formatPrice, formatUrl, priceToInputValue } from '@/lib/masks';
import {
  getDefaultLinkTemplate,
  getTitlePlaceholder,
  getTitleLabel,
  getUrlLabel,
  getUrlPlaceholder,
  getUrlHelpText,
  getTemplateContextDescription,
  getLinkTemplateById,
  linkTemplateColors,
  isMonetizedTemplate,
  isUrlRequired,
  type LinkTemplateId,
} from '@/lib/link-templates';
import { LinkTemplateSelector } from '@/components/LinkTemplateSelector';
import { PagePreview } from '@/components/PagePreview';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanLimitWarning, PlanUpgradeModal } from '@/components/PlanUpgradeModal';
import { detectPlatformFromUrl } from '@/lib/platform-detector';
import { IconLink, IconLock, IconDownload, IconCalendar, IconTelegram, IconWhatsApp, IconGoogleCalendar } from '@/components/icons';

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
  eyeOff: "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21",
  pencil: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
};

type TabId = 'links' | 'profile' | 'appearance' | 'social';

const tabs = [
  { id: 'links' as TabId, label: 'Links', icon: Icons.link },
  { id: 'profile' as TabId, label: 'Perfil', icon: Icons.user },
  { id: 'appearance' as TabId, label: 'Aparência', icon: Icons.palette },
  { id: 'social' as TabId, label: 'Redes', icon: Icons.share },
];

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
  const { user } = useAuth();
  const { canCreatePaidLink, currentPlan, getPaidLinksUsage } = useSubscription();
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localLinks, setLocalLinks] = useState<LinkItem[]>(links);
  const [isReorderingLocal, setIsReorderingLocal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', url: '', openInNewTab: true, template: getDefaultLinkTemplate(), price: 0, paymentTimeoutMinutes: 30 });
  const [selectedTemplate, setSelectedTemplate] = useState<LinkTemplateId | null>(null);
  const [showAdvancedLinkFields, setShowAdvancedLinkFields] = useState(false);
  
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

  const paidLinksCount = localLinks.filter((l: LinkItem) => l.template === 'paid_access' || l.template === 'digital_product').length;
  const paidLinksUsage = currentPlan ? getPaidLinksUsage(paidLinksCount) : { used: 0, limit: null, percentage: 0 };
  const canCreatePaid = canCreatePaidLink(paidLinksCount);

  const resetForm = () => {
    setFormData({ title: '', description: '', url: '', openInNewTab: true, template: getDefaultLinkTemplate(), price: 0, paymentTimeoutMinutes: 30 });
    setSelectedTemplate(null);
    setSelectedFile(null);
    setFileError(null);
    setShowAdvancedLinkFields(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFileError(null);
    
    // Só valida limite de links monetizados quando está CRIANDO um novo link
    // Não valida quando está EDITANDO um link existente
    const isMonetized = formData.template === 'paid_access' || formData.template === 'digital_product';
    if (!editingLink && isMonetized && !canCreatePaid.allowed) {
      setMessage({ type: 'error', text: canCreatePaid.message || 'Não é possível criar link monetizado' });
      if (paidLinksUsage.limit !== null && paidLinksCount >= paidLinksUsage.limit) setShowUpgradeModal(true);
      return;
    }
    
    // Validação do arquivo
    if (selectedFile && selectedFile.size > 300 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 300MB');
      return;
    }
    
    const formattedUrl = formatUrl(formData.url);
    const linkData: any = { 
      title: formData.title, 
      description: formData.description, 
      openInNewTab: formData.openInNewTab, 
      template: formData.template,
      price: isMonetized ? formData.price : 0, 
      paymentTimeoutMinutes: formData.paymentTimeoutMinutes 
    };
    
    // URL obrigatória para direct e scheduling, opcional para paid_access
    if (formattedUrl && formattedUrl.trim() !== '' && formattedUrl !== 'https://') {
      linkData.url = formattedUrl;
    } else if (formData.template === 'direct' || formData.template === 'scheduling') {
      linkData.url = '';
    }
    // paid_access e digital_product podem não ter URL
    
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

        // Meta Pixel: primeiro Link Pago
        if (isMonetized && paidLinksCount === 0 && user?.id) {
          trackLinkPaidCreated(user.id, formData.price || 0);
        }
      }
      
      // Upload do arquivo se selecionado (apenas para Produto Digital)
      if (selectedFile && linkId && formData.template === 'digital_product') {
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
    
    // Só permite arquivo em Produto Digital
    if (formData.template !== 'digital_product') {
      setFileError('Apenas Produtos Digitais podem ter arquivos para download');
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
    setFormData({ title: link.title, description: link.description || '', url: link.url || '', openInNewTab: link.openInNewTab ?? true, template: (link.template as LinkTemplateId) || getDefaultLinkTemplate(), price: link.price || 0, paymentTimeoutMinutes: link.paymentTimeoutMinutes || 30 });
    setSelectedFile(null);
    setFileError(null);
    // Expande campos avançados se houver dados neles
    setShowAdvancedLinkFields(Boolean(link.description?.trim()) || Boolean(link.url?.trim()) || Boolean(link.template === 'digital_product' && link.hasDeliverableFile));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => { if (!confirm('Tem certeza que deseja excluir este link?')) return; try { await onDelete(id); setMessage({ type: 'success', text: 'Link deletado!' }); } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao deletar' }); } };

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
      {!showForm && <button onClick={() => { setShowForm(true); setSelectedTemplate(null); }} className="w-full bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"><span className="text-xl">+</span> Novo Link</button>}
      {showForm && !editingLink && !selectedTemplate && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Novo Link</h3>
          </div>
          <LinkTemplateSelector
            value={selectedTemplate}
            onChange={(template) => {
              setFormData((p) => ({ ...p, template }));
              setSelectedTemplate(template);
              if (template !== 'digital_product') {
                setSelectedFile(null);
                setFileError(null);
              }
            }}
          />
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 h-10 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showForm && (editingLink || selectedTemplate) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">{editingLink ? 'Editar Link' : 'Novo Link'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card de contexto do template */}
            {(() => {
              const template = editingLink ? (editingLink.template as LinkTemplateId) : selectedTemplate!;
              const config = getLinkTemplateById(template);
              const color = linkTemplateColors[config.color];
              return (
                <div className={`rounded-xl p-4 border ${color.border} ${color.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.iconBg}`}>
                      <config.icon className={`w-5 h-5 ${color.iconText}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${color.text}`}>{config.label}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{getTemplateContextDescription(template)}</p>
                    </div>
                    {!editingLink && (
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition shrink-0"
                      >
                        Trocar tipo
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{getTitleLabel(formData.template)}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  placeholder={getTitlePlaceholder(formData.template)}
                />
              </div>
              {isMonetizedTemplate(formData.template) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quanto você quer cobrar? *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={priceToInputValue(formData.price)}
                      onChange={(e) => setFormData((p) => ({ ...p, price: parsePrice(maskPriceInput(e.target.value)) }))}
                      required
                      className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* URL - obrigatória para direct/scheduling/paid_access, opcional para digital_product em mais opções */}
            {(isUrlRequired(formData.template) || formData.template === 'paid_access' || (formData.template === 'digital_product' && showAdvancedLinkFields)) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{getUrlLabel(formData.template)}</label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                  required={isUrlRequired(formData.template) || formData.template === 'paid_access'}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                  placeholder={getUrlPlaceholder(formData.template)}
                />
                <p className="text-xs text-slate-400 mt-1">{getUrlHelpText(formData.template)}</p>
              </div>
            )}

            {/* Upload de Arquivo - obrigatório para Produto Digital */}
            {formData.template === 'digital_product' && (
              <div className="rounded-xl p-4 space-y-3 border-2 border-dashed bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <IconDownload className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-900">Arquivo que o cliente vai receber *</label>
                    <p className="text-xs text-amber-700 mt-0.5">PDF, imagem, vídeo, áudio, planilha ou documento • até 300 MB</p>
                  </div>
                </div>
                
                {editingLink?.hasDeliverableFile && editingLink.deliverableFile && !selectedFile && (
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-100">
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
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-100">
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
                        file:mr-4 file:py-2.5 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-amber-100 file:text-amber-700
                        hover:file:bg-amber-200
                        cursor-pointer
                      "
                    />
                  </label>
                )}
                
                {fileError && (
                  <p className="text-xs text-rose-600">{fileError}</p>
                )}
              </div>
            )}

            {/* Campos avançados: descrição e URL do digital_product */}
            {showAdvancedLinkFields && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                    placeholder="Breve descrição"
                  />
                </div>
              </div>
            )}

            {/* Toggle campos avançados */}
            {formData.template !== 'direct' && formData.template !== 'scheduling' && (
              <button
                type="button"
                onClick={() => setShowAdvancedLinkFields((v) => !v)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
              >
                {showAdvancedLinkFields ? 'Ocultar opções avançadas' : 'Mostrar opções avançadas'}
              </button>
            )}
            
            <div className="flex items-center gap-2"><input type="checkbox" id="openInNewTab" checked={formData.openInNewTab} onChange={e => setFormData(p => ({ ...p, openInNewTab: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /><label htmlFor="openInNewTab" className="text-sm text-slate-700">Abrir em nova aba</label></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isCreating || isUpdating || isUploadingFile} className="flex-1 h-10 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {isUploadingFile ? 'Enviando arquivo...' : (isCreating || isUpdating ? 'Salvando...' : (editingLink ? 'Salvar' : 'Criar'))}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingLink(null); resetForm(); }} className="flex-1 h-10 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition">
                Cancelar
              </button>
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
                  <div key={link.id} className={`group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border transition-all ${link.template === 'paid_access' || link.template === 'digital_product' ? 'border-slate-200 bg-slate-50/30' : 'border-slate-200 hover:border-indigo-300'} ${!link.isActive ? 'opacity-50' : ''}`}>
                    {/* Ordenação - mais compacto no mobile */}
                    <div className="flex flex-col flex-shrink-0">
                      <button onClick={() => handleMove(actualIndex, 'up')} disabled={actualIndex === 0 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs sm:text-sm">▲</button>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 text-center leading-none py-0.5">{actualIndex + 1}</span>
                      <button onClick={() => handleMove(actualIndex, 'down')} disabled={actualIndex === localLinks.length - 1 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 text-xs sm:text-sm">▼</button>
                    </div>
                    
                    {/* Ícone por template */}
                    {(() => {
                      const template = link.template || 'direct';
                      const platform = template === 'scheduling' && link.url ? detectPlatformFromUrl(link.url) : null;
                      if (template === 'direct') {
                        return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-600"><IconLink className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                      }
                      if (template === 'scheduling') {
                        if (platform === 'telegram') return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-sky-100 text-sky-600"><IconTelegram className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                        if (platform === 'whatsapp') return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100 text-emerald-600"><IconWhatsApp className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                        if (platform === 'google-calendar') return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600"><IconGoogleCalendar className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                        return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-violet-100 text-violet-600"><IconCalendar className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                      }
                      if (template === 'paid_access') {
                        return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-600"><IconLock className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                      }
                      if (template === 'digital_product') {
                        return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600"><IconDownload className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                      }
                      return <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-100 text-indigo-600"><IconLink className="w-4 h-4 sm:w-5 sm:h-5" /></div>;
                    })()}
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="font-medium text-slate-900 truncate text-sm sm:text-base">{link.title}</p>
                        {(link as LinkItem & { hasDeliverableFile?: boolean }).hasDeliverableFile && (
                          <span title="Possui arquivo para download" className="text-amber-500 text-xs sm:text-sm flex-shrink-0">📎</span>
                        )}
                        {!link.isActive && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 flex-shrink-0">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs mt-0.5">
                        {link.template === 'paid_access' || link.template === 'digital_product' ? (
                          <span className="font-bold text-amber-600 flex-shrink-0">R$ {formatPrice(link.price ?? 0)}</span>
                        ) : (
                          <span className="text-slate-400 flex-shrink-0">
                            {link.template === 'scheduling' ? 'Agendamento' : 'Direto'}
                          </span>
                        )}
                        {link.url && (
                          <>
                            <span className="text-slate-300 flex-shrink-0">•</span>
                            <span className="text-slate-400 truncate">{link.url.replace(/^https?:\/\//, '').replace(/^www\./, '').substring(0, 25)}{link.url.length > 30 ? '...' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => onToggle(link.id)}
                        aria-label={link.isActive ? 'Desativar link' : 'Ativar link'}
                        className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:px-3 rounded-lg text-sm font-medium transition ${
                          link.isActive
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Icon
                          path={link.isActive ? Icons.eye : Icons.eyeOff}
                          className="w-5 h-5 sm:w-4 sm:h-4"
                        />
                        <span className="hidden sm:inline ml-1.5">
                          {link.isActive ? 'Desativar' : 'Ativar'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleEdit(link)}
                        aria-label="Editar link"
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:px-3 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <Icon path={Icons.pencil} className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline ml-1.5">Editar</span>
                      </button>

                      <button
                        onClick={() => handleDelete(link.id)}
                        aria-label="Excluir link"
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:px-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Icon path={Icons.trash} className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline ml-1.5">Excluir</span>
                      </button>
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
        <h3 className="text-lg font-bold text-slate-900 mb-4">Destaque de Links Monetizados</h3>
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
