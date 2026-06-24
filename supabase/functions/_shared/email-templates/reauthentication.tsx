/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Hr,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Clean My Kicks verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>Confirm it&rsquo;s you</Heading>
        <Text style={text}>Use the code below to verify your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. Didn&rsquo;t request it?
          You can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footerSmall}>Clean My Kicks &middot; Sneaker restoration done right.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brand = { backgroundColor: '#0a0a0a', padding: '20px 24px', textAlign: 'center' as const, margin: '0 -24px 28px' }
const brandText = { color: '#FF6A00', fontWeight: 800 as const, fontSize: '16px', letterSpacing: '0.16em', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }
const codeStyle = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace', fontSize: '28px', fontWeight: 700 as const,
  color: '#0F172A', letterSpacing: '0.18em', textAlign: 'center' as const,
  background: '#f1f5f9', borderRadius: '8px', padding: '16px 12px', margin: '0 0 24px',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '24px 0 0' }
const footerSmall = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
