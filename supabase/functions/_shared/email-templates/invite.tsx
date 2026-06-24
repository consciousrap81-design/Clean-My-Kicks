/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Hr,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You&rsquo;re invited to Clean My Kicks</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>
        <Heading style={h1}>You&rsquo;re invited</Heading>
        <Text style={text}>
          You&rsquo;ve been invited to join{' '}
          <Link href={siteUrl} style={link}><strong>Clean My Kicks</strong></Link>.
          Accept the invite below to create your account.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={confirmationUrl}>Accept Invite</Button>
        </Section>
        <Text style={footer}>
          Weren&rsquo;t expecting this? You can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footerSmall}>Clean My Kicks &middot; Sneaker restoration done right.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px 32px' }
const brand = { backgroundColor: '#0a0a0a', padding: '20px 24px', textAlign: 'center' as const, margin: '0 -24px 28px' }
const brandText = { color: '#FF6A00', fontWeight: 800 as const, fontSize: '16px', letterSpacing: '0.16em', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#0F172A', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }
const link = { color: '#FF6A00', textDecoration: 'underline' }
const button = {
  backgroundColor: '#FF6A00', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const,
  borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '24px 0 0' }
const footerSmall = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: 0 }
