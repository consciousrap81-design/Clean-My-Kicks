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
  productCondition?: string | null
  amount?: string
  orderUrl?: string
}

const Email = ({ customerName, productName, productSize, productCondition, amount, orderUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sneakers are on the way — order confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>

        <Heading style={h1}>Order confirmed{customerName ? `, ${customerName}` : ''}!</Heading>
        <Text style={text}>
          Thanks for picking up a pair from our restored collection. We&rsquo;re
          packing them up and you&rsquo;ll get a tracking number as soon as
          they ship.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>{productName}</Text>
          {(productSize || productCondition) && (
            <Text style={cardMeta}>
              {[productSize ? `Size ${productSize}` : null, productCondition].filter(Boolean).join(' · ')}
            </Text>
          )}
          {amount && <Text style={cardAmount}>${amount}</Text>}
        </Section>

        {orderUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={orderUrl} style={button}>View Your Order</Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>Clean My Kicks &middot; Restored kicks, ready to wear.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Order confirmed — ${d.productName || 'your sneakers'}`,
  displayName: 'Shop Order Confirmation',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    productSize: '10',
    productCondition: 'Lightly Used',
    amount: '245.00',
    orderUrl: 'https://cleanmykicks.com/account',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '26px', lineHeight: '32px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', margin: '20px 0' }
const cardTitle = { fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0b1220' }
const cardMeta = { fontSize: '13px', color: '#64748b', margin: '0 0 8px' }
const cardAmount = { fontSize: '20px', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }