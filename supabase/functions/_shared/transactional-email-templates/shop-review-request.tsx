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
  reviewUrl?: string
}

const Email = ({ customerName, productName, productSize, reviewUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>How are your kicks treating you?</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>How are they treating you{customerName ? `, ${customerName}` : ''}?</Heading>
        <Text style={text}>
          Hope you’re loving your {productName || 'sneakers'}{productSize ? ` (size ${productSize})` : ''}.
          If you have a sec, would you mind leaving a quick review? Even a sentence
          and a photo helps other shoppers see what we do.
        </Text>
        {reviewUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={reviewUrl} style={button}>Leave a Review</Button>
          </Section>
        )}
        <Text style={small}>It takes about a minute. Photos optional but appreciated.</Text>
        <Hr style={hr} />
        <Text style={footer}>Clean My Kicks &middot; Restored kicks, ready to wear.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `How are your ${d.productName || 'kicks'} treating you?`,
  displayName: 'Shop Review Request',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    productSize: '10',
    reviewUrl: 'https://cleanmykicks.com/account/shop-orders/demo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '24px', lineHeight: '30px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const small = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }