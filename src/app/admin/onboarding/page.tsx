'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useMpOAuth } from '@/hooks/useMpOAuth';
import useMask from '@/hooks/useMask';
import { 
  getProfile, 
  getLinks,
  updateProfile, 
  updateUsername,
  createLink,
  uploadLinkFile,
  CACHE_KEYS 
} from '@/lib/api';
import { formatUrl, maskPriceInput, parsePrice, normalizeSocialUrl } from '@/lib/masks';
import { trackLinkCreated, trackLinkPaidCreated, trackPaymentConfigured, trackHasMonetizableAsset, trackQualifiedLead } from '@/lib/pixel-milestones';
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
import { SocialHandleInput } from '@/components/SocialHandleInput';
import { OnboardingProgress, onboardingSteps as steps } from '@/components/OnboardingProgress';
import { IconCheck, IconArrowRight, IconArrowLeft, IconUser, IconCreditCard, IconLink, IconAlert, IconHelp, IconRefresh, IconUnlink, IconUpload, IconChevronDown } from '@/components/icons';

// ORDEM CORRETA: Profile -> Payment -> Links (por último) -> Share (vive na rota /conclusao)
type MonetizableAssetType = 'infoproduto' | 'afiliado' | 'servico' | 'nada';

const monetizableAssetOptions: {
  id: MonetizableAssetType;
  label: string;
  description: string;
}[] = [
  { id: 'infoproduto', label: 'Infoproduto', description: 'Ebook, curso, planilha, etc.' },
  { id: 'afiliado', label: 'Afiliado', description: 'Divulgo produtos de outras pessoas' },
  { id: 'servico', label: 'Serviço', description: 'Mentoria, consultoria, freelancer, etc.' },
  { id: 'nada', label: 'Ainda nada', description: 'Só estou começando' },
];

// Redes do toggle "outras redes": instagram e tiktok ficam sempre visíveis
// na etapa 1 (pelo menos uma delas é obrigatória), então o toggle cobre só estas
const OPTIONAL_SOCIAL_KEYS = ['youtube', 'twitter', 'linkedin', 'github', 'website'] as const;

/**
 * Normaliza a chave PIX antes de enviar ao backend.
 * Deve ficar sincronizado com backend/src/users/dto/update-profile.dto.ts
 */
const normalizePixKey = (keyType: string, key: string): string => {
  const trimmed = key.trim();
  if (!trimmed) return trimmed;

  switch (keyType) {
    case 'CPF':
    case 'CNPJ':
      return trimmed.replace(/\D/g, '');

    case 'PHONE': {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length === 13 && digits.startsWith('55')) {
        return `+${digits}`;
      }
      if (digits.length === 11 || digits.length === 10) {
        return `+55${digits}`;
      }
      return digits;
    }

    case 'EMAIL':
      return trimmed.toLowerCase();

    case 'RANDOM':
    default:
      return trimmed;
  }
};

const validatePixKey = (keyType: string, key: string): { valid: boolean; message?: string } => {
  if (!key.trim()) {
    return { valid: false, message: 'Chave PIX é obrigatória' };
  }

  switch (keyType) {
    case 'CPF':
      if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key) && !/^\d{11}$/.test(key)) {
        return { valid: false, message: 'CPF deve estar no formato XXX.XXX.XXX-XX ou XXXXXXXXXXX' };
      }
      break;
    case 'CNPJ':
      if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key) && !/^\d{14}$/.test(key)) {
        return { valid: false, message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX' };
      }
      break;
    case 'EMAIL':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
        return { valid: false, message: 'Email inválido' };
      }
      break;
    case 'PHONE':
      if (!/^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(key) && !/^\d{10,11}$/.test(key)) {
        return { valid: false, message: 'Telefone deve estar no formato (XX) XXXXX-XXXX' };
      }
      break;
    case 'RANDOM':
      if (!/^[a-zA-Z0-9-]{32,}$/.test(key)) {
        return { valid: false, message: 'Chave aleatória inválida' };
      }
      break;
  }

  return { valid: true };
};

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
    bio: '',
    profilePhoto: '',
    socialLinks: {
      instagram: '',
      tiktok: '',
      youtube: '',
      twitter: '',
      linkedin: '',
      github: '',
      website: '',
    },
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  
  // Step 3: Links
  const [link, setLink] = useState({
    title: '',
    description: '',
    url: '',
    price: '',
    template: getDefaultLinkTemplate(),
    openInNewTab: true,
  });
  const [showAdvancedLinkFields, setShowAdvancedLinkFields] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [linkFormVisible, setLinkFormVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LinkTemplateId | null>(null);

  // Gate da etapa 3: pergunta "O que você vende?"
  // null = ainda não respondeu (mostra a tela-gate).
  // Lazy init no localStorage: fallback para o caso de falha de rede
  // (a resposta definitiva do perfil sobrescreve no loadProfile).
  const [monetizableAssetType, setMonetizableAssetType] = useState<
    MonetizableAssetType | null
  >(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('lp_monetizable_asset_type');
      if (
        cached === 'infoproduto' ||
        cached === 'afiliado' ||
        cached === 'servico' ||
        cached === 'nada'
      ) {
        return cached;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [savingAssetAnswer, setSavingAssetAnswer] = useState<
    MonetizableAssetType | null
  >(null);
  // Pagamento já configurado (para decidir o disparo de QualifiedLead)
  const [paymentConfigured, setPaymentConfigured] = useState(false);
  
  // Upload de arquivo (apenas para links monetizados)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  
  // Step 2: Payment Configuration (PIX or MercadoPago)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'mercadopago' | null>(null);
  
  // PIX configuration
  const [pixConfig, setPixConfig] = useState({
    pixKey: '',
    pixKeyType: 'CPF' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM',
    pixQRCodeImage: '',
    showPixOnPage: false,
    pixButtonText: '',
  });
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [showQrCodeField, setShowQrCodeField] = useState(false);
  const [showPixFlow, setShowPixFlow] = useState(false);
  const [showMpFlow, setShowMpFlow] = useState(false);

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

  const { cpfMask, cnpjMask, phoneMask } = useMask();

  const maskPixKey = (value: string, type: string): string => {
    switch (type) {
      case 'CPF':
        return cpfMask(value);
      case 'CNPJ':
        return cnpjMask(value);
      case 'PHONE':
        return phoneMask(value);
      default:
        return value;
    }
  };

  useProtectedRoute('/login');

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadExistingLinks();
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

  // Atualiza completedSteps e paymentMethod quando OAuth estiver conectado
  useEffect(() => {
    if (oauthStatus === 'connected') {
      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      if (!paymentMethod) {
        setPaymentMethod('mercadopago');
      }
    }
  }, [oauthStatus, paymentMethod]);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile({
        displayName: data.displayName || user?.fullName?.split(' ')[0] || '',
        username: data.username || '',
        bio: data.bio || '',
        profilePhoto: data.profilePhoto || '',
        socialLinks: {
          instagram: data.socialLinks?.instagram || '',
          tiktok: data.socialLinks?.tiktok || '',
          youtube: data.socialLinks?.youtube || '',
          twitter: data.socialLinks?.twitter || '',
          linkedin: data.socialLinks?.linkedin || '',
          github: data.socialLinks?.github || '',
          website: data.socialLinks?.website || '',
        },
      });
      if (data.socialLinks && OPTIONAL_SOCIAL_KEYS.some((key) => data.socialLinks?.[key])) {
        setShowSocialLinks(true);
      }
      if (data.displayName) {
        setCompletedSteps(prev => [...new Set([...prev, 'profile'])]);
      }
      // Detecta configuração de pagamento já existente
      if (data.pixKey) {
        setPixConfig({
          pixKey: data.pixKey,
          pixKeyType: data.pixKeyType || 'CPF',
          pixQRCodeImage: data.pixQRCodeImage || '',
          showPixOnPage: data.showPixOnPage ?? false,
          pixButtonText: data.pixButtonText || '',
        });
        if (data.pixQRCodeImage) {
          setShowQrCodeField(true);
        }
        setPaymentMethod('pix');
        setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      } else if (data.activePaymentMethod === 'mercadopago' || data.mercadoPagoConfigured) {
        setPaymentMethod('mercadopago');
        setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      }
      // Gate "O que você vende?": perfil manda; se não respondido,
      // cai no fallback localStorage (cobertura para falha de rede anterior)
      const loadedAssetType =
        data.monetizableAssetType ??
        (data.hasMonetizableAsset === true
          ? 'infoproduto'
          : data.hasMonetizableAsset === false
            ? 'nada'
            : null);
      if (loadedAssetType) {
        setMonetizableAssetType(loadedAssetType);
        try {
          localStorage.setItem('lp_monetizable_asset_type', loadedAssetType);
        } catch {
          // ignore
        }
      } else {
        try {
          const cached = localStorage.getItem('lp_monetizable_asset_type');
          if (
            cached === 'infoproduto' ||
            cached === 'afiliado' ||
            cached === 'servico' ||
            cached === 'nada'
          ) {
            setMonetizableAssetType(cached);
          }
        } catch {
          // ignore
        }
      }
      // Pagamento configurado = método ativo (PIX/MP) ou credenciais presentes no perfil
      const hasPix = data.activePaymentMethod === 'pix_direct' || !!data.pixKey;
      const hasMp =
        data.activePaymentMethod === 'mercadopago' ||
        !!data.mercadoPagoPublicKey ||
        data.mpOAuthConnected === true;
      setPaymentConfigured(hasPix || hasMp);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const loadExistingLinks = async () => {
    try {
      const data = await getLinks();
      const links = Array.isArray(data) ? data : (data.links || []);
      setExistingLinks(links);
      if (links.length > 0) {
        setCompletedSteps(prev => [...new Set([...prev, 'link'])]);
      }
    } catch (err) {
      console.error('Erro ao carregar links:', err);
    }
  };

  // Instagram ou TikTok preenchido (URLs canônicas ou ''): libera a etapa 1
  const hasRequiredSocial = Boolean(
    profile.socialLinks.instagram.trim() || profile.socialLinks.tiktok.trim()
  );

  // Alguma das redes do toggle "outras redes" preenchida
  const hasOptionalSocial = OPTIONAL_SOCIAL_KEYS.some((key) => profile.socialLinks[key]);

  const handleSaveProfile = async () => {
    if (!profile.displayName.trim()) return;

    // Instagram ou TikTok: pelo menos uma rede é obrigatória na etapa 1
    if (!hasRequiredSocial) {
      setSocialError('Adicione seu Instagram ou TikTok para continuar — é por lá que seus seguidores vão te achar.');
      return;
    }
    setSocialError(null);

    setIsLoadingProfile(true);
    try {
      // Atualiza dados do perfil (exceto username que tem endpoint separado)
      await updateProfile({
        displayName: profile.displayName,
        bio: profile.bio,
        profilePhoto: profile.profilePhoto,
        socialLinks: profile.socialLinks,
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
      setCurrentStep(1); // Vai para o passo 2: Pagamento
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
    
    // Só permite arquivo em Produto Digital
    if (link.template !== 'digital_product') {
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

  const handleCreateLink = async () => {
    const isMonetized = link.template === 'paid_access' || link.template === 'digital_product';
    // Validação por template
    if (!selectedTemplate || !link.title.trim() || (isMonetized && !link.price) || (!isMonetized && !link.url.trim()) || (link.template === 'paid_access' && !link.url.trim()) || (link.template === 'digital_product' && !selectedFile)) return;
    
    // Validação do arquivo
    if (selectedFile && selectedFile.size > 300 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 300MB');
      return;
    }
    
    setIsCreatingLink(true);
    try {
      const formattedUrl = formatUrl(link.url);
      const linkData: any = { 
        title: link.title, 
        description: link.description, 
        openInNewTab: link.openInNewTab, 
        template: link.template,
        price: isMonetized ? parsePrice(link.price) : 0,
      };
      
      // URL obrigatória para direct e scheduling
      if (formattedUrl && formattedUrl.trim() !== '' && formattedUrl !== 'https://') {
        linkData.url = formattedUrl;
      } else if (!isMonetized) {
        linkData.url = '';
      }
      
      const result = await createLink(linkData);
      const linkId = result.link?.id || result.id;

      const existingPaidLinksCount = existingLinks.filter(
        (l: any) => l.template === 'paid_access' || l.template === 'digital_product',
      ).length;

      // Meta Pixel: primeiro link (pago ou normal) e primeiro link pago
      if (existingLinks.length === 0 && user?.id) {
        trackLinkCreated(user.id);
      }
      if (isMonetized && existingPaidLinksCount === 0 && user?.id) {
        trackLinkPaidCreated(user.id, parsePrice(link.price) || 0);
      }
      
      // Upload do arquivo se selecionado (apenas para Produto Digital)
      if (selectedFile && linkId && link.template === 'digital_product') {
        setIsUploadingFile(true);
        try {
          await uploadLinkFile(linkId, selectedFile);
        } catch (err: any) {
          console.error('Erro no upload:', err);
        } finally {
          setIsUploadingFile(false);
        }
      }
      
      setCompletedSteps(prev => [...new Set([...prev, 'link'])]);
      finishOnboarding(); // Onboarding completo!
    } catch (err) {
      console.error('Erro ao criar link:', err);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleSavePix = async () => {
    if (!pixConfig.pixKey) return;

    const validation = validatePixKey(pixConfig.pixKeyType, pixConfig.pixKey);
    if (!validation.valid) {
      alert(validation.message || 'Chave PIX inválida');
      return;
    }
    
    setIsSavingPix(true);
    try {
      await updateProfile({
        pixKey: normalizePixKey(pixConfig.pixKeyType, pixConfig.pixKey),
        pixKeyType: pixConfig.pixKeyType,
        pixQRCodeImage: pixConfig.pixQRCodeImage || undefined,
        showPixOnPage: pixConfig.showPixOnPage,
        pixButtonText: pixConfig.pixButtonText || undefined,
        activePaymentMethod: 'pix_direct',
      });

      // Meta Pixel: pagamento configurado via PIX
      if (user?.id) {
        trackPaymentConfigured(user.id, 'pix');
      }
      setPaymentConfigured(true);

      setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
      setCurrentStep(2); // Vai para o passo 3: Links
    } catch (err) {
      console.error('Erro ao salvar PIX:', err);
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleOAuthSuccess = () => {
    // Meta Pixel: pagamento configurado via MercadoPago
    if (user?.id) {
      trackPaymentConfigured(user.id, 'mercadopago');
    }
    setPaymentConfigured(true);

    setCompletedSteps(prev => [...new Set([...prev, 'payment'])]);
    setCurrentStep(2); // Vai para o passo 3: Links
  };

  // Resposta do gate "O que você vende?"
  // UX não-bloqueante: mesmo se a API falhar, o usuário prossegue e a
  // resposta fica no localStorage como fallback.
  const handleAnswerMonetizableAsset = async (assetType: MonetizableAssetType) => {
    setSavingAssetAnswer(assetType);

    try {
      localStorage.setItem('lp_monetizable_asset_type', assetType);
    } catch {
      // ignore
    }

    try {
      await updateProfile({ monetizableAssetType: assetType });
    } catch (err) {
      console.error('Erro ao salvar resposta do onboarding:', err);
    }

    // Meta Pixel: só dispara quando a resposta é diferente de "nada"
    if (assetType !== 'nada' && user?.id) {
      trackHasMonetizableAsset(user.id, assetType);
      // Se o pagamento já estiver configurado, o lead já está qualificado
      if (paymentConfigured) {
        trackQualifiedLead(user.id);
      }
    }

    setMonetizableAssetType(assetType);
    setSavingAssetAnswer(null);
  };



  const skipOnboarding = () => {
    localStorage.setItem('lp_onboarding_skipped', 'true');
    router.push('/admin/dashboard');
  };

  const skipStep = () => {
    // Os painéis desta página cobrem só os passos 1-3; o passo 'share'
    // (último do array) vive na rota /admin/onboarding/conclusao
    const lastPanelIndex = steps.length - 2;
    if (currentStep < lastPanelIndex) {
      setCurrentStep(currentStep + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem('lp_onboarding_complete', 'true');
    router.push('/admin/onboarding/conclusao');
  };

  // Segurança: o passo 'share' não tem painel aqui. Se algum estado estranho
  // apontar para ele, finaliza e deixa a página de conclusão assumir.
  useEffect(() => {
    if (currentStep > steps.length - 2) {
      finishOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

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

  const selectedTemplateConfig = selectedTemplate ? getLinkTemplateById(selectedTemplate) : null;
  const selectedColor = selectedTemplateConfig ? linkTemplateColors[selectedTemplateConfig.color] : null;

  // Modo "criar novo link": sem links ainda OU formulário de novo link aberto.
  // Não usar completedSteps aqui — quem já tem links também pode criar outro.
  const isCreatingNewLink = existingLinks.length === 0 || showNewLinkForm;

  return (
    <div className="max-w-4xl mx-auto">
        <OnboardingProgress
          steps={steps}
          completedStepIds={completedSteps}
          currentStepId={steps[currentStep]?.id ?? steps[0].id}
          onStepClick={(index) => {
            // O passo 'share' não tem painel aqui — finaliza e cai na conclusão
            if (steps[index].id === 'share') {
              finishOnboarding();
              return;
            }
            setCurrentStep(index);
          }}
        />

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Profile */}
          {currentStep === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <IconUser className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{steps[0].title}</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                      Etapa 1 de 4
                    </span>
                  </div>
                  <p className="text-slate-500">{steps[0].description}</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Foto de perfil
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-slate-200 flex items-center justify-center">
                        {profile.profilePhoto ? (
                          <img
                            src={profile.profilePhoto}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center justify-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition cursor-pointer">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">Escolher foto</span>
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
                            className="inline-flex items-center justify-center gap-2 px-4 h-10 border border-rose-200 text-rose-600 rounded-lg font-medium text-sm hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="truncate">Remover</span>
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Username <span className="text-slate-400 font-normal">(opcional)</span>
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
                    Bio <span className="text-slate-400 font-normal">(opcional)</span>
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

                {/* Redes sociais em destaque: pelo menos uma é obrigatória */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Suas redes sociais *
                  </label>
                  <div className="space-y-3">
                    <SocialHandleInput
                      platform="instagram"
                      id="onboarding-instagram"
                      label="Instagram"
                      value={profile.socialLinks.instagram}
                      onChange={(url) => {
                        setProfile({
                          ...profile,
                          socialLinks: { ...profile.socialLinks, instagram: url },
                        });
                        setSocialError(null);
                      }}
                    />
                    <SocialHandleInput
                      platform="tiktok"
                      id="onboarding-tiktok"
                      label="TikTok"
                      value={profile.socialLinks.tiktok}
                      onChange={(url) => {
                        setProfile({
                          ...profile,
                          socialLinks: { ...profile.socialLinks, tiktok: url },
                        });
                        setSocialError(null);
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Preencha pelo menos uma — é nela que você vai colar o link da sua página para vender.
                  </p>
                  {socialError && (
                    <p className="text-sm text-rose-600 mt-2">{socialError}</p>
                  )}
                </div>

                {/* Outras redes - opcional, expansível */}
                <div>
                  {!showSocialLinks && !hasOptionalSocial && (
                    <button
                      type="button"
                      onClick={() => setShowSocialLinks(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                    >
                      Adicionar outras redes (opcional)
                    </button>
                  )}

                  {(showSocialLinks || hasOptionalSocial) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">
                          Outras redes <span className="text-slate-400 font-normal">(opcional)</span>
                        </label>
                        {!hasOptionalSocial && (
                          <button
                            type="button"
                            onClick={() => setShowSocialLinks(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition"
                          >
                            Ocultar
                          </button>
                        )}
                      </div>

                      {[
                        { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@seucanal' },
                        { key: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/seuusuario' },
                        { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seuusuario' },
                        { key: 'github', label: 'GitHub', placeholder: 'https://github.com/seuusuario' },
                        { key: 'website', label: 'Site Pessoal', placeholder: 'https://seusite.com' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            {label}
                          </label>
                          <input
                            type="url"
                            value={profile.socialLinks[key as keyof typeof profile.socialLinks] || ''}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                socialLinks: {
                                  ...profile.socialLinks,
                                  [key]: e.target.value,
                                },
                              })
                            }
                            onBlur={(e) =>
                              setProfile({
                                ...profile,
                                socialLinks: {
                                  ...profile.socialLinks,
                                  [key]: normalizeSocialUrl(key, e.target.value),
                                },
                              })
                            }
                            placeholder={placeholder}
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={!profile.displayName.trim() || !hasRequiredSocial || isLoadingProfile}
                  className="inline-flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

          {/* Step 3: Gate — pergunta antes do formulário de link (uma vez só) */}
          {currentStep === 2 && monetizableAssetType === null && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center py-6 sm:py-10">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 mx-auto mb-5">
                  <IconLink className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 mb-4">
                  Etapa 3 de 4
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  O que você vende?
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  Isso nos ajuda a direcionar você para as melhores funcionalidades.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {monetizableAssetOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerMonetizableAsset(option.id)}
                      disabled={savingAssetAnswer !== null}
                      className="inline-flex flex-col items-start gap-1 p-4 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {savingAssetAnswer === option.id ? (
                        <span className="flex items-center gap-2 text-indigo-600 font-semibold">
                          <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          Salvando...
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-900">{option.label}</span>
                          <span className="text-xs text-slate-500">{option.description}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Links */}
          {currentStep === 2 && monetizableAssetType !== null && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <IconLink className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Crie seu primeiro link</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                      Etapa 3 de 4
                    </span>
                  </div>
                  <p className="text-slate-500">Crie um link para vender infoproduto ou acesso a grupo VIP</p>
                </div>
              </div>

              {/* Estado: usuário já tem links */}
              {existingLinks.length > 0 && !showNewLinkForm && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mx-auto mb-3">
                    <IconCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">
                    Você já tem {existingLinks.length} link{existingLinks.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Sua página já está pronta para receber visitantes.
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowNewLinkForm(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 h-10 border border-emerald-200 text-emerald-700 bg-white rounded-lg font-medium hover:bg-emerald-50 transition"
                    >
                      Criar outro link
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de criação de link */}
              {(existingLinks.length === 0 || showNewLinkForm) && (
                <>
                  {/* Tipo de Link - Escolha primeiro */}
                  <div className="mb-6">
                    {!linkFormVisible ? (
                      <>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                          O que você quer fazer?
                        </label>
                        <LinkTemplateSelector
                          value={selectedTemplate}
                          onChange={(template) => {
                            setLink({ ...link, template });
                            setSelectedTemplate(template);
                            setLinkFormVisible(true);
                            if (template !== 'digital_product') {
                              setSelectedFile(null);
                              setFileError(null);
                            }
                          }}
                        />
                      </>
                    ) : selectedTemplate && selectedTemplateConfig && selectedColor ? (
                      <div className={`rounded-xl p-4 border ${selectedColor.border} ${selectedColor.bg} animate-in fade-in slide-in-from-top-2 duration-200`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedColor.iconBg}`}>
                              <selectedTemplateConfig.icon className={`w-5 h-5 ${selectedColor.iconText}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${selectedColor.text}`}>{selectedTemplateConfig.label}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{getTemplateContextDescription(selectedTemplate)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLinkFormVisible(false);
                              setSelectedTemplate(null);
                            }}
                            className="inline-flex items-center gap-1.5 self-start sm:self-center text-xs font-medium text-slate-600 hover:text-slate-900 transition shrink-0"
                          >
                            <IconRefresh className="w-3.5 h-3.5" />
                            Trocar tipo de link
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Form do Link */}
                  {linkFormVisible && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {getTitleLabel(link.template)}
                        </label>
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => setLink({ ...link, title: e.target.value })}
                          placeholder={getTitlePlaceholder(link.template)}
                          className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        />
                      </div>

                      {/* Preço - aparece se for pago */}
                      {isMonetizedTemplate(link.template) && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Quanto você quer cobrar? *
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={link.price}
                              onChange={(e) => setLink({ ...link, price: maskPriceInput(e.target.value) })}
                              placeholder="0,00"
                              className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                            />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            O valor será pago via PIX
                          </p>
                        </div>
                      )}

                      {/* URL do Link */}
                      {(isUrlRequired(link.template) || link.template === 'paid_access' || (link.template === 'digital_product' && showAdvancedLinkFields)) && (
                        <div className={isMonetizedTemplate(link.template) ? 'animate-in fade-in slide-in-from-top-2 duration-200' : ''}>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            {getUrlLabel(link.template)}
                          </label>
                          <input
                            type="url"
                            value={link.url || ''}
                            onChange={(e) => setLink({ ...link, url: e.target.value })}
                            onBlur={(e) => setLink({ ...link, url: formatUrl(e.target.value) })}
                            placeholder={getUrlPlaceholder(link.template)}
                            required={isUrlRequired(link.template) || link.template === 'paid_access'}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                            {getUrlHelpText(link.template)}
                          </p>
                        </div>
                      )}

                      {/* Upload de Arquivo - obrigatório para Produto Digital */}
                      {link.template === 'digital_product' && (
                        <div className="rounded-xl p-5 space-y-4 border-2 border-dashed bg-amber-50 border-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                              <IconUpload className="w-5 h-5" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-amber-900">
                                Arquivo que o cliente vai receber *
                              </label>
                              <p className="text-xs text-amber-700 mt-0.5">
                                PDF, imagem, vídeo, áudio, planilha ou documento • até 300 MB
                              </p>
                            </div>
                          </div>

                          {selectedFile && (
                            <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-100">
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

                      {/* Campos avançados: descrição */}
                      {showAdvancedLinkFields && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Descrição (opcional)
                            </label>
                            <textarea
                              value={link.description}
                              onChange={(e) => setLink({ ...link, description: e.target.value })}
                              placeholder="Breve descrição do link"
                              rows={2}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition resize-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Toggle campos avançados */}
                      {link.template !== 'direct' && link.template !== 'scheduling' && (
                        <button
                          type="button"
                          onClick={() => setShowAdvancedLinkFields((v) => !v)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                        >
                          {showAdvancedLinkFields ? 'Ocultar opções avançadas' : 'Mostrar opções avançadas'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className={`mt-8 ${linkFormVisible ? 'flex justify-end' : 'flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 justify-between'}`}>
                {!linkFormVisible && (
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
                  >
                    <IconArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                )}
                {(!isCreatingNewLink || linkFormVisible) && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {!completedSteps.includes('links') && (
                      <button
                        onClick={skipStep}
                        className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition"
                      >
                        Configurar depois
                      </button>
                    )}
                    <button
                      onClick={isCreatingNewLink ? handleCreateLink : finishOnboarding}
                      disabled={isCreatingNewLink ? (!link.title.trim() || ((link.template === 'direct' || link.template === 'scheduling') && !link.url.trim()) || ((link.template === 'paid_access' || link.template === 'digital_product') && !link.price) || (link.template === 'paid_access' && !link.url.trim()) || (link.template === 'digital_product' && !selectedFile) || isCreatingLink || isUploadingFile) : false}
                      className="inline-flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isCreatingNewLink ? (
                        isUploadingFile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Enviando arquivo...
                          </>
                        ) : isCreatingLink ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            Salvar e Finalizar
                            <IconCheck className="w-4 h-4" />
                          </>
                        )
                      ) : (
                        <>
                          Finalizar
                          <IconCheck className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Payment Configuration */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <IconCreditCard className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col items-start sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Como você quer receber pagamentos?</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                      Etapa 2 de 4
                    </span>
                  </div>
                  <p className="text-slate-500">
                    {
                      paymentMethod === 'pix'
                      ? 'Com o PIX você recebe diretamente na sua conta e deve confirmar os pagamentos manualmente'
                      : paymentMethod === 'mercadopago'
                      ? 'Com o MercadoPago os pagamentos são confirmados automaticamente e o dinheiro cai na sua conta MercadoPago'
                      : 'Escolha entre receber por PIX ou na sua conta MercadoPago'
                    }
                  </p>
                </div>
              </div>

              {/* Payment Method Selection */}
              {!paymentMethod && oauthStatus !== 'connected' && !pixConfig.pixKey && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* PIX Direct Option */}
                    <button
                      onClick={() => setPaymentMethod('pix')}
                      className="p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 transition text-left group"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mb-3 sm:mb-4 group-hover:bg-emerald-200 transition">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">PIX</h3>
                      <p className="text-sm text-slate-500">
                        Receba direto na sua conta. Você deve confirmar os pagamentos manualmente no painel administrativo
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 mt-4">
                        Receber com PIX
                        <IconArrowRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* MercadoPago Option */}
                    <button
                      onClick={() => setPaymentMethod('mercadopago')}
                      className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/60 transition text-left group"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mb-3 sm:mb-4 group-hover:bg-indigo-200 transition">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">MercadoPago</h3>
                      <p className="text-sm text-slate-500">
                        Receba na sua conta Mercadopago. Os pagamentos são confirmados automaticamente
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 mt-4">
                        Conectar MercadoPago
                        <IconArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>

                  <div className={`${completedSteps.includes('payment') ? 'flex justify-end' : 'flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 justify-between'}`}>
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    {!completedSteps.includes('payment') && (
                      <button
                        onClick={skipStep}
                        className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition"
                      >
                        Configurar depois
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* PIX Configuration Form */}
              {paymentMethod === 'pix' && (
                <>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Chave PIX *
                        </label>
                        <input
                          type="text"
                          value={pixConfig.pixKey}
                          onChange={(e) => setPixConfig({ ...pixConfig, pixKey: maskPixKey(e.target.value, pixConfig.pixKeyType) })}
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

                    {/* Como funciona o PIX Direto - Accordion */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowPixFlow((v) => !v)}
                        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <IconHelp className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            Como funciona a venda com PIX?
                          </span>
                        </div>
                        <IconChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showPixFlow ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {showPixFlow && (
                        <div className="px-4 pt-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <ol className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">1</span>
                              <p className="text-sm text-slate-600">Seu cliente acessa seu link da bio, clica em um link de acesso/infoproduto</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                              <p className="text-sm text-slate-600">Ele preenche o formulário e copia a chave PIX ou QR code para realizar o pagamento</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                              <p className="text-sm text-slate-600">Você recebe um aviso por email para confirmar se o pagamento foi realizado corretamente</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">4</span>
                              <p className="text-sm text-slate-600">Você acesse o painel para confirmar o pagamento e liberar o link de acesso/infoproduto ao comprador</p>
                            </li>
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* QR Code Upload - opção avançada oculta */}
                    {!showQrCodeField && !pixConfig.pixQRCodeImage && (
                      <button
                        type="button"
                        onClick={() => setShowQrCodeField(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                      >
                        Adicionar QR Code (opcional)
                      </button>
                    )}

                    {(showQrCodeField || pixConfig.pixQRCodeImage) && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-slate-700">
                            QR Code (opcional)
                          </label>
                          {!pixConfig.pixQRCodeImage && (
                            <button
                              type="button"
                              onClick={() => setShowQrCodeField(false)}
                              className="text-xs text-slate-400 hover:text-slate-600 transition"
                            >
                              Ocultar
                            </button>
                          )}
                        </div>
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
                    )}
                  </div>

                  {/* Checkbox para exibir o botão de PIX na página pública */}
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={pixConfig.showPixOnPage}
                          onChange={(e) => setPixConfig({ ...pixConfig, showPixOnPage: e.target.checked })}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                        <svg
                          className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-1 top-1"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                          Exibir botão de PIX na minha página
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Quem visitar sua página pode te mandar um PIX com um toque, sem comprar nada
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Texto do botão de PIX */}
                  {pixConfig.showPixOnPage && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Texto do botão
                      </label>
                      <input
                        type="text"
                        value={pixConfig.pixButtonText}
                        onChange={(e) => setPixConfig({ ...pixConfig, pixButtonText: e.target.value })}
                        placeholder="Me mande um PIX"
                        maxLength={40}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Deixe em branco para usar o padrão
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 justify-between mt-8">
                    <button
                      onClick={() => setPaymentMethod(null)}
                      className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
                    >
                      <IconArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      {!completedSteps.includes('payment') && (
                        <button
                          onClick={skipStep}
                          className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition"
                        >
                          Configurar depois
                        </button>
                      )}
                      <button
                        onClick={handleSavePix}
                        disabled={!pixConfig.pixKey || isSavingPix}
                        className="inline-flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isSavingPix ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            Salvar e continuar
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
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100">
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
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-rose-100">
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
                      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mx-auto mb-4">
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
                        className="inline-flex items-center justify-center gap-2 px-6 h-12 w-full sm:w-auto bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
                      >
                        Continuar
                        <IconArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Estado: Desconectado ou com credenciais legadas */}
                  {oauthStatus !== 'connected' && (
                    <>
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

                      {/* Como funciona a venda com MercadoPago - Accordion */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden mb-6">
                        <button
                          type="button"
                          onClick={() => setShowMpFlow((v) => !v)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              <IconHelp className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">
                              Como funciona a venda com MercadoPago?
                            </span>
                          </div>
                          <IconChevronDown
                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showMpFlow ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {showMpFlow && (
                          <div className="px-4 pt-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <ol className="space-y-3">
                              <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
                                <p className="text-sm text-slate-600">Seu cliente acessa seu link da bio, clica em um link de acesso/infoproduto</p>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                                <p className="text-sm text-slate-600">Ele preenche o formulário e copia a chave PIX ou QR code para realizar o pagamento</p>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
                                <p className="text-sm text-slate-600">O pagamento é processado e confirmado automaticamente pelo MercadoPago</p>
                              </li>
                              <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span>
                                <p className="text-sm text-slate-600">O dinheiro cai na sua conta MercadoPago e o acesso/conteúdo é liberado automaticamente para o comprador</p>
                              </li>
                            </ol>
                          </div>
                        )}
                      </div>

                      {/* Botão de conectar */}
                      <button
                        onClick={() => initiateConnection('/admin/onboarding')}
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

                      <div className={`${completedSteps.includes('payment') ? 'flex justify-end' : 'flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 justify-between'} mt-6`}>
                        <button
                          onClick={() => setPaymentMethod(null)}
                          className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition"
                        >
                          <IconArrowLeft className="w-4 h-4" />
                          Voltar
                        </button>
                        {!completedSteps.includes('payment') && (
                          <button
                            onClick={skipStep}
                            className="inline-flex items-center justify-center gap-2 px-4 h-12 w-full sm:w-auto border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition"
                          >
                            Configurar depois
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
