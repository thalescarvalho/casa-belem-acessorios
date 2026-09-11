import { Link } from 'react-router-dom'
import { Gem } from 'lucide-react'
import { paths } from '@/routes/paths'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="container py-24">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <Gem className="h-12 w-12 text-primary" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground">
          A página que você está procurando não existe ou foi movida. Que tal voltar para a loja e
          continuar explorando nossos acessórios?
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to={paths.home}>Voltar para o início</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={paths.products}>Ver produtos</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
