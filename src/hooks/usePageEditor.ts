'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { normalizeSocialUrl } from '@/lib/masks';
import {
  DEFAULT_THEME_ID,
  DEFAULT_BUTTON_STYLE_ID,
  resolveTheme,
  resolveButtonStyleId,
  type AppearanceInput,
} from '@/lib/themes';
import { useApi, useApiMutation, useApiParallel } from './useApi';
import {
  getLinks,
  getProfile,
  createLink,
  updateLink,
  deleteLink,
  reorderLinks,
  toggleLinkActive,
  updateProfile,
  updateUsername,
  checkUsernameAvailability,
  CACHE_KEYS,
} from '@/lib/api';

// Types
export interface LinkItem {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  order: number;
  isActive: boolean;
  openInNewTab?: boolean;
  template?: 'direct' | 'paid_access' | 'digital_product' | 'scheduling';
  type?: 'free' | 'paid';
  isPaid?: boolean;
  price?: number;
  paymentTimeoutMinutes?: number;
  hasDeliverableFile?: boolean;
  deliverableFile?: {
    originalName: string;
    size: number;
    extension: string;
    isImage: boolean;
    uploadedAt: string;
  } | null;
}

export interface ProfileData {
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  pixKey?: string;
  showPixOnPage?: boolean;
  pixButtonText?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  // Aparência: shape completo vindo do banco (theme/buttonStyle + campos legados)
  appearanceSettings?: AppearanceInput;
}

// Draft editável de aparência — só os campos do modelo novo são editáveis.
// Os campos legados (headerGradient/backgroundColor/paidLinkAccent) ficam
// intactos no banco e servem apenas para resolver o tema de usuários antigos.
export interface AppearanceSettings {
  theme?: string;
  buttonStyle?: string;
}

export type EditorTab = 'links' | 'profile' | 'appearance' | 'social';

export function usePageEditor(isAuthenticated: boolean) {
  // Load initial data - usa chaves estáveis
  const queries = useMemo(() => ({
    profile: { key: CACHE_KEYS.PROFILE, fetchFn: getProfile },
    links: { key: CACHE_KEYS.LINKS, fetchFn: getLinks },
  }), []);

  const { data, isLoading, refetch } = useApiParallel<{
    profile: ProfileData;
    links: { links: LinkItem[] };
  }>(
    queries,
    { enabled: isAuthenticated }
  );

  const profile = data?.profile;
  const links = useMemo(() => data?.links?.links || [], [data?.links?.links]);

  // Profile draft state
  const [profileDraft, setProfileDraft] = useState<Partial<ProfileData>>({
    showPixOnPage: false,
    pixButtonText: '',
  });
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceSettings>({
    theme: DEFAULT_THEME_ID,
    buttonStyle: DEFAULT_BUTTON_STYLE_ID,
  });

  // Initialize drafts when data loads - executa sempre que os dados mudam
  const initializeDrafts = useCallback(() => {
    if (profile) {
      setProfileDraft(prev => ({
        ...prev,
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        profilePhoto: profile.profilePhoto || '',
        location: profile.location || '',
        username: profile.username || '',
        socialLinks: profile.socialLinks || {},
        showPixOnPage: profile.showPixOnPage ?? prev.showPixOnPage ?? false,
        pixButtonText: profile.pixButtonText || prev.pixButtonText || '',
      }));
      // Resolve o tema do perfil (cobre usuário legado via mapeamento do
      // themes.ts) — assim o draft já nasce com o tema efetivo selecionado
      setAppearanceDraft({
        theme: resolveTheme(profile.appearanceSettings).id,
        buttonStyle: resolveButtonStyleId(profile.appearanceSettings),
      });
    }
  }, [profile]);

  // Auto-initialize drafts quando os dados carregam (ou quando profile muda)
  useEffect(() => {
    if (profile && !isLoading) {
      initializeDrafts();
    }
  }, [profile, isLoading, initializeDrafts]);

  // Computed preview data (merges saved data with drafts)
  const previewData = useMemo(() => {
    return {
      ...profile,
      ...profileDraft,
      appearanceSettings: {
        ...profile?.appearanceSettings,
        ...appearanceDraft,
      },
    };
  }, [profile, profileDraft, appearanceDraft]);

  // Links mutations - wrap to match useApiMutation signature
  const createLinkMutation = useApiMutation(async (data: any) => createLink(data));
  const updateLinkMutation = useApiMutation(async (params: { id: string; data: any }) => updateLink(params.id, params.data));
  const deleteLinkMutation = useApiMutation(async (id: string) => deleteLink(id));
  const toggleLinkMutation = useApiMutation(async (id: string) => toggleLinkActive(id));
  const reorderLinksMutation = useApiMutation(async (linkIds: string[]) => reorderLinks(linkIds));

  // Profile mutations
  const updateProfileMutation = useApiMutation(updateProfile);

  // Profile actions
  const updateProfileField = useCallback(<K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K]
  ) => {
    setProfileDraft(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateSocialLink = useCallback((platform: string, url: string) => {
    setProfileDraft(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: url,
      },
    }));
  }, []);

  const updateAppearance = useCallback(<K extends keyof AppearanceSettings>(
    field: K,
    value: AppearanceSettings[K]
  ) => {
    setAppearanceDraft(prev => ({ ...prev, [field]: value }));
  }, []);

  // Unified save function - saves all settings at once (profile + social + appearance)
  const saveAll = useCallback(async () => {
    const normalizedSocialLinks = profileDraft.socialLinks
      ? Object.fromEntries(
          Object.entries(profileDraft.socialLinks).map(([platform, url]) => [
            platform,
            normalizeSocialUrl(platform, typeof url === 'string' ? url : String(url ?? '')),
          ])
        )
      : undefined;

    const dataToSave = {
      displayName: profileDraft.displayName,
      bio: profileDraft.bio,
      profilePhoto: profileDraft.profilePhoto,
      location: profileDraft.location,
      socialLinks: normalizedSocialLinks,
      // Só os campos do modelo novo são enviados; os legados ficam intactos no banco
      appearanceSettings: {
        theme: appearanceDraft.theme,
        buttonStyle: appearanceDraft.buttonStyle,
      },
      showPixOnPage: profileDraft.showPixOnPage,
      pixButtonText: profileDraft.pixButtonText,
    };
    await updateProfileMutation.mutate(dataToSave);
    await refetch();
  }, [profileDraft, appearanceDraft, updateProfileMutation, refetch]);

  // All save functions now use saveAll to ensure consistency
  const saveProfile = useCallback(async () => {
    await saveAll();
  }, [saveAll]);

  const saveAppearance = useCallback(async () => {
    await saveAll();
  }, [saveAll]);

  const saveSocialLinks = useCallback(async () => {
    await saveAll();
  }, [saveAll]);

  // Links actions
  const handleCreateLink = useCallback(async (linkData: Omit<LinkItem, 'id'>) => {
    const result = await createLinkMutation.mutate(linkData);
    await refetch();
    return result;
  }, [createLinkMutation, refetch]);

  const handleUpdateLink = useCallback(async (id: string, linkData: Partial<LinkItem>) => {
    await updateLinkMutation.mutate({ id, data: linkData });
    await refetch();
  }, [updateLinkMutation, refetch]);

  const handleDeleteLink = useCallback(async (id: string) => {
    await deleteLinkMutation.mutate(id);
    await refetch();
  }, [deleteLinkMutation, refetch]);

  const handleToggleLink = useCallback(async (id: string) => {
    await toggleLinkMutation.mutate(id);
    await refetch();
  }, [toggleLinkMutation, refetch]);

  const handleReorderLinks = useCallback(async (linkIds: string[]) => {
    await reorderLinksMutation.mutate(linkIds);
    await refetch();
  }, [reorderLinksMutation, refetch]);

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [usernameError, setUsernameError] = useState('');

  const validateUsername = useCallback(async (username: string) => {
    if (!username.trim() || username === profile?.username) {
      setUsernameStatus('idle');
      setUsernameError('');
      return true;
    }
    if (username.length < 3) {
      setUsernameStatus('unavailable');
      setUsernameError('Mínimo 3 caracteres');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('unavailable');
      setUsernameError('Apenas letras, números e _');
      return false;
    }
    setUsernameStatus('checking');
    try {
      const result = await checkUsernameAvailability(username);
      setUsernameStatus(result.available ? 'available' : 'unavailable');
      setUsernameError(result.available ? '' : 'Username em uso');
      return result.available;
    } catch {
      setUsernameStatus('idle');
      return false;
    }
  }, [profile?.username]);

  const saveUsername = useCallback(async (newUsername: string) => {
    if (newUsername !== profile?.username && usernameStatus === 'available') {
      await updateUsername(newUsername);
      await refetch();
    }
  }, [profile?.username, usernameStatus, refetch]);

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!profile) return false;
    return (
      profileDraft.displayName !== profile.displayName ||
      profileDraft.bio !== profile.bio ||
      profileDraft.profilePhoto !== profile.profilePhoto ||
      profileDraft.location !== profile.location ||
      profileDraft.showPixOnPage !== profile.showPixOnPage ||
      profileDraft.pixButtonText !== profile.pixButtonText ||
      JSON.stringify(profileDraft.socialLinks) !== JSON.stringify(profile.socialLinks)
    );
  }, [profile, profileDraft]);

  // Compara o draft com os valores RESOLVIDOS do perfil (mesma regra usada
  // para inicializar o draft) — usuário legado não vê badge de "não salvo"
  const hasUnsavedAppearance = useMemo(() => {
    if (!profile) return false;
    return (
      appearanceDraft.theme !== resolveTheme(profile.appearanceSettings).id ||
      appearanceDraft.buttonStyle !== resolveButtonStyleId(profile.appearanceSettings)
    );
  }, [profile, appearanceDraft]);

  return {
    // Data
    profile,
    links,
    isLoading,
    
    // Drafts
    profileDraft,
    appearanceDraft,
    previewData,
    
    // Username validation
    usernameStatus,
    usernameError,
    validateUsername,
    
    // Actions
    initializeDrafts,
    updateProfileField,
    updateSocialLink,
    updateAppearance,
    saveProfile,
    saveAppearance,
    saveSocialLinks,
    saveUsername,
    
    // Links actions
    createLink: handleCreateLink,
    updateLink: handleUpdateLink,
    deleteLink: handleDeleteLink,
    toggleLink: handleToggleLink,
    reorderLinks: handleReorderLinks,
    
    // Loading states
    isSavingProfile: updateProfileMutation.isLoading,
    isCreatingLink: createLinkMutation.isLoading,
    isUpdatingLink: updateLinkMutation.isLoading,
    isDeletingLink: deleteLinkMutation.isLoading,
    isReorderingLinks: reorderLinksMutation.isLoading,
    
    // Unsaved changes
    hasUnsavedChanges,
    hasUnsavedAppearance,
    
    // Refetch
    refetch,
  };
}
