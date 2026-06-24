/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Hr,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Clean My Kicks sign-in link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>Your sign-in link</Heading>
        <Text style={text}>
          Click below to sign in to your Clean My Kicks account.
          This link expires shortly for your security.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={confirmationUrl}>Sign In</Button>
        </Section>
        <Text style={footer}>
          Didn&rsquo;t request this link? You can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footerSmall}>Clean My Kicks &middot; Sneaker restoration done right.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brand = { backgroundColor: '#0a0a0a', padding: '20px 24px', textAlign: 'center' as const, margin: '0 -24px 28px' }
const brandText = { color: '#FF6A00', fontWeight: 800 as const, fontSize: '16px', letterSpacing: '0.16em', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }
const button = {
  backgroundColor: '#FF6A00', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const,
  borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '24px 0 0' }
const footerSmall = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
