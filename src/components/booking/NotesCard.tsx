import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface NotesCardProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  title?: string
}

export function NotesCard({
  value,
  onChange,
  placeholder = 'Any details about your session — project type, number of musicians, special requirements...',
  title = 'Notes',
}: NotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      </CardContent>
    </Card>
  )
}
