/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  direction?: 'inbound' | 'outbound'
  statusLabel?: string
  statusDetail?: string | null
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  eta?: string | null
  etaChanged?: boolean
  trackPageUrl?: string
  manageUrl?: string
}

const titleFor = (d: Props) => {
  const ship = d.direction === 'outbound' ? 'Return shipment' : 'Inbound shipment'
  if (d.etaChanged && d.statusLabel === undefined) return `${ship} delivery date updated`
  return `${ship} ${d.statusLabel || 'update'}`
}

const Email = (d: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{titleFor(d)}{d.trackingNumber ? ` — ${d.trackingNumber}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>{titleFor(d)}{d.customerName ? `, ${d.customerName}` : ''}</Heading>
        <Text style={text}>
          Here's the latest from the carrier on your shipment.
        </Text>

        <Section style={card}>
          {d.statusLabel && <Text style={cardTitle}>{d.statusLabel}</Text>}
          {d.statusDetail && <Text style={cardMeta}>{d.statusDetail}</Text>}
          {d.carrier && <Text style={cardMeta}>Carrier: {d.carrier}</Text>}
          {d.trackingNumber && <Text style={cardTracking}>Tracking: {d.trackingNumber}</Text>}
          {d.eta && (
            <Text style={cardMeta}>
              Estimated delivery: {new Date(d.eta).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {d.etaChanged ? ' (updated)' : ''}
            </Text>
          )}
        </Section>

        {(d.trackingUrl || d.trackPageUrl) && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={d.trackPageUrl || d.trackingUrl} style={button}>View tracking</Button>
          </Section>
        )}

        {d.manageUrl && (
          <Text style={smallLink}>
            Don't want these emails? <a href={d.manageUrl} style={inlineLink}>Turn off updates for this shipment</a>.
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
  subject: (d: Props) => titleFor(d),
  displayName: 'Shipment Update',
  previewData: {
    customerName: 'Jordan',
    direction: 'inbound',
    statusLabel: 'In Transit',
    statusDetail: 'Departed USPS Regional Facility',
    carrier: 'USPS',
    trackingNumber: '9400111899223197428490',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction',
    eta: '2026-07-01T00:00:00Z',
    etaChanged: true,
    trackPageUrl: 'https://cleanmykicks.com/track?n=9400111899223197428490',
    manageUrl: 'https://cleanmykicks.com/track?n=9400111899223197428490',
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
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const smallLink = { fontSize: '13px', color: '#64748b', margin: '8px 0', textAlign: 'center' as const }
const inlineLink = { color: 'hsl(24, 100%, 50%)', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }
