import Link from "next/link"

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Última atualização: maio de 2026</p>
        <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
        <p className="text-muted-foreground">
          Ao usar a Minha Casa, você concorda com estes termos. Se não concordar, não use o serviço.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Conta e responsabilidade</h2>
        <p className="text-muted-foreground">
          Você é responsável por manter sua conta segura, fornecer informações corretas e por toda atividade realizada na sua conta.
          Podemos suspender ou encerrar contas em caso de abuso, fraude, violação destes termos ou risco à segurança do serviço.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Uso aceitável</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Não use o serviço para atividades ilegais, invasivas, abusivas ou fraudulentas.</li>
          <li>Não tente acessar dados de outros usuários, burlar autenticação ou interferir na infraestrutura.</li>
          <li>Não envie conteúdo que viole direitos de terceiros ou leis aplicáveis.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pagamentos e assinaturas</h2>
        <p className="text-muted-foreground">
          Recursos pagos podem exigir assinatura ativa. Preços, limites, renovação, cancelamento e reembolsos serão informados durante a contratação
          ou pelo processador de pagamento. O acesso a recursos pagos pode ser alterado, suspenso ou encerrado se o pagamento falhar ou for cancelado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Informações e análises</h2>
        <p className="text-muted-foreground">
          Simulações, estimativas, análises de anúncios, mapas, risco, financiamento ou qualquer saída automatizada são apenas informativas.
          Elas não substituem avaliação profissional, jurídica, financeira, engenharia, vistoria ou diligência própria antes de comprar, vender ou alugar imóveis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Disponibilidade e alterações</h2>
        <p className="text-muted-foreground">
          Podemos alterar, remover ou interromper funcionalidades para manutenção, segurança, evolução do produto ou exigências legais.
          O serviço é fornecido sem garantia de disponibilidade contínua ou ausência total de erros.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Privacidade e encerramento</h2>
        <p className="text-muted-foreground">
          O tratamento de dados está descrito na <Link className="text-primary hover:underline" href="/privacy">Política de Privacidade</Link>.
          Para solicitar exclusão de conta ou dados, use o canal de suporte informado no produto.
        </p>
      </section>
    </main>
  )
}
