// Shared CORS headers for Supabase Edge Functions.
// Import in any function: import { corsHeaders, getCorsHeaders, handleCors } from '../_shared/cors.ts'

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-webhook-secret, x-access-token',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
  }
}

export const corsHeaders = getCorsHeaders()

/**
 * Handle CORS preflight (OPTIONS) requests. Use at the top of every function:
 *
 *   if (req.method === 'OPTIONS') return handleCors(req)
 */
export function handleCors(req?: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) })
}

