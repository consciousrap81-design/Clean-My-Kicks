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
  previousCarrier?: string | null
  previousTrackingNumber?: string | null
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  orderUrl?: string
}

const Email = ({
  customerName, productName, productSize,
  previousCarrier, previousTrackingNumber,
  carrier, trackingNumber, trackingUrl, orderUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Updated tracking for your order{trackingNumber ? ` — ${trackingNumber}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>

        <Heading style={h1}>Your tracking info was updated{customerName ? `, ${customerName}` : ''}</Heading>
        <Text style={text}>
          We made a change to the tracking details for your order. Here&rsquo;s the
          latest info so you can keep an eye on the delivery.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>{productName}</Text>
          {productSize && <Text style={cardMeta}>Size {productSize}</Text>}
          {carrier && <Text style={cardMeta}>Carrier: {carrier}</Text>}
          {trackingNumber && (
            <Text style={cardTracking}>Tracking: {trackingNumber}</Text>
          )}
          {(previousCarrier || previousTrackingNumber) && (
            <Text style={cardOld}>
              Previously: {previousCarrier || '—'} {previousTrackingNumber || ''}
            </Text>
          )}
        </Section>

        {trackingUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={trackingUrl} style={button}>Track Your Package</Button>
          </Section>
        )}

        {orderUrl && (
          <Text style={smallLink}>
            View your order: <a href={orderUrl} style={inlineLink}>{orderUrl}</a>
          </Text>
        )}

        <Hr style={hr} />
        <Text style={footer}>Clean My Kicks &middot; Restored kicks, ready to wear.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Tracking updated — ${d.productName || 'your order'}`,
  displayName: 'Shop Order Tracking Updated',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    productSize: '10',
    previousCarrier: 'USPS',
    previousTrackingNumber: '9400111899223197428490',
    carrier: 'UPS',
    trackingNumber: '1Z999AA10123456784',
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
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
const cardTracking = { fontSize: '15px', fontWeight: 600, color: '#0b1220', margin: '8px 0 0', wordBreak: 'break-all' as const }
const cardOld = { fontSize: '12px', color: '#94a3b8', margin: '10px 0 0', fontStyle: 'italic' as const }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const smallLink = { fontSize: '13px', color: '#64748b', margin: '8px 0', textAlign: 'center' as const }
const inlineLink = { color: 'hsl(24, 100%, 50%)', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }