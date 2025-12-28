
import { supabase, getTenantIdFromSession } from '../supabaseClient';

const getContext = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const tenantId = await getTenantIdFromSession();
  return { tenantId };
};

export interface PaginatedResult<T> {
  items: T[];
  lastId: string | null;
  hasMore: boolean;
}

export const getList = async <T>(table: string, queryBuilder?: (query: any) => any): Promise<T[]> => {
  const { tenantId } = await getContext();

  let query = supabase
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId);

  if (queryBuilder) {
    query = queryBuilder(query);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as T[];
};

export const getPaginatedList = async <T>(
  table: string,
  options: { pageSize: number; lastId?: string | null; orderByField?: string; orderDir?: 'asc' | 'desc' },
  queryBuilder?: (query: any) => any
): Promise<PaginatedResult<T>> => {
  const { pageSize, lastId, orderByField = 'created_at', orderDir = 'desc' } = options;
  const { tenantId } = await getContext();
  
  // Basic range pagination (simple implementation)
  // For production, cursor-based pagination using the lastId value filter is better
  let query = supabase
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .order(orderByField, { ascending: orderDir === 'asc' })
    .limit(pageSize + 1);

  if (queryBuilder) {
    query = queryBuilder(query);
  }

  // Note: For true cursor pagination in Supabase, you'd filter: .lt(orderByField, lastValue)
  // Here we assume range for simplicity in migration
  
  const { data, error } = await query;
  if (error) throw error;

  const hasMore = (data?.length || 0) > pageSize;
  const items = hasMore ? data.slice(0, pageSize) : data;
  const newLastId = items.length > 0 ? (items[items.length - 1] as any).id : null;

  return { items: items as T[], lastId: newLastId, hasMore };
};

export const getById = async <T>(table: string, id: string): Promise<T | null> => {
  const { tenantId } = await getContext();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data as T;
};

export const create = async <T>(table: string, item: any): Promise<T> => {
  await getContext();
  const { tenant_id, ...sanitized } = item || {};

  const { data, error } = await supabase.from(table).insert(sanitized).select().single();
  if (error) throw error;
  return data as T;
};

export const update = async <T>(table: string, id: string, updates: any): Promise<T> => {
  const { tenantId } = await getContext();
  const { tenant_id, ...sanitized } = updates || {};

  const { data, error } = await supabase
    .from(table)
    .update(sanitized)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data as T;
};

export const remove = async (table: string, id: string): Promise<void> => {
  const { tenantId } = await getContext();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
};

export const getOne = async <T>(table: string, id: string): Promise<T | undefined> => {
  const { tenantId } = await getContext();
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) return undefined;
  return data as T;
};

