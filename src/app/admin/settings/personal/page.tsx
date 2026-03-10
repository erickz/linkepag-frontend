'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { IconUser, IconMail, IconPhone, IconCreditCard, IconQrcode } from '@/components/icons';

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
    pixKey: '',
    pixKeyType: 'CPF' as const,
    pixQRCodeImage: '',
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
          pixKey: data.pixKey || '',
          pixKeyType: data.pixKeyType || 'CPF',
          pixQRCodeImage: data.pixQRCodeImage || '',
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
          pixKey: formData.pixKey || undefined,
          pixKeyType: formData.pixKeyType,
          pixQRCodeImage: formData.pixQRCodeImage || undefined,
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

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Imagem deve ter no máximo 2MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let { width, height } = img;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }}
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }}
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setFormData(prev => ({ ...prev, pixQRCodeImage: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
                  <p className="text-xs text-slate-400 mt-1">CPF necessário para receber pagamentos via PIX</p>
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

        {/* PIX Settings Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <IconQrcode className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Configurações PIX</h2>
              <p className="text-sm text-slate-500">Receba pagamentos diretamente</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Chave PIX</label>
                <input
                  type="text"
                  value={formData.pixKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
                  placeholder="CPF, email, celular ou chave aleatória"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo da Chave</label>
                <select
                  value={formData.pixKeyType}
                  onChange={(e) => setFormData(prev => ({ ...prev, pixKeyType: e.target.value as any }))}
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm bg-white"
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
              <label className="block text-sm font-medium text-slate-700 mb-3">Envie uma imagem do QR Code (opcional)</label>
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                    {formData.pixQRCodeImage ? (
                      <img src={formData.pixQRCodeImage} alt="QR Code" className="w-full h-full object-cover" />
                    ) : (
                      <IconQrcode className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <label className="inline-flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition cursor-pointer">
                      <span>{formData.pixQRCodeImage ? 'Trocar QR Code' : 'Adicionar QR Code'}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleQRUpload} className="hidden" />
                    </label>
                    {formData.pixQRCodeImage && (
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, pixQRCodeImage: '' }))} className="px-4 h-10 border border-rose-200 text-rose-600 rounded-lg font-medium text-sm hover:bg-rose-50 transition">
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">JPG, PNG ou WebP. Máx 2MB.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Como funciona?</span> Ao cadastrar sua chave PIX, seus clientes poderão pagar diretamente para você sem precisar do MercadoPago.
              </p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-lg transition-all ${
          isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98]'
        }`}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
}
