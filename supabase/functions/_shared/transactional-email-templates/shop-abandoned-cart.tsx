/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  productName?: string
  productSize?: string | null
  productCondition?: string | null
  price?: string
  imageUrl?: string | null
  recoveryUrl?: string
  attempt?: 1 | 2
}

const Email = ({
  customerName, productName, productSize, productCondition,
  price, imageUrl, recoveryUrl, attempt = 1,
}: Props) => {
  const isSecond = attempt === 2
  const headline = isSecond
    ? `Last chance${customerName ? `, ${customerName}` : ''} — these kicks are still yours`
    : `You left a pair behind${customerName ? `, ${customerName}` : ''}`
  const blurb = isSecond
    ? `We held onto these for you, but every pair in our shop is one-of-one. If someone else grabs them first, they’re gone. Pick up where you left off whenever you’re ready.`
    : `Looks like you got close to checking out but didn’t finish. We saved your spot — every pair here is one-of-one, so they go fast. Tap below to pick up right where you left off.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{productName ? `Still want the ${productName}?` : 'Pick up where you left off'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>

          <Heading style={h1}>{headline}</Heading>
          <Text style={text}>{blurb}</Text>

          <Section style={card}>
            {imageUrl && (
              <Img src={imageUrl} alt={productName || 'Sneakers'} width="480" style={image} />
            )}
            <Text style={cardTitle}>{productName}</Text>
            {(productSize || productCondition) && (
              <Text style={cardMeta}>
                {[productSize ? `Size ${productSize}` : null, productCondition].filter(Boolean).join(' · ')}
              </Text>
            )}
            {price && <Text style={cardPrice}>${price}</Text>}
          </Section>

          {recoveryUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={recoveryUrl} style={button}>Resume Checkout</Button>
            </Section>
          )}

          <Text style={small}>
            Heads up: because each pair is unique, we can’t hold them forever.
            If they’ve already sold to someone else, the link will let you know.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>Clean My Kicks &middot; Restored kicks, ready to wear.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) =>
    d.attempt === 2
      ? `Last chance — ${d.productName || 'your sneakers'} are still waiting`
      : `Still want ${d.productName || 'your sneakers'}?`,
  displayName: 'Shop Abandoned Cart',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    productSize: '10',
    productCondition: 'Restored — Excellent',
    price: '220.00',
    imageUrl: null,
    recoveryUrl: 'https://cleanmykicks.com/recover-cart?token=demo',
    attempt: 1,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '26px', lineHeight: '32px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', margin: '20px 0', textAlign: 'center' as const }
const image = { borderRadius: '8px', display: 'block', margin: '0 auto 14px', maxWidth: '100%' as const, height: 'auto' as const }
const cardTitle = { fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0b1220' }
const cardMeta = { fontSize: '13px', color: '#64748b', margin: '0 0 6px' }
const cardPrice = { fontSize: '18px', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: '8px 0 0' }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const small = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }