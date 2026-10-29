/**
 * Asset URL helper ensuring correct path resolution under GitHub Pages base URL (/Fresh-Meat-Retail-BI/)
 */
export const getAssetUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
