'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useMpOAuth } from '@/hooks/useMpOAuth';
import { 
  getProfile, 
  updateProfile, 
  updateUsername,
  createLink,
  uploadLinkFile,
  CACHE_KEYS 
} from '@/lib/api';
import { formatUrl } from '@/lib/masks';
import { IconCheck, IconArrowRight, IconArrowLeft, IconUser, IconCreditCard, IconLink, IconAlert, IconHelp, IconRefresh, IconUnlink } from '@/components/icons';
import { AdminHeader } from '@/components/AdminHeader';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// ORDEM CORRETA: Profile -> Links -> Payment (por último)
const steps: OnboardingStep[] = [
  {
    id: 'profile',
    title: 'Personalize seu perfil',
    description: 'Adicione suas informações para sua página pública',
    icon: <IconUser className="w-6 h-6" />,
  },
  {
    id: 'link',
    title: 'Cadastre um link',
    description: 'Adicione um link e comece a vender',
    icon: <IconLink className="w-6 h-6" />,
  },
  {
    id: 'payment',
    title: 'Configure recebimento',
    description: 'Escolha como quer receber seus pagamentos',
    icon: <IconCreditCard className="w-6 h-6" />,
  },
];

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // Step 1: Profile
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    location: '',
    bio: '',
    profilePhoto: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Step 2: Links
  const [link, setLink] = useState({
    title: '',
    description: '',
    url: '',
    price: '',
    type: 'paid' as 'free' | 'paid',
    openInNewTab: true,
  });
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  
  // Upload de arquivo (apenas para links monetizados)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  
  // Step 3: Payment Configuration (PIX or MercadoPago)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'mercadopago' | null>(null);
  
  // PIX configuration
  const [pixConfig, setPixConfig] = useState({
    pixKey: '',
    pixKeyType: 'CPF' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM',
    pixQRCodeImage: '',
  });
  const [isSavingPix, setIsSavingPix] = useState(false);

  // MercadoPago OAuth (novo fluxo)
  const {
    status: oauthStatus,
    connectionData: oauthData,
    hasLegacyCredentials,
    isConnecting,
    isDisconnecting,
    initiateConnection,
    disconnect,
    refreshStatus,
  } = useMpOAuth();

  useProtectedRoute('/login');

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  // Lida com callback OAuth (sucesso/erro)
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'success') {
      refreshStatus();
      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
    }
  }, [searchParams, refreshStatus]);

  // Atualiza completedSteps quando OAuth estiver conectado
  useEffect(() => {
    if (oauthStatus === 'connected') {
      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
    }
  }, [oauthStatus]);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile({
        displayName: data.displayName || user?.fullName?.split(' ')[0] || '',
        username: data.username || '',
        location: data.location || '',
        bio: data.bio || '',
        profilePhoto: data.profilePhoto || '',
      });
      if (data.displayName) {
        setCompletedSteps(prev => [...new Set([...prev, 'profile'])]);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.displayName.trim()) return;
    
    setIsLoadingProfile(true);
    try {
      // Atualiza dados do perfil (exceto username que tem endpoint separado)
      await updateProfile({
        displayName: profile.displayName,
        location: profile.location || undefined,
        bio: profile.bio,
        profilePhoto: profile.profilePhoto,
      });
      
      // Se tiver username, atualiza separadamente
      if (profile.username.trim()) {
        try {
          await updateUsername(profile.username);
        } catch (usernameErr) {
          console.error('Erro ao salvar username:', usernameErr);
        }
      }
      
      setCompletedSteps(prev => [...new Set([...prev, 'profile'])]);
      setCurrentStep(1); // Vai para o passo 2: Links
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Só permite arquivo em links monetizados
    if (link.type !== 'paid') {
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

  const handleCreateLink = async () => {
    // Validação: link gratuito precisa de URL, monetizado precisa de preço
    if (!link.title.trim() || (link.type === 'paid' && !link.price) || (link.type === 'free' && !link.url.trim())) return;
    
    // Validação do arquivo
    if (selectedFile && selectedFile.size > 300 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 300MB');
      return;
    }
    
    setIsCreatingLink(true);
    try {
      // Para links monetizados, URL é opcional (pode ter apenas arquivo)
      const formattedUrl = formatUrl(link.url);
      const linkData: any = { 
        title: link.title, 
        description: link.description, 
        openInNewTab: link.openInNewTab, 
        type: link.type, 
        isPaid: link.type === 'paid', 
        price: link.type === 'paid' ? parseFloat(link.price) : 0,
      };
      
      // Só inclui URL se tiver valor (evita enviar string vazia)
      if (formattedUrl && formattedUrl.trim() !== '' && formattedUrl !== 'https://') {
        linkData.url = formattedUrl;
      } else if (link.type === 'free') {
        // Link gratuito precisa de URL
        linkData.url = '';
      }
      // Links monetizados sem URL não recebem o campo (undefined)
      
      const result = await createLink(linkData);
      const linkId = result.link?.id || result.id;
      
      // Upload do arquivo se selecionado (apenas para links monetizados)
      if (selectedFile && linkId && link.type === 'paid') {
        setIsUploadingFile(true);
        try {
          await uploadLinkFile(linkId, selectedFile);
        } catch (err: any) {
          console.error('Erro no upload:', err);
          // Não bloqueia o fluxo, apenas loga o erro
        } finally {
          setIsUploadingFile(false);
        }
      }
      
      setCompletedSteps(prev => [...new Set([...prev, 'link'])]);
      setCurrentStep(2); // Vai para o passo 3: Payment
    } catch (err) {
      console.error('Erro ao criar link:', err);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleSavePix = async () => {
    if (!pixConfig.pixKey) return;
    
    setIsSavingPix(true);
    try {
      await updateProfile({
        pixKey: pixConfig.pixKey,
        pixKeyType: pixConfig.pixKeyType,
        pixQRCodeImage: pixConfig.pixQRCodeImage || undefined,
      });
      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      // Onboarding completo!
      localStorage.setItem('lp_onboarding_complete', 'true');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Erro ao salvar PIX:', err);
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleOAuthSuccess = () => {
    setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
    // Onboarding completo!
    localStorage.setItem('lp_onboarding_complete', 'true');
    router.push('/admin/dashboard');
  };



  const skipOnboarding = () => {
    localStorage.setItem('lp_onboarding_skipped', 'true');
    router.push('/admin/dashboard');
  };

  const skipStep = () => {
    // Pula para o próximo passo ou finaliza
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('lp_onboarding_complete', 'true');
      router.push('/admin/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const progress = ((completedSteps.length) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader showWelcome={false} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {completedSteps.length === steps.length 
              ? '🎉 Tudo pronto!' 
              : `Você está a ${steps.length - completedSteps.length} passo${steps.length - completedSteps.length !== 1 ? 's' : ''} da primeira venda!`}
          </h1>
          <p className="text-slate-500 mb-6">
            Complete essas etapas para começar a monetizar sua audiência
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-slate-500">
              <span>{completedSteps.length} de {steps.length} completos</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Steps Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(index)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isCurrent 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isCurrent ? 'bg-white/20' : isCompleted ? 'bg-emerald-200' : 'bg-slate-100'
                    }`}>
                      {isCompleted ? (
                        <IconCheck className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className="font-medium hidden sm:block">{step.title}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Profile */}
          {currentStep === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <IconUser className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{steps[0].title}</h2>
                  <p className="text-slate-500">{steps[0].description}</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Foto de perfil
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-slate-200 flex items-center justify-center">
                        {profile.profilePhoto ? (
                          <img 
                            src={profile.profilePhoto} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="inline-flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Escolher foto
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                alert('A imagem deve ter no máximo 5MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result as string;
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX_SIZE = 400;
                                  let width = img.width;
                                  let height = img.height;
                                  if (width > height) {
                                    if (width > MAX_SIZE) {
                                      height *= MAX_SIZE / width;
                                      width = MAX_SIZE;
                                    }
                                  } else {
                                    if (height > MAX_SIZE) {
                                      width *= MAX_SIZE / height;
                                      height = MAX_SIZE;
                                    }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  const optimizedImage = canvas.toDataURL('image/jpeg', 0.8);
                                  setProfile({ ...profile, profilePhoto: optimizedImage });
                                };
                                img.src = result;
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                        {profile.profilePhoto && (
                          <button
                            type="button"
                            onClick={() => setProfile({ ...profile, profilePhoto: '' })}
                            className="inline-flex items-center gap-2 px-4 h-10 border border-rose-200 text-rose-600 rounded-lg font-medium text-sm hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remover
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        JPG, PNG ou WebP. Máx 5MB. Recomendado: 400x400px.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome de exibição *
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="Como você quer ser chamado"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
                        placeholder="seuusername"
                        className="w-full h-12 pl-9 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Sua URL personalizada
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Localização
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="São Paulo, Brasil"
                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Onde você está baseado
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Conte um pouco sobre você ou seu negócio"
                    rows={3}
                    maxLength={160}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {profile.bio.length}/160 caracteres
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={skipStep}
                  className="text-slate-500 hover:text-slate-700 font-medium transition"
                >
                  Pular etapa
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={!profile.displayName.trim() || isLoadingProfile}
                  className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isLoadingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Links (agora é o segundo passo) */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <IconLink className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{steps[1].title}</h2>
                  <p className="text-slate-500">{steps[1].description}</p>
                </div>
              </div>

              {/* Tipo de Link - Escolha primeiro */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Que tipo de link você quer criar? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLink({ ...link, type: 'paid', price: link.price || '' })}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      link.type === 'paid'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        link.type === 'paid' ? 'border-indigo-500' : 'border-slate-300'
                      }`}>
                        {link.type === 'paid' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                      </div>
                      <span className={`font-semibold ${link.type === 'paid' ? 'text-indigo-900' : 'text-slate-700'}`}>
                        Link Monetizado
                      </span>
                    </div>
                    <p className={`text-xs ${link.type === 'paid' ? 'text-indigo-600' : 'text-slate-500'}`}>
                      Venda seu produto! O cliente paga via PIX e recebe o link de acesso/arquivo por email!
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setLink({ ...link, type: 'free', price: '' });
                      // Limpar arquivo selecionado ao mudar para link comum
                      setSelectedFile(null);
                      setFileError(null);
                    }}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      link.type === 'free'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        link.type === 'free' ? 'border-emerald-500' : 'border-slate-300'
                      }`}>
                        {link.type === 'free' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <span className={`font-semibold ${link.type === 'free' ? 'text-emerald-900' : 'text-slate-700'}`}>
                        Link Comum
                      </span>
                    </div>
                    <p className={`text-xs ${link.type === 'free' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      Compartilhe seu site, grupos ou qualquer link sem cobrança.
                    </p>
                  </button>
                </div>
              </div>

              {/* Form do Link */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do link *
                  </label>
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => setLink({ ...link, title: e.target.value })}
                    placeholder={link.type === 'paid' ? "Ex: E-book de Receitas Saudáveis" : "Ex: Meu Instagram"}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={link.description}
                    onChange={(e) => setLink({ ...link, description: e.target.value })}
                    placeholder={link.type === 'paid' ? "Descreva o que o cliente vai receber após pagar" : "Descreva para onde esse link leva"}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition resize-none"
                  />
                </div>

                {/* URL do Link */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL do link {link.type === 'paid' ? '(opcional)' : '*'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">https://</span>
                    <input
                      type="text"
                      value={link.url?.replace(/^https?:\/\//, '') || ''}
                      onChange={(e) => setLink({ ...link, url: `https://${e.target.value.replace(/^https?:\/\//, '')}` })}
                      placeholder="seusite.com"
                      required={link.type === 'free'}
                      className="w-full h-12 pl-14 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {link.type === 'paid' 
                      ? "Link que o cliente acessará após o pagamento" 
                      : "Endereço para onde seus visitantes serão direcionados"}
                  </p>
                </div>

                {/* Preço e Upload - só aparece se for pago */}
                {link.type === 'paid' && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Preço */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Preço (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                        <input
                          type="number"
                          value={link.price}
                          onChange={(e) => setLink({ ...link, price: e.target.value })}
                          placeholder="47,00"
                          className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        O cliente pagará via PIX para ter acesso a este conteúdo
                      </p>
                    </div>
                    
                    {/* Upload de Arquivo */}
                    <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-indigo-900">Arquivo para Download (opcional)</label>
                        <span className="text-xs text-indigo-600">Máx 300MB</span>
                      </div>
                      
                      {selectedFile && (
                        <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">📎</span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                              <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
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
                      
                      {!selectedFile && (
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

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="inline-flex items-center gap-2 px-4 h-12 text-slate-600 hover:text-slate-900 font-medium transition"
                >
                  <IconArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={skipStep}
                    className="text-slate-500 hover:text-slate-700 font-medium transition"
                  >
                    Pular etapa
                  </button>
                  <button
                    onClick={handleCreateLink}
                    disabled={!link.title.trim() || (link.type === 'free' && !link.url.trim()) || (link.type === 'paid' && !link.price) || isCreatingLink || isUploadingFile}
                    className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isUploadingFile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando arquivo...
                      </>
                    ) : isCreatingLink ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <IconArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Configuration */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <IconCreditCard className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Configure seu recebimento</h2>
                  <p className="text-slate-500">Escolha como quer receber seus pagamentos</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              {!paymentMethod && oauthStatus !== 'connected' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* PIX Option */}
                    <button
                      onClick={() => setPaymentMethod('pix')}
                      className="p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">Chave PIX Direta</h3>
                      <p className="text-sm text-slate-500">
                        Cadastre sua chave PIX e receba direto na sua conta. Simples e direto.
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 mt-3">
                        Usar PIX
                        <IconArrowRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* MercadoPago Option */}
                    <button
                      onClick={() => setPaymentMethod('mercadopago')}
                      className="p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">MercadoPago</h3>
                      <p className="text-sm text-slate-500">
                        Receba seus pagamentos automaticamente através do MercadoPago.
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 mt-3">
                        Usar MercadoPago
                        <IconArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="inline-flex items-center gap-2 px-4 h-12 text-slate-600 hover:text-slate-900 font-medium transition"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <button
                      onClick={skipStep}
                      className="text-slate-500 hover:text-slate-700 font-medium transition"
                    >
                      Configurar depois
                    </button>
                  </div>
                </>
              )}

              {/* PIX Configuration Form */}
              {paymentMethod === 'pix' && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-emerald-900">Receba diretamente na sua conta</p>
                        <p className="text-sm text-emerald-700 mt-1">
                          Seus clientes verão sua chave PIX e poderão escanear seu QR Code para pagar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Chave PIX *
                        </label>
                        <input
                          type="text"
                          value={pixConfig.pixKey}
                          onChange={(e) => setPixConfig({ ...pixConfig, pixKey: e.target.value })}
                          placeholder="Sua chave PIX"
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Tipo da Chave *
                        </label>
                        <select
                          value={pixConfig.pixKeyType}
                          onChange={(e) => setPixConfig({ ...pixConfig, pixKeyType: e.target.value as any })}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition bg-white"
                        >
                          <option value="CPF">CPF</option>
                          <option value="CNPJ">CNPJ</option>
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Telefone</option>
                          <option value="RANDOM">Chave Aleatória</option>
                        </select>
                      </div>
                    </div>

                    {/* QR Code Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        QR Code (opcional)
                      </label>
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="w-28 h-28 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                            {pixConfig.pixQRCodeImage ? (
                              <img 
                                src={pixConfig.pixQRCodeImage} 
                                alt="QR Code" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center gap-2 px-4 h-10 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {pixConfig.pixQRCodeImage ? 'Trocar' : 'Adicionar QR Code'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('A imagem deve ter no máximo 2MB');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const result = event.target?.result as string;
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const MAX_SIZE = 400;
                                    let width = img.width;
                                    let height = img.height;
                                    if (width > height) {
                                      if (width > MAX_SIZE) {
                                        height *= MAX_SIZE / width;
                                        width = MAX_SIZE;
                                      }
                                    } else {
                                      if (height > MAX_SIZE) {
                                        width *= MAX_SIZE / height;
                                        height = MAX_SIZE;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    ctx?.drawImage(img, 0, 0, width, height);
                                    const optimizedImage = canvas.toDataURL('image/jpeg', 0.85);
                                    setPixConfig({ ...pixConfig, pixQRCodeImage: optimizedImage });
                                  };
                                  img.src = result;
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>
                          
                          {pixConfig.pixQRCodeImage && (
                            <button
                              type="button"
                              onClick={() => setPixConfig({ ...pixConfig, pixQRCodeImage: '' })}
                              className="ml-2 inline-flex items-center gap-2 px-4 h-10 border border-rose-200 text-rose-600 rounded-lg font-medium text-sm hover:bg-rose-50 transition"
                            >
                              Remover
                            </button>
                          )}
                          <p className="text-xs text-slate-400">
                            JPG, PNG ou WebP. Máx 2MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => setPaymentMethod(null)}
                      className="inline-flex items-center gap-2 px-4 h-12 text-slate-600 hover:text-slate-900 font-medium transition"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={skipStep}
                        className="text-slate-500 hover:text-slate-700 font-medium transition"
                      >
                        Configurar depois
                      </button>
                      <button
                        onClick={handleSavePix}
                        disabled={!pixConfig.pixKey || isSavingPix}
                        className="inline-flex items-center gap-2 px-6 h-12 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isSavingPix ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            Concluir
                            <IconCheck className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* MercadoPago OAuth Configuration */}
              {paymentMethod === 'mercadopago' && (
                <>
                  {/* Mensagem de sucesso após callback OAuth */}
                  {searchParams.get('oauth') === 'success' && (
                    <div className="mb-6 p-4 rounded-xl border bg-emerald-50 border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100">
                          <IconCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-emerald-900">MercadoPago conectado com sucesso!</p>
                          <p className="text-sm text-emerald-600">Sua conta está vinculada e pronta para receber pagamentos</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {searchParams.get('oauth') === 'error' && (
                    <div className="mb-6 p-4 rounded-xl border bg-rose-50 border-rose-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-100">
                          <IconAlert className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-medium text-rose-900">Erro ao conectar</p>
                          <p className="text-sm text-rose-600">{searchParams.get('message') || 'Tente novamente'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado: Conectado via OAuth */}
                  {oauthStatus === 'connected' && oauthData && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                        <IconCheck className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">MercadoPago Conectado!</h3>
                      <p className="text-slate-500 mb-2">
                        Conta: <span className="font-medium text-slate-700">{oauthData.email}</span>
                      </p>
                      <p className="text-slate-500 mb-6">
                        Sua conta está configurada e você já pode começar a vender
                      </p>
                      <button
                        onClick={handleOAuthSuccess}
                        className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
                      >
                        Concluir Onboarding
                        <IconArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Estado: Desconectado ou com credenciais legadas */}
                  {oauthStatus !== 'connected' && (
                    <>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <IconAlert className="w-5 h-5 text-indigo-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-indigo-900">Integração automática com OAuth</p>
                            <p className="text-sm text-indigo-700 mt-1">
                              Conecte sua conta do MercadoPago de forma segura. O dinheiro cai direto na sua conta e os pagamentos são confirmados automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Alerta de credenciais legadas */}
                      {hasLegacyCredentials && (
                        <div className="mb-6 p-4 rounded-xl border bg-amber-50 border-amber-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 flex-shrink-0">
                              <IconAlert className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-amber-900 text-sm">Você está usando credenciais antigas</p>
                              <p className="text-xs text-amber-700 mt-1">
                                Recomendamos reconectar via OAuth para mais segurança e praticidade.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lista de benefícios */}
                      <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                          </div>
                          Dinheiro cai na sua conta MercadoPago
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                          </div>
                          Confirmação automática de pagamentos
                        </li>
                        <li className="flex items-center gap-3 text-sm text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                          </div>
                          Sem necessidade de inserir credenciais manualmente
                        </li>
                      </ul>

                      {/* Botão de conectar */}
                      <button
                        onClick={initiateConnection}
                        disabled={isConnecting}
                        className="w-full h-12 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
                      >
                        {isConnecting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Conectando...
                          </>
                        ) : hasLegacyCredentials ? (
                          <>
                            <IconRefresh className="w-4 h-4" />
                            Reconectar com MercadoPago
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                            Conectar com MercadoPago
                          </>
                        )}
                      </button>

                      <div className="flex justify-between mt-6">
                        <button
                          onClick={() => setPaymentMethod(null)}
                          className="inline-flex items-center gap-2 px-4 h-12 text-slate-600 hover:text-slate-900 font-medium transition"
                        >
                          <IconArrowLeft className="w-4 h-4" />
                          Voltar
                        </button>
                        <button
                          onClick={skipStep}
                          className="text-slate-500 hover:text-slate-700 font-medium transition"
                        >
                          Configurar depois
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-sm text-slate-500">
            Precisa de ajuda?{' '}
            <a href="mailto:suporte@linkpagg.com" className="text-indigo-600 hover:underline">
              Entre em contato com o suporte
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
