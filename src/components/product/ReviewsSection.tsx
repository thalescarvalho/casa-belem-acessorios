import * as React from 'react'
import { Star } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchApprovedReviews, fetchMyReview, submitReview } from '@/services/reviews'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          aria-label={`${star} estrela(s)`}
          className={cn(readOnly && 'cursor-default')}
        >
          <Star
            className={cn(
              'h-4 w-4',
              star <= value ? 'fill-primary text-primary' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [rating, setRating] = React.useState(5)
  const [comment, setComment] = React.useState('')

  const reviewsQuery = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => fetchApprovedReviews(productId),
  })
  const myReviewQuery = useQuery({
    queryKey: ['reviews', productId, 'mine', user?.id],
    queryFn: () => fetchMyReview(productId, user!.id),
    enabled: Boolean(user),
  })

  const mutation = useMutation({
    mutationFn: () => submitReview({ productId, userId: user!.id, rating, comment }),
    onSuccess: () => {
      toast.success('Avaliação enviada! Ela será exibida após aprovação.')
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      setComment('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reviews = reviewsQuery.data ?? []
  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl font-semibold">Avaliações</h2>

      {reviews.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <StarRating value={Math.round(average)} readOnly />
          <span className="text-sm text-muted-foreground">
            {average.toFixed(1)} de 5 ({reviews.length} avaliação{reviews.length > 1 ? 'ões' : ''})
          </span>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{review.profiles?.full_name ?? 'Cliente'}</span>
              <StarRating value={review.rating} readOnly />
            </div>
            {review.comment && (
              <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
            )}
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há avaliações para este produto.
          </p>
        )}
      </div>

      {user && !myReviewQuery.data && (
        <form
          className="mt-8 max-w-md space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <h3 className="text-sm font-semibold">Deixe sua avaliação</h3>
          <StarRating value={rating} onChange={setRating} />
          <Textarea
            placeholder="Conte como foi sua experiência com o produto (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </form>
      )}
      {user && myReviewQuery.data && (
        <p className="mt-6 text-sm text-muted-foreground">
          Você já avaliou este produto
          {myReviewQuery.data.status === 'pending' ? ' (aguardando aprovação)' : ''}.
        </p>
      )}
    </section>
  )
}
