import Link from "next/link";
import { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { AuthNavButton } from "@/components/AuthNavButton";
import { MobileMenu } from "../components/MobileMenu";

export const metadata: Metadata = {
  title: "Termos de Uso - LinkePag",
  description: "Termos de uso da plataforma LinkePag",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
              Home
            </Link>
            <Link href="/plans" className="text-sm text-slate-400 hover:text-white transition">
              Planos
            </Link>
            <Link href="/contato" className="text-sm text-slate-400 hover:text-white transition">
              Contato
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <AuthNavButton />
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Termos de Uso
          </h1>

          <div className="prose prose-invert prose-slate max-w-none">
            <p className="text-slate-300 mb-6">
              Bem-vindo à LinkePag! Ao usar nossa plataforma, você concorda com estes termos. 
              Leia com atenção.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              1. O que é a LinkePag
            </h2>
            <p className="text-slate-300 mb-4">
              A LinkePag é uma plataforma de link-in-bio que permite a criadores de conteúdo 
              criarem perfis personalizados, organizarem seus links e monetizarem sua audiência 
              através de links pagos com integração PIX.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              2. Uso da Plataforma
            </h2>
            <p className="text-slate-300 font-medium mb-2">O que você pode fazer:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Criar um perfil personalizado com seu username</li>
              <li>Adicionar links gratuitos e pagos</li>
              <li>Receber pagamentos via PIX pelos seus links monetizados</li>
              <li>Gerenciar sua presença online em um só lugar</li>
            </ul>

            <p className="text-slate-300 font-medium mb-2">O que você não pode fazer:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Usar a plataforma para atividades ilegais ou fraudulentas</li>
              <li>Violar direitos autorais de terceiros</li>
              <li>Publicar conteúdo ofensivo, discriminatório ou inadequado</li>
              <li>Tentar acessar dados de outros usuários sem autorização</li>
              <li>Criar perfis falsos ou se passar por outra pessoa</li>
              <li>Usar a plataforma para distribuir malware ou spam</li>
            </ul>
            <p className="text-slate-300 mb-4">
              Reservamo-nos o direito de suspender ou encerrar contas que violem estas regras.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              3. Pagamentos e Taxas
            </h2>
            <p className="text-slate-300 mb-4">
              A LinkePag oferece planos gratuitos e pagos. Ao usar links monetizados:
            </p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Você escolhe o valor dos seus links pagos</li>
              <li>Aplicamos uma taxa fixa por transação bem-sucedida, que varia conforme seu plano</li>
              <li>Os pagamentos são processados via PIX</li>
              <li>Em caso de pagamentos via PIX Direto, você é responsável por confirmar manualmente o recebimento</li>
              <li>O dinheiro das vendas é seu e cai diretamente na sua conta (PIX) ou via MercadoPago, conforme sua configuração</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              4. Suas Responsabilidades
            </h2>
            <p className="text-slate-300 mb-2">Ao usar a LinkePag, você se compromete a:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Manter sua senha e dados de acesso em segurança</li>
              <li>Ser responsável por todo o conteúdo que publicar em seu perfil</li>
              <li>Cumprir as leis aplicáveis em sua jurisdição</li>
              <li>Honrar os pagamentos e entregas prometidos aos seus compradores</li>
              <li>Não usar a plataforma para atividades proibidas por lei</li>
            </ul>
            <p className="text-slate-300 mb-4">
              Você é o único responsável pelo conteúdo do seu perfil e pelas transações realizadas através dele.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              5. Cancelamento e Encerramento de Conta
            </h2>
            <p className="text-slate-300 mb-2">
              Você pode encerrar sua conta a qualquer momento através das configurações da plataforma.
            </p>
            <p className="text-slate-300 mb-2">Podemos suspender ou encerrar sua conta caso:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Você viole estes termos de uso</li>
              <li>Haja suspeita de fraude ou atividade ilícita</li>
              <li>Sua assinatura permaneça inativa por longos períodos</li>
            </ul>
            <p className="text-slate-300 mb-2">Ao encerrar a conta:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Seu perfil público será removido</li>
              <li>Seus dados serão mantidos pelo período necessário para cumprimento de obrigações legais</li>
              <li>Links ativos deixarão de funcionar</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              6. Proteção de Dados
            </h2>
            <p className="text-slate-300 mb-4">
              Respeitamos sua privacidade. Seus dados pessoais são tratados de forma segura e 
              utilizados apenas para o funcionamento da plataforma. Não vendemos suas informações 
              a terceiros.
            </p>
            <p className="text-slate-300 mb-4">
              Ao usar a LinkePag, você consente com o tratamento dos seus dados necessários para 
              a prestação dos serviços.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              7. Limitação de Responsabilidade
            </h2>
            <p className="text-slate-300 mb-4">
              A LinkePag é fornecida &quot;como está&quot;. Não garantimos que a plataforma estará sempre 
              disponível ou livre de erros.
            </p>
            <p className="text-slate-300 mb-2">Não nos responsabilizamos por:</p>
            <ul className="text-slate-300 list-disc list-inside mb-4 space-y-1">
              <li>Transações diretas entre você e seus compradores (no caso de PIX Direto)</li>
              <li>Conteúdo publicado por outros usuários</li>
              <li>Problemas técnicos fora do nosso controle</li>
              <li>Perdas financeiras decorrentes do uso da plataforma</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              8. Alterações nos Termos
            </h2>
            <p className="text-slate-300 mb-4">
              Podemos atualizar estes termos periodicamente. Notificaremos sobre mudanças significativas. 
              O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
            </p>

            <h2 className="text-xl font-semibold text-white mt-8 mb-4">
              9. Contato
            </h2>
            <p className="text-slate-300 mb-6">
              Em caso de dúvidas sobre estes termos, entre em contato através do formulário 
              disponível em nosso site.
            </p>

            <hr className="border-slate-700 my-8" />

            <p className="text-slate-400 text-sm">
              Ao usar a LinkePag, você confirma que leu, entendeu e concorda com estes Termos de Uso.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <Link 
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold rounded-xl hover:opacity-90 transition"
            >
              Voltar para Home
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            © 2026 LinkePag - Monetize sua audiência.
          </p>
        </div>
      </footer>
    </main>
  );
}
