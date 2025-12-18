import { useEffect, useState } from 'react';
import { Role } from '../types';
import { dataService } from '../services/dataService';

export interface RoleOption {
  id: string;
  name: string;
  description?: string | null;
}

export const useRoles = () => {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataService.getRoles();
        if (!isMounted) return;
        setRoles((data || []).map((r: any) => ({ id: r.id, name: r.name as Role | string, description: r.description })));
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load roles');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { roles, loading, error };
};
