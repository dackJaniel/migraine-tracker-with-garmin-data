import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Settings, Watch } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout() {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Garmin', href: '/garmin', icon: Watch },
    { name: 'Analyse', href: '/analytics', icon: BarChart3 },
    { name: 'Einstellungen', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/dashboard" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Migräne Tracker</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'transition-colors hover:text-foreground/80 flex items-center gap-2',
                    isActive ? 'text-foreground' : 'text-foreground/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
