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
      {/* Main Content - mit padding-bottom für Bottom Navigation */}
      <main className="flex-1 pb-20 overflow-y-auto safe-area-top">
        <div className="container mx-auto p-4 pt-6 max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
        <div className="mx-auto max-w-[600px]">
          <div className="flex items-center justify-around h-16">
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-full transition-colors',
                    'active:bg-muted/50 rounded-lg mx-1',
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className={cn(
                    'h-6 w-6 transition-transform',
                    isActive && 'scale-110'
                  )} />
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
