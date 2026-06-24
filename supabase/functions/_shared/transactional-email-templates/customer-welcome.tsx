/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  setupUrl?: string
  portalUrl?: string
}

const Email = ({ customerName, setupUrl, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Set your password and track your order</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}><Text style={brandText}>CLEAN MY KICKS</Text></Section>

        <Heading style={h1}>Thanks for your payment{customerName ? `, ${customerName}` : ''}!</Heading>
        <Text style={text}>
          We&rsquo;ve received your payment and your order is officially in
          motion. To track progress, view before/after photos, and see updates
          from our team, set up your customer portal account below.
        </Text>

        {setupUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={setupUrl} style={button}>Set Your Password</Button>
          </Section>
        )}

        <Text style={text}>
          Already have an account? <a href={portalUrl} style={link}>Sign in to your portal</a>.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Clean My Kicks &middot; Sneaker restoration done right.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to Clean My Kicks — set your password',
  displayName: 'Customer Welcome',
  previewData: {
    customerName: 'Jordan',
    setupUrl: 'https://cleanmykicks.com/auth/set-password',
    portalUrl: 'https://cleanmykicks.com/account',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#0b1220' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brand = { marginBottom: '24px' }
const brandText = { fontSize: '13px', letterSpacing: '0.2em', fontWeight: 700, color: 'hsl(24, 100%, 50%)', margin: 0 }
const h1 = { fontSize: '26px', lineHeight: '32px', fontWeight: 700, color: '#0b1220', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(24, 100%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const link = { color: 'hsl(24, 100%, 50%)', textDecoration: 'underline' }
const hr = { borderColor: '#e5e7eb', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '8px 0 0' }