import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  allowedRole?: 'hrd' | 'employee';
}

export const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        // Ambil role dari tabel profiles
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(data?.role || null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/unauthorized" replace />;

  return <Outlet context={{ session, role }} />;
};
