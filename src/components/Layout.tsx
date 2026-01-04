import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
