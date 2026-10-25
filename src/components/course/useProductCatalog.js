'use client';
import { useCallback, useState } from 'react';
import { searchCollection, useAsyncSearch } from '@/lib/liveSearch';

const EMPTY = [];
export default function useProductCatalog({ landing, buckets, bucketWise }) {
  const [category, setCategory] = useState(null);
  const loadProducts = useCallback(async () => searchCollection(await (category === null ? landing() : bucketWise(category)), 'products'), [landing, bucketWise, category]);
  const loadBuckets = useCallback(async () => searchCollection(await buckets(), 'buckets'), [buckets]);
  const products = useAsyncSearch(loadProducts, { delay: 0 });
  const categories = useAsyncSearch(loadBuckets, { delay: 0 });
  return {
    products: products.data ?? EMPTY, buckets: categories.data ?? EMPTY,
    loading: products.loading, error: products.error || categories.error,
    setCategory, refresh: products.refresh,
  };
}
