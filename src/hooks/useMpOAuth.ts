'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  initiateMpOAuth as apiInitiateMpOAuth,
  getMpOAuthStatus as apiGetMpOAuthStatus,
  disconnectMpOAuth as apiDisconnectMpOAuth,
} from '@/lib/api';

export type MpOAuthStatus = 'loading' | 'connected' | 'disconnected' | 'error';

export interface MpOAuthConnectionData {
  email: string;
  connectedAt: Date;
}

export interface UseMpOAuthReturn {
  status: MpOAuthStatus;
  connectionData?: MpOAuthConnectionData;
  hasLegacyCredentials: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  initiateConnection: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  error?: string;
}

export function useMpOAuth(): UseMpOAuthReturn {
  const [status, setStatus] = useState<MpOAuthStatus>('loading');
  const [connectionData, setConnectionData] = useState<MpOAuthConnectionData | undefined>(undefined);
  const [hasLegacyCredentials, setHasLegacyCredentials] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Verifica o status da conexão OAuth
  const checkStatus = useCallback(async () => {
    try {
      const response = await apiGetMpOAuthStatus();
      
      if (response.connected) {
        setStatus('connected');
        setConnectionData({
          email: response.email,
          connectedAt: new Date(response.connectedAt),
        });
      } else {
        setStatus('disconnected');
        setConnectionData(undefined);
      }
      
      // Verifica se tem credenciais manuais (legado)
      setHasLegacyCredentials(response.hasLegacyCredentials || false);
      setError(undefined);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Erro ao verificar status da conexão');
    }
  }, []);

  // Carrega status inicial
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Inicia o fluxo OAuth - redireciona para o MercadoPago
  const initiateConnection = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);

    try {
      const response = await apiInitiateMpOAuth();
      
      if (response.authUrl) {
        // Salva estado temporário no sessionStorage para recuperar após callback
        sessionStorage.setItem('mp_oauth_pending', 'true');
        sessionStorage.setItem('mp_oauth_timestamp', Date.now().toString());
        
        // Redireciona para o MercadoPago
        window.location.href = response.authUrl;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (err: any) {
      setIsConnecting(false);
      setError(err.message || 'Erro ao iniciar conexão com MercadoPago');
      throw err;
    }
  }, []);

  // Desconecta o OAuth
  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(undefined);

    try {
      await apiDisconnectMpOAuth();
      setStatus('disconnected');
      setConnectionData(undefined);
      setHasLegacyCredentials(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar');
      throw err;
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  // Atualiza o status (útil após callback)
  const refreshStatus = useCallback(async () => {
    setStatus('loading');
    await checkStatus();
  }, [checkStatus]);

  return {
    status,
    connectionData,
    hasLegacyCredentials,
    isConnecting,
    isDisconnecting,
    initiateConnection,
    disconnect,
    refreshStatus,
    error,
  };
}
