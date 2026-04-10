'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { IconUser, IconMail, IconCreditCard, IconArrowRight, IconCreditCard as IconPayment } from '@/components/icons';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function PersonalSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
  });

  // Load profile data directly
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/login');
            return;
          }
          throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        setProfileData(data);
        setFormData({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: formatCPF(data.cpf || ''),
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        setMessage({ type: 'error', text: 'Erro ao carregar perfil' });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          cpf: formData.cpf || undefined,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar');
      }

      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCPF = (value: string) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, '$1.$2');
    return v;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dados Pessoais"
        description="Suas informações de identificação e cadastro"
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Dados Pessoais' }]}
      />

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Data Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <IconUser className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dados de Cadastro</h2>
              <p className="text-sm text-slate-500">Informações da sua conta</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome completo</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <IconMail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">Email não pode ser alterado</p>
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <IconPhone className="w-4 h-4 inline mr-1" />
                  Telefone (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <IconCreditCard className="w-4 h-4 inline mr-1" />
                  CPF {profileData?.cpf && <span className="text-slate-400 font-normal">(cadastrado)</span>}
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                  disabled={!!profileData?.cpf}
                  maxLength={14}
                  className={`w-full h-11 px-4 rounded-lg border transition text-sm ${
                    profileData?.cpf 
                      ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed' 
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none'
                  }`}
                  placeholder="000.000.000-00"
                />
                {profileData?.cpf ? (
                  <p className="text-xs text-slate-400 mt-1">CPF não pode ser alterado após cadastrado</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">CPF necessário para receber pagamentos via PIX com gateways</p>
                )}
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <IconCreditCard className="w-4 h-4 inline mr-1" />
                CPF {profileData?.cpf && <span className="text-slate-400 font-normal">(cadastrado)</span>}
              </label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                disabled={!!profileData?.cpf}
                maxLength={14}
                className={`w-full h-11 px-4 rounded-lg border transition text-sm ${
                  profileData?.cpf 
                    ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed' 
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none'
                }`}
                placeholder="000.000.000-00"
              />
              {profileData?.cpf ? (
                <p className="text-xs text-slate-400 mt-1">CPF não pode ser alterado após cadastrado</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">CPF necessário para receber pagamentos via PIX</p>
              )}
            </div> */}
          </div>
        </div>

        {/* Payment Settings Card - Link to new page */}
        <Link 
          href="/admin/settings/payments"
          className="block bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <IconPayment className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition">Configurações de Pagamento</h2>
              <p className="text-sm text-slate-600">
                Configure seu MercadoPago ou PIX Direto para receber pagamentos
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
              <IconArrowRight className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </Link>

        <button type="submit" disabled={isSaving} className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-lg transition-all ${
          isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98]'
        }`}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}
