/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'
import { template as quoteSent } from './quote-sent.tsx'
import { template as requestMorePhotos } from './request-more-photos.tsx'
import { template as photosReceived } from './photos-received.tsx'
import { template as customerWelcome } from './customer-welcome.tsx'
import { template as shopOrderConfirmation } from './shop-order-confirmation.tsx'
import { template as shopOrderShipped } from './shop-order-shipped.tsx'
import { template as shopOrderTrackingUpdated } from './shop-order-tracking-updated.tsx'
import { template as shopOrderStatusChanged } from './shop-order-status-changed.tsx'
import { template as shopAbandonedCart } from './shop-abandoned-cart.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'quote-sent': quoteSent,
  'request-more-photos': requestMorePhotos,
  'photos-received': photosReceived,
  'customer-welcome': customerWelcome,
  'shop-order-confirmation': shopOrderConfirmation,
  'shop-order-shipped': shopOrderShipped,
  'shop-order-tracking-updated': shopOrderTrackingUpdated,
  'shop-order-status-changed': shopOrderStatusChanged,
  'shop-abandoned-cart': shopAbandonedCart,
}