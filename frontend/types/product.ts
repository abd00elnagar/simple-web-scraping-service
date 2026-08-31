export interface Product {
  id: number;
  title: string;
  price: string | number | null;
  image_url: string | null;
  source_url: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface ProductsApiResponse {
  data: Product[];
  meta: PaginationMeta;
}
