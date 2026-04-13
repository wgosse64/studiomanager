import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function NewBooking() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">New Booking</h1>
      <p className="text-muted-foreground mb-6">What would you like to book?</p>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Studio Session</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Book a studio room for a client</p>
            <Button asChild>
              <Link to="/bookings/new/studio">Book Studio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engineer</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Book an engineer — standalone or attach to a studio booking</p>
            <Button asChild variant="outline">
              <Link to="/bookings/new/engineer">Book Engineer</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Rent equipment — standalone or attach to a studio booking</p>
            <Button asChild variant="outline">
              <Link to="/bookings/new/equipment">Book Equipment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
