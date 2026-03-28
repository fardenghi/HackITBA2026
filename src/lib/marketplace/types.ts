import type { RiskTier } from '@/lib/risk/pricing';

export type MarketplaceInvoiceCard = {
  id: string;
  invoiceNumber: string;
  pagadorName: string;
  amount: number;
  netAmount: number;
  riskTier: RiskTier;
  discountRate: number;
  totalFractions: number;
  fundedFractions: number;
  availableFractions: number;
  dueDate: string;
};

export type InvoiceFundingSnapshot = MarketplaceInvoiceCard & {
  availableFractionIds: string[];
  perFractionNetAmount: number;
  perFractionExpectedReturn: number;
};

export type MarketplacePurchaseSummary = {
  fractionCount: number;
  checkoutTotal: number;
  expectedReturnTotal: number;
  expectedInterestTotal: number;
};

export type MarketplacePurchaseResult = MarketplacePurchaseSummary & {
  invoiceId: string;
  fundedFractions: number;
  availableFractions: number;
  progressPercentage: number;
  invoiceStatus: 'funding' | 'funded';
};
