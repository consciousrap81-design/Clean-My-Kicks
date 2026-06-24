/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  productName?: string
  reviewUrl?: string
}

const Email = ({ customerName, productName, reviewUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your review is live — thank you!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>Thanks for the review{customerName ? `, ${customerName}` : ''}!</Heading>
        <Text style={text}>
          Your review of {productName || 'your pair'} is now live on the product page.
          Real words from real buyers go a long way — we appreciate you.
        </Text>
        {reviewUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={reviewUrl} style={button}>See It Live</Button>
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
  subject: 'Your review is live — thank you!',
  displayName: 'Shop Review Thanks',
  previewData: {
    customerName: 'Jordan',
    productName: 'Jordan 4 Oxidized Green',
    reviewUrl: 'https://cleanmykicks.com/shop/demo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '24px', lineHeight: '30px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }