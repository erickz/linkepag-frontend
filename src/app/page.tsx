import Link from "next/link";
import { Metadata } from "next";
import { MobileMenu } from "./components/MobileMenu";
import { Logo } from "@/components/Logo";
import { AuthNavButton } from "@/components/AuthNavButton";
import { PricingSection } from "./components/PricingSection";
import {
  IconQRCode,
  IconInstant,
  IconShield,
  IconCheck,
  IconPencil,
  IconLinkChain,
  IconRocket,
  IconZap,
  IconTrendingUp,
  IconUser,
  IconBookOpen,
  IconGraduationCap,
  IconCamera,
  IconVideo,
  IconMusic,
} from "./components/FeatureIcons";

// Metadados otimizados para SEO
export const metadata: Metadata = {
  title: "LinkePag - Monetize sua audiência",
  description: "Crie uma página única para seus links e receba pagamentos via PIX. Sua link-in-bio que vende mais.",
  keywords: ["link in bio", "links", "pix", "pagamentos", "criadores", "monetização"],
  authors: [{ name: "LinkePag" }],
  openGraph: {
    title: "LinkePag - Monetize sua audiência",
    description: "Crie uma página única para seus links e receba pagamentos via PIX",
    type: "website",
  },
};

// Componente do QR Code - Usa imagem PNG real do site
function QRCodeImage() {
  return (
    <img 
      src="/images/qrcode-site.png" 
      alt="QR Code para pagamento PIX"
      className="w-[120px] h-[120px]"
      width={120}
      height={120}
    />
  );
}

// Server Component principal
export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navbar Fixa e Centralizada - Desktop */}
      <nav className="hidden lg:block fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-6 py-2 border border-slate-200">
        <div className="flex items-center gap-6">
          <Link href="/" className="mr-2 hover:opacity-90 transition-opacity">
            <Logo size="sm" showText={true} />
          </Link>
          <div className="w-px h-6 bg-slate-200" />
          <a href="#hero" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Início
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Como funciona
          </a>
          <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Planos
          </a>
          <Link
              href="/login" className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition shadow-md shadow-emerald-200">
            Login
          </Link>
        </div>
      </nav>

      {/* Navbar Mobile - Client Component isolado */}
      <MobileMenu />

      <div className="lg:hidden h-16" />

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f0fdfa 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-indigo-100">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Checkout PIX integrado
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-slate-900 mb-6">
                Seu link na bio que{" "}
                <span className="text-indigo-600">vende mais</span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Crie uma página única para seus links, produtos e receba pagamentos via <strong>PIX</strong> — sua audiência compra sem sair do instagram/tik tok.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <AuthNavButton className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition">
                  Criar página grátis
                </AuthNavButton>
                <a href="#how-it-works" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 transition border border-slate-200">
                  Ver como funciona
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <IconShield className="w-5 h-5" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-5 h-5" />
                  <span>Grátis para começar</span>
                </div>
              </div>
            </div>

            {/* Right - Mobile Preview */}
            <div id="demo" className="flex justify-center">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[3rem] blur-2xl" />
                
                <div className="relative rounded-[2.5rem] bg-slate-900 p-2 shadow-2xl shadow-indigo-500/20">
                  <div className="relative rounded-[2rem] overflow-hidden w-72 aspect-[9/19] shadow-inner bg-white">
                    
                    {/* Status Bar - iOS Style */}
                    <div className="absolute top-0 inset-x-0 h-8 bg-white flex items-center justify-between px-5 text-xs font-medium text-slate-900 z-20">
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-10 px-3 pb-6 h-full overflow-y-auto">
                      
                      {/* Profile Header */}
                      <div className="text-center mb-5">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 p-[2px] mx-auto mb-3 overflow-hidden">
                          <img 
                            src="/images/demo-creator.jpg" 
                            alt="Ana Creator"
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <h1 className="text-slate-900 font-bold text-lg">@anacreator</h1>
                        <p className="text-slate-500 text-sm">🎨 Designer & Criadora de Conteúdo</p>
                      </div>

                      {/* Links */}
                      <div className="space-y-2.5">
                        
                        {/* Free Link */}
                        <button className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <IconBookOpen className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">E-book Gratuito</div>
                            <div className="text-xs text-slate-400">Guia para iniciantes</div>
                          </div>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Paid Link + Inline Checkout */}
                        <div className="space-y-0">
                          {/* Link Button - Cor profissional/autoridade */}
                          <button className="w-full bg-indigo-600 text-white rounded-t-xl rounded-b-none p-3 flex items-center gap-3 shadow-lg shadow-indigo-500/25">
                            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                              <IconGraduationCap className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm">Curso Completo</div>
                              <div className="text-xs text-white/75">Conteúdo exclusivo</div>
                            </div>
                            <span className="font-bold">R$ 97</span>
                          </button>

                          {/* Inline Checkout - Sem bordas arredondadas no topo para continuidade */}
                          <div className="bg-white border-x border-b border-slate-200 rounded-b-xl rounded-t-none p-3 shadow-md">
                            <div className="bg-white rounded-lg flex items-center justify-center py-2 mb-3">
                              <QRCodeImage />
                            </div>
                            <button className="w-full h-9 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copiar código PIX
                            </button>
                          </div>
                        </div>

                        {/* Another Link */}
                        <button className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <IconVideo className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">YouTube</div>
                            <div className="text-xs text-slate-400">Meus tutoriais</div>
                          </div>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>

                      </div>

                      {/* Social Icons */}
                      <div className="flex justify-center gap-3 mt-5 pt-4 border-t border-slate-100">
                        {[IconCamera, IconVideo, IconMusic].map((Icon, i) => (
                          <button key={i} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center text-slate-600">
                            <Icon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>

                      {/* Footer */}
                      <p className="text-center text-[10px] text-slate-400 mt-6">LinkePag</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <IconZap className="w-4 h-4" />
              Tudo que você precisa
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Venda mais, com menos <span className="text-indigo-600">fricção</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Uma plataforma completa pensada para criadores que querem monetizar sua audiência sem complicação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition" />
              <div className="relative">
                <div className="mb-6 p-4 rounded-2xl bg-indigo-600 text-white w-fit shadow-lg shadow-indigo-500/30">
                  <IconQRCode className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">PIX Integrado</h3>
                <p className="text-slate-600 leading-relaxed">
                  QR code e código copia-cola na própria página. Seu cliente paga em segundos e você recebe na hora.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition" />
              <div className="relative">
                <div className="mb-6 p-4 rounded-2xl bg-teal-600 text-white w-fit shadow-lg shadow-teal-500/30">
                  <IconInstant className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Checkout na mesma linha</h3>
                <p className="text-slate-600 leading-relaxed">
                  Sem redirecionamentos. O pagamento acontece dentro da sua página, aumentando drasticamente a conversão.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition" />
              <div className="relative">
                <div className="mb-6 p-4 rounded-2xl bg-amber-500 text-white w-fit shadow-lg shadow-amber-500/30">
                  <IconTrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Preço Justo</h3>
                <p className="text-slate-600 leading-relaxed">
                  Comece grátis com 3 links monetizados. Upgrade a partir de R$ 19,90/mês para mais links e taxas menores.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { text: "Sem mensalidade" },
              { text: "Sem cartão de crédito" },
              { text: "Pagamento instantâneo" },
              { text: "Suporte humano" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <IconCheck className="w-5 h-5" />
                </div>
                <span className="font-medium text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <IconRocket className="w-4 h-4" />
              Rápido e fácil
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Comece a vender em <span className="text-indigo-400">3 passos</span>
            </h2>
            <p className="text-lg text-slate-400">Sua página pronta em menos de 5 minutos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "01",
                title: "Crie sua conta",
                description: "Cadastro simples e rápido. Sem burocracia, sem cartão de crédito.",
                icon: IconPencil,
                color: "indigo"
              },
              {
                number: "02",
                title: "Adicione seus links",
                description: "Configure seus produtos, preços e chave PIX. Tudo muito intuitivo.",
                icon: IconLinkChain,
                color: "teal"
              },
              {
                number: "03",
                title: "Compartilhe e venda",
                description: "Cole seu link na bio do Instagram/Tik Tok e comece a receber pagamentos.",
                icon: IconRocket,
                color: "amber"
              }
            ].map((step, i) => (
              <div key={step.number} className="relative group">
                <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:bg-white/10 transition h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${step.color}-500/20 text-${step.color}-400`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="text-5xl font-black text-white/10">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Busca dados dinamicamente da API */}
      <PricingSection />

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Dúvidas frequentes
            </h2>
            <p className="text-slate-600">Tudo que você precisa saber</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como funciona o plano Grátis?",
                a: "Você pode cria vários links monetizados e paga R$0,70 APENAS se você vender."
              },
              {
                q: "Posso trocar de plano depois?",
                a: "Sim! Você pode fazer upgrade ou downgrade a qualquer momento."
              },
              {
                q: "Posso receber pagamentos DIRETO na minha conta?",
                a: "Sim, você cadastra a sua chave PIX e o dinheiro cai direto na sua conta bancária, sem intermediários."
              },
              {
                q: "Preciso de CNPJ?",
                a: "Não. Você pode usar sua chave PIX pessoal (CPF) para receber os pagamentos."
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition">
                <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-slate-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Pronto para começar a vender?
          </h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            Crie sua página em menos de 2 minutos. É grátis e você só paga quando vender.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <AuthNavButton className="inline-flex items-center justify-center h-14 px-10 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition shadow-xl text-lg">
              Criar minha página grátis
            </AuthNavButton>
            {/* <a href="#demo" className="inline-flex items-center justify-center h-14 px-10 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition text-lg">
              Ver demonstração
            </a> */}
          </div>

          <p className="text-slate-500 text-sm mt-8">
            • Sem cartão de crédito no cadastro
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Depoimentos
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              O que nossos criadores dizem
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Junte-se a milhares de criadores que já estão monetizando sua audiência
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Ana Silva',
                role: 'Criadora de Conteúdo',
                image: 'AS',
                text: 'Consegui monetizar meu Instagram em menos de 1 semana. O checkout PIX é um diferencial enorme!',
                metric: 'R$ 3.450 em vendas',
              },
              {
                name: 'Carlos Mendes',
                role: 'Coach Fitness',
                image: 'CM',
                text: 'Minha página de links ficou incrível e profissional. Agora vendo meus treinos direto pela bio.',
                metric: '+150 alunos',
              },
              {
                name: 'Julia Costa',
                role: 'Designer',
                image: 'JC',
                text: 'Vendo templates e recursos para outros designers. A integração com Mercado Pago é perfeita.',
                metric: 'R$ 8.200/mês',
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">&quot;{testimonial.text}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {testimonial.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Logo e descrição */}
            <div>
              <Link href="/" target="_blank" className="inline-flex items-center gap-2 mb-4">
                <Logo size="sm" showText={false} />
                <span className="text-white font-bold text-lg">LinkePag</span>
              </Link>
              <p className="text-slate-400 text-sm max-w-xs">
                Crie uma página única para seus links e receba pagamentos via PIX. 
              </p>
              <p className="text-slate-400 text-sm max-w-xs mt-2">
                A link-in-bio que vende mais.
              </p>
            </div>
            
            {/* Navegação */}
            <div className="md:text-right">
              <h4 className="text-white font-semibold mb-4">Navegação</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-slate-400 hover:text-white transition">Início</Link>
                </li>
                <li>
                  <a href="#how-it-works" className="text-slate-400 hover:text-white transition">Como funciona</a>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-400 hover:text-white transition">Planos</a>
                </li>
                <li>
                  <Link href="/contato" className="text-slate-400 hover:text-white transition">Contato</Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 LinkePag - Monetize sua audiência.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <Link href="/termos" className="hover:text-slate-300 transition">Termos de uso</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
