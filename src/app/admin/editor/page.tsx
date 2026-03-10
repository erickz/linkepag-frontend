'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { usePageEditor, LinkItem, headerGradients, backgroundOptions, paidLinkAccentColors } from '@/hooks/usePageEditor';
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

// Preview Component
function PagePreview({ data, links }: { data: any, links: LinkItem[] }) {
  const gradient = headerGradients.find(g => g.id === data.appearanceSettings?.headerGradient)?.preview || headerGradients[0].preview;
  const bgOption = backgroundOptions.find(b => b.id === data.appearanceSettings?.backgroundColor) || backgroundOptions[0];
  const accent = paidLinkAccentColors.find(a => a.id === data.appearanceSettings?.paidLinkAccent) || paidLinkAccentColors[0];
  const activeLinks = links.filter(l => l.isActive).sort((a, b) => a.order - b.order).slice(0, 3);

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
    updateAppearance, saveProfile, saveAppearance, saveUsername, createLink, updateLink,
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
          {activeTab === 'social' && <SocialTab socialLinks={profileDraft.socialLinks || {}} onUpdate={updateSocialLink} onSave={saveProfile} isSaving={isSavingProfile} />}
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
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { setLocalLinks(links); setCurrentPage(1); }, [links]);

  const paidLinksCount = localLinks.filter((l: LinkItem) => l.isPaid).length;
  const paidLinksUsage = currentPlan ? getPaidLinksUsage(paidLinksCount) : { used: 0, limit: null, percentage: 0 };
  const canCreatePaid = canCreatePaidLink(paidLinksCount);

  const resetForm = () => setFormData({ title: '', description: '', url: '', openInNewTab: true, isPaid: false, price: 0, type: 'free', paymentTimeoutMinutes: 30 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (formData.isPaid && !canCreatePaid.allowed) {
      setMessage({ type: 'error', text: canCreatePaid.message || 'Não é possível criar link monetizado' });
      if (paidLinksUsage.limit !== null && paidLinksCount >= paidLinksUsage.limit) setShowUpgradeModal(true);
      return;
    }
    const linkData = { title: formData.title, description: formData.description, url: formatUrl(formData.url), openInNewTab: formData.openInNewTab, type: formData.type, isPaid: formData.isPaid, price: formData.isPaid ? formData.price : 0, paymentTimeoutMinutes: formData.paymentTimeoutMinutes };
    try {
      if (editingLink) { await onUpdate(editingLink.id, linkData); setMessage({ type: 'success', text: 'Link atualizado!' }); }
      else { await onCreate(linkData); setMessage({ type: 'success', text: 'Link criado!' }); }
      setShowForm(false); setEditingLink(null); resetForm();
    } catch (err: any) { setMessage({ type: 'error', text: err.message || 'Erro ao salvar' }); }
  };

  const handleEdit = (link: LinkItem) => {
    setEditingLink(link);
    setFormData({ title: link.title, description: link.description || '', url: link.url, openInNewTab: link.openInNewTab ?? true, isPaid: link.isPaid || false, price: link.price || 0, type: (link.type as 'free' | 'paid') || 'free', paymentTimeoutMinutes: link.paymentTimeoutMinutes || 30 });
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
              <div><label className="block text-sm font-medium text-slate-700 mb-1">URL *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">https://</span><input type="text" value={formData.url.replace(/^https?:\/\//, '')} onChange={e => setFormData(p => ({ ...p, url: `https://${e.target.value.replace(/^https?:\/\//, '')}` }))} required className="w-full h-10 pl-14 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="seusite.com" /></div></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label><input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="Breve descrição" /></div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 p-1 bg-slate-200 rounded-lg w-fit">
                <button type="button" onClick={() => setFormData(p => ({ ...p, type: 'free', isPaid: false }))} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'free' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>Link Comum</button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, type: 'paid', isPaid: true }))} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.type === 'paid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>Link Monetizado</button>
              </div>
              {formData.isPaid && (
                <div className="space-y-3">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R$</span><input type="text" inputMode="decimal" value={formData.price > 0 ? maskPriceInput((formData.price * 100).toString()) : ''} onChange={e => setFormData(p => ({ ...p, price: parsePrice(maskPriceInput(e.target.value)) }))} required={formData.isPaid} className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm" placeholder="0,00" /></div></div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="openInNewTab" checked={formData.openInNewTab} onChange={e => setFormData(p => ({ ...p, openInNewTab: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-indigo-600" /><label htmlFor="openInNewTab" className="text-sm text-slate-700">Abrir em nova aba</label></div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isCreating || isUpdating} className="flex-1 h-10 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50">{isCreating || isUpdating ? 'Salvando...' : (editingLink ? 'Salvar' : 'Criar')}</button>
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
                  <div key={link.id} className={`group flex items-center gap-2 p-3 rounded-xl border transition-all ${link.isPaid ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 hover:border-indigo-300'} ${!link.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col">
                      <button onClick={() => handleMove(actualIndex, 'up')} disabled={actualIndex === 0 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">▲</button>
                      <span className="text-[10px] text-slate-400 text-center">{actualIndex + 1}</span>
                      <button onClick={() => handleMove(actualIndex, 'down')} disabled={actualIndex === localLinks.length - 1 || isReorderingLocal} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20">▼</button>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.isPaid ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>{link.isPaid ? '💰' : <Icon path={Icons.link} className="w-5 h-5" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{link.title}</p>
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
