/**
 * Returns a business WhatsApp number only when it is a real configured value.
 * Historical demo defaults are intentionally treated as unconfigured.
 */
export function normalizeBusinessWhatsApp(value?: string | null): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  if (digits === '33612345678' || digits === '22990000000') return '';
  return digits;
}
