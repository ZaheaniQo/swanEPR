import { supabase } from '../lib/supabase';
import { Product } from '../shared/types';

const PRODUCT_COLUMNS =
  'id, name, description, category, base_unit, avg_cost, sales_price, sku, sku_prefix, quality_level, image_url, sizes:product_sizes(id, size, cost, price)';

type ProductSizeRow = { id: string; size?: string | null; cost?: number | null; price?: number | null };

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  base_unit?: string | null;
  avg_cost?: number | null;
  sales_price?: number | null;
  sku?: string | null;
  sku_prefix?: string | null;
  quality_level?: string | null;
  image_url?: string | null;
  sizes?: ProductSizeRow[];
};

const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  category: row.category || '',
  qualityLevel: row.quality_level || undefined,
  skuPrefix: row.sku_prefix || '',
  sku: row.sku || '',
  baseUnit: row.base_unit || '',
  avgCost: Number(row.avg_cost || 0),
  sizes: (row.sizes || []).map((size) => ({
    id: size.id,
    size: size.size || '',
    cost: Number(size.cost || 0),
    price: Number(size.price || 0),
  })),
  notes: row.description || undefined,
  price: Number(row.sales_price ?? 0),
  image: row.image_url || undefined,
  rating: 0,
  availability: undefined,
});

export const productRepository = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => mapProduct(row as ProductRow));
  },
};
