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
  adminNotes?: string
  uploadUrl?: string
}

const Email = ({ customerName, shoeBrand, shoeModel, adminNotes, uploadUrl }: Props) => {
  const shoe = [shoeBrand, shoeModel].filter(Boolean).join(' ')
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We need a couple more photos to finish your quote</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandText}>CLEAN MY KICKS</Text>
          </Section>

          <Heading style={h1}>A few more photos, please</Heading>
          <Text style={text}>
            {customerName ? `Hi ${customerName},` : 'Hi there,'} thanks for sending
            your {shoe || 'sneakers'} our way. To put together an accurate quote,
            we need a couple more photos.
          </Text>

          {adminNotes && (
            <Section style={card}>
              <Text style={cardLabel}>What we need</Text>
              <Text style={cardBody}>{adminNotes}</Text>
            </Section>
          )}

          {uploadUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={uploadUrl} style={button}>
                Upload More Photos
              </Button>
            </Section>
          )}

          <Text style={text}>
            Tap the button above to add the photos straight from your phone. Good
            lighting and a few different angles (top, sides, soles, and any
            problem areas) help a lot. Once we have what we need, we&rsquo;ll get
            your quote out right away.
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
      ? `${d.customerName}, we need a few more photos`
      : 'We need a few more photos of your kicks',
  displayName: 'Request More Photos',
  previewData: {
    customerName: 'Jordan',
    shoeBrand: 'Nike',
    shoeModel: 'Air Force 1',
    adminNotes: 'Please send a clear photo of the soles and the inside heel area.',
    uploadUrl: 'https://cleanmykicks.com/request/example/photos',
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
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '8px 0 16px',
  backgroundColor: '#f8fafc',
}
const cardLabel = {
  color: '#64748b',
  textTransform: 'uppercase' as const,
  fontSize: '12px',
  letterSpacing: '0.08em',
  margin: '0 0 6px',
}
const cardBody = { fontSize: '15px', lineHeight: '22px', color: '#0b1220', margin: 0, whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }
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
