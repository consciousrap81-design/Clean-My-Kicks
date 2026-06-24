import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

// ---- Branding config (mirrors send-transactional-email + auth-email-hook) ----
const SITE_NAME = Deno.env.get('EMAIL_SITE_NAME') ?? 'clean-kick-creations'
const ROOT_DOMAIN = Deno.env.get('EMAIL_ROOT_DOMAIN') ?? 'cleanmykicks.com'
const FROM_DOMAIN = Deno.env.get('EMAIL_FROM_DOMAIN') ?? 'cleanmykicks.com'
const AUTH_LOCAL = Deno.env.get('EMAIL_FROM_LOCAL_PART') ?? 'noreply'
const TX_LOCAL = Deno.env.get('EMAIL_TX_FROM_LOCAL_PART') ?? 'quotes'
const TX_DISPLAY = Deno.env.get('EMAIL_FROM_DISPLAY_NAME') ?? 'Clean My Kicks'
const AUTH_FROM = Deno.env.get('EMAIL_AUTH_FROM_ADDRESS')
  ?? Deno.env.get('EMAIL_FROM_ADDRESS')
  ?? `${SITE_NAME} <${AUTH_LOCAL}@${FROM_DOMAIN}>`
const TX_FROM = Deno.env.get('EMAIL_TX_FROM_ADDRESS')
  ?? Deno.env.get('EMAIL_FROM_ADDRESS')
  ?? `${TX_DISPLAY} <${TX_LOCAL}@${FROM_DOMAIN}>`
const AUTH_REPLY = Deno.env.get('EMAIL_AUTH_REPLY_TO') ?? Deno.env.get('EMAIL_REPLY_TO') ?? null
const TX_REPLY = Deno.env.get('EMAIL_TX_REPLY_TO') ?? Deno.env.get('EMAIL_REPLY_TO') ?? null

const AUTH_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const SAMPLE_URL = `https://${ROOT_DOMAIN}`
const SAMPLE_EMAIL = 'user@example.com'
const AUTH_TEMPLATES: Record<string, { component: any; sample: Record<string, unknown> }> = {
  signup: {
    component: SignupEmail,
    sample: { siteName: SITE_NAME, siteUrl: SAMPLE_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_URL },
  },
  magiclink: {
    component: MagicLinkEmail,
    sample: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
  },
  recovery: {
    component: RecoveryEmail,
    sample: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
  },
  invite: {
    component: InviteEmail,
    sample: { siteName: SITE_NAME, siteUrl: SAMPLE_URL, confirmationUrl: SAMPLE_URL },
  },
  email_change: {
    component: EmailChangeEmail,
    sample: {
      siteName: SITE_NAME,
      oldEmail: SAMPLE_EMAIL,
      email: SAMPLE_EMAIL,
      newEmail: 'new@example.com',
      confirmationUrl: SAMPLE_URL,
    },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    sample: { token: '123456' },
  },
}

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }
  const { data: isAdmin, error } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (error || !isAdmin) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }
  return { ok: true }
}

type PreviewResult = {
  key: string
  displayName: string
  category: 'auth' | 'transactional'
  subject: string
  from: string
  replyTo: string | null
  to: string
  html: string
  status: 'ready' | 'render_failed'
  errorMessage?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.res

  const results: PreviewResult[] = []

  // Auth templates
  for (const [key, entry] of Object.entries(AUTH_TEMPLATES)) {
    try {
      const html = await renderAsync(React.createElement(entry.component, entry.sample))
      results.push({
        key,
        displayName: key.replace('_', ' '),
        category: 'auth',
        subject: AUTH_SUBJECTS[key] ?? 'Notification',
        from: AUTH_FROM,
        replyTo: AUTH_REPLY,
        to: SAMPLE_EMAIL,
        html,
        status: 'ready',
      })
    } catch (err) {
      results.push({
        key, displayName: key, category: 'auth',
        subject: '', from: AUTH_FROM, replyTo: AUTH_REPLY, to: SAMPLE_EMAIL,
        html: '', status: 'render_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Transactional templates
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    const displayName = entry.displayName || name
    const sample = entry.previewData ?? {}
    try {
      const html = await renderAsync(React.createElement(entry.component, sample))
      const subject = typeof entry.subject === 'function' ? entry.subject(sample) : entry.subject
      results.push({
        key: name,
        displayName,
        category: 'transactional',
        subject,
        from: TX_FROM,
        replyTo: TX_REPLY,
        to: entry.to ?? SAMPLE_EMAIL,
        html,
        status: 'ready',
      })
    } catch (err) {
      results.push({
        key: name, displayName, category: 'transactional',
        subject: '', from: TX_FROM, replyTo: TX_REPLY, to: entry.to ?? SAMPLE_EMAIL,
        html: '', status: 'render_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return new Response(JSON.stringify({ templates: results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})