import type { APIRoute } from 'astro';
import { getCollectionCategories } from '../../lib/collections';

export const GET: APIRoute = async () => {
  const categories = getCollectionCategories();

  return new Response(
    JSON.stringify({
      total: categories.length,
      categories
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    }
  );
};
