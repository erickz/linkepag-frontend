'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  type?: 'free' | 'paid';
  isPaid?: boolean;
  price?: number;
  paymentTimeoutMinutes?: number;
}

export interface ProfileData {
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  appearanceSettings?: {
    headerGradient?: string;
    backgroundColor?: string;
    paidLinkAccent?: string;
  };
}

export interface AppearanceSettings {
  headerGradient: string;
  backgroundColor: string;
  paidLinkAccent: string;
}

export type EditorTab = 'links' | 'profile' | 'appearance' | 'social';

// Gradientes disponíveis
export const headerGradients = [
  { id: 'indigo-purple', name: 'Criativo', gradient: 'from-indigo-500 via-purple-500 to-pink-500', preview: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500', description: 'Ideal para artistas' },
  { id: 'blue-cyan', name: 'Tecnologia', gradient: 'from-blue-500 via-cyan-500 to-teal-400', preview: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400', description: 'Para devs e tech' },
  { id: 'rose-orange', name: 'Energia', gradient: 'from-rose-500 via-orange-500 to-amber-400', preview: 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400', description: 'Vibrante e motivador' },
  { id: 'emerald-teal', name: 'Natureza', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', preview: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500', description: 'Vibe natural' },
  { id: 'violet-fuchsia', name: 'Luxo', gradient: 'from-violet-600 via-fuchsia-500 to-pink-500', preview: 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500', description: 'Elegante e sofisticado' },
  { id: 'slate-zinc', name: 'Minimalista', gradient: 'from-slate-700 via-zinc-600 to-neutral-500', preview: 'bg-gradient-to-r from-slate-700 via-zinc-600 to-neutral-500', description: 'Clean e profissional' },
  { id: 'amber-yellow', name: 'Sol', gradient: 'from-amber-400 via-yellow-400 to-lime-400', preview: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-lime-400', description: 'Alegre e radiante' },
  { id: 'monochrome-dark', name: 'Preto & Branco', gradient: 'from-neutral-500 via-neutral-800 to-black', preview: 'bg-gradient-to-r from-neutral-500 via-neutral-800 to-black', description: 'Clássico atemporal' },
];

// Cores de fundo
export const backgroundOptions = [
  { id: 'white', name: 'Branco', class: 'bg-white', textColor: 'text-slate-900' },
  { id: 'slate-50', name: 'Cinza Claro', class: 'bg-slate-50', textColor: 'text-slate-900' },
  { id: 'neutral-900', name: 'Escuro', class: 'bg-neutral-900', textColor: 'text-white' },
  { id: 'slate-900', name: 'Meia-noite', class: 'bg-slate-900', textColor: 'text-white' },
  { id: 'indigo-100', name: 'Lavanda', class: 'bg-indigo-100', textColor: 'text-slate-900' },
  { id: 'purple-100', name: 'Lilás', class: 'bg-purple-100', textColor: 'text-slate-900' },
  { id: 'rose-50', name: 'Rosê', class: 'bg-rose-50', textColor: 'text-slate-900' },
  { id: 'amber-50', name: 'Creme', class: 'bg-amber-50', textColor: 'text-slate-900' },
  { id: 'emerald-50', name: 'Menta', class: 'bg-emerald-50', textColor: 'text-slate-900' },
  { id: 'cyan-50', name: 'Gelo', class: 'bg-cyan-50', textColor: 'text-slate-900' },
  { id: 'gradient-purple', name: 'Roxo Suave', class: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100', textColor: 'text-slate-900' },
  { id: 'gradient-sunset', name: 'Pôr do Sol', class: 'bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100', textColor: 'text-slate-900' },
];

// Cores de destaque
export const paidLinkAccentColors = [
  { id: 'amber', name: 'Âmbar', class: 'bg-amber-500', textClass: 'text-amber-400', borderClass: 'border-amber-500/30', bgClass: 'bg-amber-500/20' },
  { id: 'emerald', name: 'Esmeralda', class: 'bg-emerald-500', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30', bgClass: 'bg-emerald-500/20' },
  { id: 'rose', name: 'Rosa', class: 'bg-rose-500', textClass: 'text-rose-400', borderClass: 'border-rose-500/30', bgClass: 'bg-rose-500/20' },
  { id: 'cyan', name: 'Ciano', class: 'bg-cyan-500', textClass: 'text-cyan-400', borderClass: 'border-cyan-500/30', bgClass: 'bg-cyan-500/20' },
  { id: 'violet', name: 'Violeta', class: 'bg-violet-500', textClass: 'text-violet-400', borderClass: 'border-violet-500/30', bgClass: 'bg-violet-500/20' },
  { id: 'orange', name: 'Laranja', class: 'bg-orange-500', textClass: 'text-orange-400', borderClass: 'border-orange-500/30', bgClass: 'bg-orange-500/20' },
];

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
  const [profileDraft, setProfileDraft] = useState<Partial<ProfileData>>({});
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceSettings>({
    headerGradient: 'indigo-purple',
    backgroundColor: 'white',
    paidLinkAccent: 'amber',
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
      }));
      if (profile.appearanceSettings) {
        setAppearanceDraft({
          headerGradient: profile.appearanceSettings.headerGradient || 'indigo-purple',
          backgroundColor: profile.appearanceSettings.backgroundColor || 'white',
          paidLinkAccent: profile.appearanceSettings.paidLinkAccent || 'amber',
        });
      }
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

  const saveProfile = useCallback(async () => {
    const dataToSave = {
      displayName: profileDraft.displayName,
      bio: profileDraft.bio,
      profilePhoto: profileDraft.profilePhoto,
      location: profileDraft.location,
      socialLinks: profileDraft.socialLinks,
    };
    await updateProfileMutation.mutate(dataToSave);
    await refetch();
  }, [profileDraft, updateProfileMutation, refetch]);

  const saveAppearance = useCallback(async () => {
    await updateProfileMutation.mutate({
      appearanceSettings: appearanceDraft,
    });
    await refetch();
  }, [appearanceDraft, updateProfileMutation, refetch]);

  // Links actions
  const handleCreateLink = useCallback(async (linkData: Omit<LinkItem, 'id'>) => {
    await createLinkMutation.mutate(linkData);
    await refetch();
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
      JSON.stringify(profileDraft.socialLinks) !== JSON.stringify(profile.socialLinks)
    );
  }, [profile, profileDraft]);

  const hasUnsavedAppearance = useMemo(() => {
    if (!profile?.appearanceSettings) return true;
    return (
      appearanceDraft.headerGradient !== profile.appearanceSettings.headerGradient ||
      appearanceDraft.backgroundColor !== profile.appearanceSettings.backgroundColor ||
      appearanceDraft.paidLinkAccent !== profile.appearanceSettings.paidLinkAccent
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
