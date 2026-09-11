import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const overviewSchema = z.object({
  full_name: z.string().min(1, 'Informe seu nome completo'),
  cpf: z.string().optional(),
  phone: z.string().optional(),
})

type OverviewFormValues = z.infer<typeof overviewSchema>

export function AccountOverviewPage() {
  const { user, profile, refreshProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OverviewFormValues>({
    resolver: zodResolver(overviewSchema),
    values: {
      full_name: profile?.full_name ?? '',
      cpf: profile?.cpf ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const onSubmit = async (values: OverviewFormValues) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          cpf: values.cpf || null,
          phone: values.phone || null,
        })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Dados atualizados com sucesso')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar seus dados.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus dados</CardTitle>
        <CardDescription>Atualize suas informações pessoais</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={user?.email ?? ''} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              O e-mail é o seu identificador de login e não pode ser alterado aqui.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf')} />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
