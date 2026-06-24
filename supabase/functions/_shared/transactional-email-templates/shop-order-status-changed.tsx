/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  productName?: string
  productSize?: string | null
  fromStatus?: string
  toStatus?: string
  note?: string | null
  orderUrl?: string
}

const HEADLINES: Record<string, string> = {
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
  refunded: 'Your order has been refunded',
  shipped: 'Your order has shipped',
  paid: 'Payment confirmed',
  reserved: 'Your order is reserved',
}

const BLURBS: Record<string, string> = {
  delivered: 'Your kicks made it home. Lace them up and enjoy — and tag us when you wear them out!',
  cancelled: 'This order has been cancelled. If you were charged, a refund will follow shortly.',
  refunded: 'A refund has been issued. It should appear on your original payment method within a few business days.',
  shipped: 'Your order is on the way. Tracking info will follow if it hasn’t already.',
  paid: 'We’ve received your payment and are getting your order ready.',
  reserved: 'Your order is reserved while we finalize the details.',
}

const Email = ({ customerName, productName, productSize, fromStatus, toStatus, note, orderUrl }: Props) => {
  const key = (toStatus || '').toLowerCase()
  const headline = HEADLINES[key] || `Order status updated to ${toStatus}`
  const blurb = BLURBS[key] || `The status of your order changed from ${fromStatus || '—'} to ${toStatus || '—'}.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>

          <Heading style={h1}>{headline}{customerName ? `, ${customerName}` : ''}</Heading>
          <Text style={text}>{blurb}</Text>

          <Section style={card}>
            <Text style={cardTitle}>{productName}</Text>
            {productSize && <Text style={cardMeta}>Size {productSize}</Text>}
            <Text style={cardMeta}>Status: {toStatus}{fromStatus ? ` (was ${fromStatus})` : ''}</Text>
            {note && <Text style={cardNote}>{note}</Text>}
          </Section>

          {orderUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={orderUrl} style={button}>View Order</Button>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>Clean My Kicks &middot; Restored kicks, ready to wear.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => {
    const key = (d.toStatus || '').toLowerCase()
    const head = HEADLINES[key] || `Order status updated to ${d.toStatus}`
    return d.productName ? `${head} — ${d.productName}` : head
  },
  displayName: 'Shop Order Status Changed',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    productSize: '10',
    fromStatus: 'shipped',
    toStatus: 'delivered',
    orderUrl: 'https://cleanmykicks.com/account',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '24px', lineHeight: '30px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', margin: '20px 0' }
const cardTitle = { fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0b1220' }
const cardMeta = { fontSize: '13px', color: '#64748b', margin: '0 0 4px' }
const cardNote = { fontSize: '13px', color: '#334155', margin: '10px 0 0' }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }