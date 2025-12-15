
import { supabase } from '../supabaseClient';

export interface PaginatedResult<T> {
  items: T[];
  lastId: string | null;
  hasMore: boolean;
}

export const getList = async <T>(table: string, queryBuilder?: (query: any) => any): Promise<T[]> => {
  let query = supabase.from(table).select('*');
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
  
  // Basic range pagination (simple implementation)
  // For production, cursor-based pagination using the lastId value filter is better
  let query = supabase
    .from(table)
    .select('*')
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
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data as T;
};

export const create = async <T>(table: string, item: any): Promise<T> => {
  const { data, error } = await supabase.from(table).insert(item).select().single();
  if (error) throw error;
  return data as T;
};

export const update = async <T>(table: string, id: string, updates: any): Promise<T> => {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
};

export const remove = async (table: string, id: string): Promise<void> => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

export const getOne = async <T>(table: string, id: string): Promise<T | undefined> => {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) return undefined;
  return data as T;
};
