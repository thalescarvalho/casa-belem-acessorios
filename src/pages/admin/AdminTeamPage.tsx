import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  addAdminUserByEmail,
  fetchAdminTeam,
  removeAdminUser,
  updateAdminUserRole,
  type AdminUserWithProfile,
} from '@/services/admin/adminTeam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { paths } from '@/routes/paths'

const ROLE_LABELS: Record<'admin' | 'operator', string> = {
  admin: 'Administrador',
  operator: 'Operador',
}

export function AdminTeamPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const teamQuery = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: fetchAdminTeam,
    enabled: isAdmin,
  })

  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'admin' | 'operator'>('operator')
  const [memberToRemove, setMemberToRemove] = React.useState<AdminUserWithProfile | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] })

  const addMutation = useMutation({
    mutationFn: () => addAdminUserByEmail(email.trim(), role),
    onSuccess: () => {
      toast.success('Membro adicionado à equipe.')
      setEmail('')
      setRole('operator')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao adicionar membro.'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role: newRole }: { userId: string; role: 'admin' | 'operator' }) =>
      updateAdminUserRole(userId, newRole),
    onSuccess: () => {
      toast.success('Papel atualizado.')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao atualizar papel.'),
  })

  const removeMutation = useMutation({
    mutationFn: removeAdminUser,
    onSuccess: () => {
      toast.success('Membro removido.')
      setMemberToRemove(null)
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao remover membro.'),
  })

  function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Informe o e-mail do usuário.')
      return
    }
    addMutation.mutate()
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem gerenciar a equipe.
        </p>
        <Link to={paths.admin} className="text-sm text-primary underline">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  const team = teamQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quem tem acesso ao painel administrativo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar membro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="member-email">E-mail cadastrado</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label>Papel</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'admin' | 'operator')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addMutation.isPending}>
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamQuery.isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum membro cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              team.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell className="font-medium">{member.profiles?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.profiles?.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          updateRoleMutation.mutate({
                            userId: member.user_id,
                            role: value as 'admin' | 'operator',
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operador</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>
                {memberToRemove?.profiles?.full_name ?? memberToRemove?.profiles?.email}
              </strong>{' '}
              da equipe?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.user_id)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
