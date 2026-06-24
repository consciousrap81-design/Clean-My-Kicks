/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  shoeBrand?: string
  shoeModel?: string
  serviceRecommended?: string
  quoteAmount?: number
  expiresAt?: string | null
  quoteUrl?: string
}

const formatMoney = (n?: number) =>
  typeof n === 'number' ? `$${n.toFixed(2)}` : '$0.00'

const formatDate = (iso?: string | null) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

const Email = ({
  customerName,
  shoeBrand,
  shoeModel,
  serviceRecommended,
  quoteAmount,
  expiresAt,
  quoteUrl,
}: Props) => {
  const shoe = [shoeBrand, shoeModel].filter(Boolean).join(' ')
  const expires = formatDate(expiresAt)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Clean My Kicks quote is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandText}>CLEAN MY KICKS</Text>
          </Section>

          <Heading style={h1}>Your quote is ready</Heading>
          <Text style={text}>
            {customerName ? `Hi ${customerName},` : 'Hi there,'} thanks for sending
            your kicks our way. We&rsquo;ve reviewed your photos and put together
            a quote for you below.
          </Text>

          <Section style={card}>
            {shoe && (
              <Text style={cardRow}>
                <span style={label}>Shoe</span>
                <span style={value}>{shoe}</span>
              </Text>
            )}
            {serviceRecommended && (
              <Text style={cardRow}>
                <span style={label}>Service</span>
                <span style={value}>{serviceRecommended}</span>
              </Text>
            )}
            <Hr style={hr} />
            <Text style={cardRow}>
              <span style={label}>Total</span>
              <span style={total}>{formatMoney(quoteAmount)}</span>
            </Text>
            {expires && (
              <Text style={muted}>Valid until {expires}</Text>
            )}
          </Section>

          {quoteUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={quoteUrl} style={button}>
                Review &amp; Respond to Quote
              </Button>
            </Section>
          )}

          <Text style={text}>
            You can accept, decline, or ask us a question right from the quote
            page. If anything looks off, just reply to this email and we&rsquo;ll
            get you sorted.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Clean My Kicks &middot; Sneaker restoration done right.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) =>
    d?.customerName
      ? `${d.customerName}, your Clean My Kicks quote is ready`
      : 'Your Clean My Kicks quote is ready',
  displayName: 'Quote Sent',
  previewData: {
    customerName: 'Jordan',
    shoeBrand: 'Nike',
    shoeModel: 'Air Force 1',
    serviceRecommended: 'Deep Clean + Sole Restoration',
    quoteAmount: 75,
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    quoteUrl: 'https://cleanmykicks.com/quote/example',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  color: '#0b1220',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const brand = { marginBottom: '24px' }
const brandText = {
  fontSize: '13px',
  letterSpacing: '0.2em',
  fontWeight: 700,
  color: 'hsl(24, 100%, 50%)',
  margin: 0,
}
const h1 = {
  fontSize: '26px',
  lineHeight: '32px',
  fontWeight: 700,
  color: '#0b1220',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '8px 0 4px',
}
const cardRow = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '15px',
  margin: '6px 0',
  color: '#0b1220',
}
const label = { color: '#64748b', textTransform: 'uppercase' as const, fontSize: '12px', letterSpacing: '0.08em' }
const value = { fontWeight: 600 }
const total = { fontWeight: 700, fontSize: '20px', color: 'hsl(24, 100%, 50%)' }
const muted = { fontSize: '13px', color: '#64748b', margin: '8px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const button = {
  backgroundColor: 'hsl(24, 100%, 50%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}