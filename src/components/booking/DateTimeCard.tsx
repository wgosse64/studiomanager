import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateTimeCardProps {
  date: string
  startTime: string
  endTime: string
  onDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  readOnly?: boolean
}

export function DateTimeCard({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  readOnly = false,
}: DateTimeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Date & Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            readOnly={readOnly}
            required
            className={readOnly ? 'opacity-60' : ''}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start">Start Time</Label>
            <Input
              id="start"
              type="time"
              value={startTime}
              onChange={e => onStartTimeChange(e.target.value)}
              readOnly={readOnly}
              required
              className={readOnly ? 'opacity-60' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End Time</Label>
            <Input
              id="end"
              type="time"
              value={endTime}
              onChange={e => onEndTimeChange(e.target.value)}
              readOnly={readOnly}
              required
              className={readOnly ? 'opacity-60' : ''}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
