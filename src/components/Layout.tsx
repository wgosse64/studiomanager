import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={`text-sm transition-colors ${active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </Link>
  )
}

export function InternalLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-lg font-bold tracking-tight">
              Studio Manager
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-4">
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/calendar">Calendar</NavLink>
                <NavLink to="/bookings">Bookings</NavLink>
                <NavLink to="/clients">Clients</NavLink>
                <NavLink to="/resources">Resources</NavLink>
                <NavLink to="/invoices">Invoices</NavLink>
                <NavLink to="/files">Files</NavLink>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function PortalLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/portal" className="text-lg font-bold tracking-tight">
              Client Portal
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-4">
                <NavLink to="/portal/studios">Studios</NavLink>
                <NavLink to="/portal/engineers">Engineers</NavLink>
                <NavLink to="/portal/equipment">Equipment</NavLink>
                <NavLink to="/portal/bookings">Bookings</NavLink>
                <NavLink to="/portal/invoices">Invoices</NavLink>
                <NavLink to="/portal/files">Files</NavLink>
                <NavLink to="/portal/messages">Messages</NavLink>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/portal/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
