/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
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
  photoCount?: number
}

const Email = ({ customerName, shoeBrand, shoeModel, photoCount }: Props) => {
  const shoe = [shoeBrand, shoeModel].filter(Boolean).join(' ')
  const count = typeof photoCount === 'number' && photoCount > 0 ? photoCount : null
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We got your photos — quote coming soon</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandText}>CLEAN MY KICKS</Text>
          </Section>

          <Heading style={h1}>Photos received</Heading>
          <Text style={text}>
            {customerName ? `Hi ${customerName},` : 'Hi there,'} thanks for sending
            {count ? ` ${count} more ${count === 1 ? 'photo' : 'photos'}` : ' more photos'}
            {shoe ? ` of your ${shoe}` : ''}. We&rsquo;ve got everything we need to
            put your quote together.
          </Text>

          <Text style={text}>
            Sit tight — we&rsquo;ll review what you sent and follow up shortly with
            your quote. If you think of anything else, just reply to this email.
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
      ? `${d.customerName}, we got your photos`
      : 'We got your photos',
  displayName: 'Photos Received',
  previewData: {
    customerName: 'Jordan',
    shoeBrand: 'Nike',
    shoeModel: 'Air Force 1',
    photoCount: 3,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  color: '#0b1220',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = {
  fontSize: '13px',
  letterSpacing: '0.2em',
  fontWeight: 700,
  color: 'hsl(24, 100%, 50%)',
  margin: 0,
}
const h1 = { fontSize: '26px', lineHeight: '32px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }