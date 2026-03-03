'use client';

import { useState, useCallback, useRef } from 'react';

interface LoginAttempt {
  timestamp: number;
  success: boolean;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60000; // 1 minuto
const INITIAL_DELAY_MS = 1000; // 1 segundo
const MAX_DELAY_MS = 30000; // 30 segundos

export function useLoginThrottle() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const attemptsRef = useRef<LoginAttempt[]>([]);

  const checkAndRecordAttempt = useCallback(() => {
    const now = Date.now();
    
    // Remove tentativas antigas fora da janela de tempo
    attemptsRef.current = attemptsRef.current.filter(
      (attempt) => now - attempt.timestamp < WINDOW_MS
    );

    // Verifica se atingiu o limite de tentativas
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      const oldestAttempt = attemptsRef.current[0];
      const remaining = WINDOW_MS - (now - oldestAttempt.timestamp);
      setRemainingTime(Math.ceil(remaining / 1000));
      setIsBlocked(true);
      
      // Schedule unblock
      setTimeout(() => {
        setIsBlocked(false);
        setRemainingTime(0);
        attemptsRef.current = []; // Limpa tentativas antigas
      }, remaining);
      
      return { blocked: true, remainingTime: Math.ceil(remaining / 1000) };
    }

    // Calcula delay exponencial baseado no número de tentativas
    const failedAttempts = attemptsRef.current.filter((a) => !a.success).length;
    const delay = Math.min(
      INITIAL_DELAY_MS * Math.pow(2, failedAttempts),
      MAX_DELAY_MS
    );

    setIsBlocked(false);
    return { blocked: false, delay };
  }, []);

  const recordSuccess = useCallback(() => {
    attemptsRef.current.push({ timestamp: Date.now(), success: true });
    setIsBlocked(false);
    setRemainingTime(0);
  }, []);

  const recordFailure = useCallback(() => {
    attemptsRef.current.push({ timestamp: Date.now(), success: false });
    checkAndRecordAttempt();
  }, [checkAndRecordAttempt]);

  const resetAttempts = useCallback(() => {
    attemptsRef.current = [];
    setIsBlocked(false);
    setRemainingTime(0);
  }, []);

  return {
    isBlocked,
    remainingTime,
    checkAndRecordAttempt,
    recordSuccess,
    recordFailure,
    resetAttempts,
  };
}
