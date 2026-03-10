'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { 
  getProfile, 
  updateProfile, 
  updateUsername,
  getMercadoPagoCredentials, 
  updateMercadoPagoCredentials,
  createLink,
  CACHE_KEYS 
} from '@/lib/api';
import { IconCheck, IconArrowRight, IconArrowLeft, IconUser, IconCreditCard, IconLink, IconAlert, IconHelp } from '@/components/icons';
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
  });
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  
  // Step 3: Payment Configuration (PIX or MercadoPago)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'mercadopago' | null>(null);
  
  // PIX configuration
  const [pixConfig, setPixConfig] = useState({
    pixKey: '',
    pixKeyType: 'CPF' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM',
    pixQRCodeImage: '',
  });
  const [isSavingPix, setIsSavingPix] = useState(false);
  
  // MercadoPago configuration
  const [mpCredentials, setMpCredentials] = useState({
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: '',
  });
  const [isMpConfigured, setIsMpConfigured] = useState(false);
  const [isSavingMp, setIsSavingMp] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  useProtectedRoute('/login');

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadMpStatus();
    }
  }, [isAuthenticated]);

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

  const loadMpStatus = async () => {
    try {
      const data = await getMercadoPagoCredentials();
      setIsMpConfigured(data.isConfigured);
      if (data.mercadoPagoPublicKey) {
        setMpCredentials(prev => ({ ...prev, mercadoPagoPublicKey: data.mercadoPagoPublicKey }));
      }
      if (data.isConfigured) {
        setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      }
    } catch (err) {
      console.error('Erro ao carregar MP:', err);
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

  const handleCreateLink = async () => {
    if (!link.title.trim() || (link.type === 'paid' && !link.price)) return;
    
    setIsCreatingLink(true);
    try {
      await createLink({
        title: link.title,
        description: link.description,
        url: link.url || '#',
        type: link.type,
        price: link.type === 'paid' ? parseFloat(link.price) : 0,
        isPaid: link.type === 'paid',
      });
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

  const handleSaveMp = async () => {
    if (!mpCredentials.mercadoPagoPublicKey || !mpCredentials.mercadoPagoAccessToken) return;
    
    setIsSavingMp(true);
    try {
      await updateMercadoPagoCredentials(mpCredentials);
      setIsMpConfigured(true);
      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      // Onboarding completo!
      localStorage.setItem('lp_onboarding_complete', 'true');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Erro ao salvar MP:', err);
    } finally {
      setIsSavingMp(false);
    }
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
                      Venda produtos, serviços ou conteúdos. Seu cliente paga via PIX para acessar.
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setLink({ ...link, type: 'free', price: '' })}
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
                      Compartilhe conteúdo gratuito, redes sociais ou qualquer link sem cobrança.
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
                    URL do link *
                  </label>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => setLink({ ...link, url: e.target.value })}
                    placeholder={link.type === 'paid' ? "https://exemplo.com/seu-produto" : "https://instagram.com/seuperfil"}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {link.type === 'paid' 
                      ? "Link que o cliente acessará após confirmar o pagamento (obrigatório)" 
                      : "Endereço para onde seus visitantes serão direcionados"}
                  </p>
                </div>

                {/* Preço - só aparece se for pago */}
                {link.type === 'paid' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
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
                )}

                {/* Info box baseada no tipo */}
                {link.type === 'paid' ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <IconCreditCard className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-indigo-900 text-sm">Como funciona o link monetizado?</p>
                        <p className="text-xs text-indigo-700 mt-1">
                          Você define o preço e o cliente paga via PIX antes de acessar. 
                          No próximo passo você configura sua conta para receber os pagamentos.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <IconCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-900 text-sm">Link comum</p>
                        <p className="text-xs text-emerald-700 mt-1">
                          Ótimo para compartilhar redes sociais, portfólio ou atrair leads. 
                          Você pode adicionar links monetizados depois.
                        </p>
                      </div>
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
                    disabled={!link.title.trim() || !link.url.trim() || (link.type === 'paid' && !link.price) || isCreatingLink}
                    className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isCreatingLink ? (
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
              {!paymentMethod && !isMpConfigured && (
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

              {/* MercadoPago Configuration Form */}
              {paymentMethod === 'mercadopago' && (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <IconAlert className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-indigo-900">Integração completa</p>
                        <p className="text-sm text-indigo-700 mt-1">
                          O MercadoPago gera QR Codes automaticamente e notifica quando o pagamento é confirmado.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Public Key
                      </label>
                      <input
                        type="text"
                        value={mpCredentials.mercadoPagoPublicKey}
                        onChange={(e) => setMpCredentials({ ...mpCredentials, mercadoPagoPublicKey: e.target.value })}
                        placeholder="TEST-f44e5241-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Access Token
                      </label>
                      <div className="relative">
                        <input
                          type={showAccessToken ? 'text' : 'password'}
                          value={mpCredentials.mercadoPagoAccessToken}
                          onChange={(e) => setMpCredentials({ ...mpCredentials, mercadoPagoAccessToken: e.target.value })}
                          placeholder="TEST-2372715816013223-..."
                          className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccessToken(!showAccessToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showAccessToken ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="font-medium text-slate-900 mb-3">Como obter suas credenciais:</p>
                      <ol className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                          Acesse o <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Portal de Desenvolvedores</a>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                          Faça login com sua conta do MercadoPago
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                          Vá em &quot;Suas integrações&quot; e crie uma nova aplicação
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                          Copie a Public Key e o Access Token
                        </li>
                      </ol>
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
                        onClick={handleSaveMp}
                        disabled={!mpCredentials.mercadoPagoPublicKey || !mpCredentials.mercadoPagoAccessToken || isSavingMp}
                        className="inline-flex items-center gap-2 px-6 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isSavingMp ? (
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

              {isMpConfigured && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <IconCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Tudo pronto!</h3>
                  <p className="text-slate-500 mb-6">
                    Sua conta está configurada e você já pode começar a vender
                  </p>
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
                  >
                    Ir para o Dashboard
                    <IconArrowRight className="w-4 h-4" />
                  </Link>
                </div>
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
