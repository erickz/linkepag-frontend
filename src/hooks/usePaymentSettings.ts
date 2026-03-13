'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getProfile, 
  getMercadoPagoCredentials, 
  updateProfile, 
  updateMercadoPagoCredentials,
  invalidateProfileCache,
} from '@/lib/api';

export type PaymentMethod = 'mercadopago' | 'pix_direct' | null;

interface PixData {
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  key: string;
  qrCodeImage: string;
  notifyPendingPayments: boolean;
}

interface MercadoPagoData {
  publicKey: string;
  accessToken: string;
}

interface PaymentSettingsState {
  // Método selecionado na UI
  selectedMethod: PaymentMethod;
  // Método ativo (o que foi salvo por último)
  activeMethod: PaymentMethod;
  // Dados dos formulários
  mercadoPago: MercadoPagoData;
  pixDirect: PixData;
  // Estados da UI
  isLoading: boolean;
  isSaving: boolean;
  showCredentials: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
}

interface UsePaymentSettingsReturn {
  state: PaymentSettingsState;
  setSelectedMethod: (method: PaymentMethod) => void;
  setMercadoPagoData: (data: Partial<MercadoPagoData>) => void;
  setPixDirectData: (data: Partial<PixData>) => void;
  toggleShowCredentials: () => void;
  handleSave: () => Promise<void>;
  clearMessage: () => void;
  refreshData: () => Promise<void>;
}

// Validações
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

const validateMercadoPagoCredentials = (publicKey: string, accessToken: string): { valid: boolean; message?: string } => {
  if (!publicKey.trim()) {
    return { valid: false, message: 'Public Key é obrigatória' };
  }
  
  if (!accessToken.trim()) {
    return { valid: false, message: 'Access Token é obrigatório' };
  }

  const isValidPublicKey = publicKey.startsWith('TEST-') || publicKey.startsWith('APP_USR-');
  const isValidAccessToken = accessToken.startsWith('TEST-') || accessToken.startsWith('APP_USR-');

  if (!isValidPublicKey) {
    return { valid: false, message: 'Public Key deve começar com TEST- ou APP_USR-' };
  }

  if (!isValidAccessToken) {
    return { valid: false, message: 'Access Token deve começar com TEST- ou APP_USR-' };
  }

  return { valid: true };
};

export function usePaymentSettings(): UsePaymentSettingsReturn {
  const [state, setState] = useState<PaymentSettingsState>({
    selectedMethod: null,
    activeMethod: null,
    mercadoPago: {
      publicKey: '',
      accessToken: '',
    },
    pixDirect: {
      keyType: 'EMAIL',
      key: '',
      qrCodeImage: '',
      notifyPendingPayments: false,
    },
    isLoading: true,
    isSaving: false,
    showCredentials: false,
    message: null,
  });

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [profileData, mpData] = await Promise.all([
        getProfile(),
        getMercadoPagoCredentials(),
      ]);

      const hasMP = mpData.isConfigured && mpData.mercadoPagoPublicKey;
      const hasPix = !!profileData.pixKey;

      // O método ativo vem do backend (activePaymentMethod)
      // Se não houver preferência definida, infere baseado no que está configurado
      let activeMethod: PaymentMethod = profileData.activePaymentMethod || null;
      
      // Fallback: se não tem método ativo definido mas tem configuração, usa o que tem
      if (!activeMethod) {
        if (hasMP) {
          activeMethod = 'mercadopago';
        } else if (hasPix) {
          activeMethod = 'pix_direct';
        }
      }

      setState(prev => ({
        ...prev,
        selectedMethod: activeMethod,
        activeMethod,
        mercadoPago: {
          publicKey: mpData.mercadoPagoPublicKey || '',
          accessToken: '', // Não retornado por segurança
        },
        pixDirect: {
          keyType: profileData.pixKeyType || 'EMAIL',
          key: profileData.pixKey || '',
          qrCodeImage: profileData.pixQRCodeImage || '',
          notifyPendingPayments: profileData.notifyPendingPayments || false,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        message: { type: 'error', text: error.message || 'Erro ao carregar dados' },
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setSelectedMethod = useCallback((method: PaymentMethod) => {
    setState(prev => ({ ...prev, selectedMethod: method }));
  }, []);

  const setMercadoPagoData = useCallback((data: Partial<MercadoPagoData>) => {
    setState(prev => ({
      ...prev,
      mercadoPago: { ...prev.mercadoPago, ...data },
    }));
  }, []);

  const setPixDirectData = useCallback((data: Partial<PixData>) => {
    setState(prev => ({
      ...prev,
      pixDirect: { ...prev.pixDirect, ...data },
    }));
  }, []);

  const toggleShowCredentials = useCallback(() => {
    setState(prev => ({ ...prev, showCredentials: !prev.showCredentials }));
  }, []);

  const clearMessage = useCallback(() => {
    setState(prev => ({ ...prev, message: null }));
  }, []);

  const handleSave = useCallback(async () => {
    const { selectedMethod, mercadoPago, pixDirect } = state;

    if (!selectedMethod) {
      setState(prev => ({
        ...prev,
        message: { type: 'error', text: 'Selecione um método de pagamento' },
      }));
      return;
    }

    setState(prev => ({ ...prev, isSaving: true, message: null }));

    try {
      if (selectedMethod === 'mercadopago') {
        // Validar credenciais MP
        const validation = validateMercadoPagoCredentials(
          mercadoPago.publicKey,
          mercadoPago.accessToken
        );

        if (!validation.valid) {
          setState(prev => ({
            ...prev,
            isSaving: false,
            message: { type: 'error', text: validation.message || 'Credenciais inválidas' },
          }));
          return;
        }

        // Salvar credenciais MP (NÃO limpa o PIX)
        await updateMercadoPagoCredentials({
          mercadoPagoPublicKey: mercadoPago.publicKey,
          mercadoPagoAccessToken: mercadoPago.accessToken,
        });

        // Limpar apenas o accessToken do formulário por segurança
        setState(prev => ({
          ...prev,
          activeMethod: 'mercadopago',
          mercadoPago: { ...prev.mercadoPago, accessToken: '' },
          isSaving: false,
          message: { type: 'success', text: 'MercadoPago configurado! Agora é seu método de recebimento ativo. 🎉' },
        }));
      } else if (selectedMethod === 'pix_direct') {
        // Validar chave PIX
        const validation = validatePixKey(pixDirect.keyType, pixDirect.key);

        if (!validation.valid) {
          setState(prev => ({
            ...prev,
            isSaving: false,
            message: { type: 'error', text: validation.message || 'Chave PIX inválida' },
          }));
          return;
        }

        // Salvar dados PIX (NÃO limpa o MP)
        await updateProfile({
          pixKey: pixDirect.key,
          pixKeyType: pixDirect.keyType,
          pixQRCodeImage: pixDirect.qrCodeImage,
          notifyPendingPayments: pixDirect.notifyPendingPayments,
          activePaymentMethod: 'pix_direct',
        });

        setState(prev => ({
          ...prev,
          activeMethod: 'pix_direct',
          isSaving: false,
          message: { type: 'success', text: 'PIX Direto configurado! Agora é seu método de recebimento ativo. 🎉' },
        }));
      }

      // Invalidar cache do perfil
      invalidateProfileCache();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        message: { type: 'error', text: error.message || 'Erro ao salvar configurações' },
      }));
    }
  }, [state]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    state,
    setSelectedMethod,
    setMercadoPagoData,
    setPixDirectData,
    toggleShowCredentials,
    handleSave,
    clearMessage,
    refreshData,
  };
}
