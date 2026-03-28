type SettlementDistributionFraction = {
  fractionId: string;
  fractionIndex: number;
  investorId: string;
  netAmount: number;
};

type SettlementDistributionInput = {
  invoiceAmount: number;
  invoiceNetAmount: number;
  fractions: SettlementDistributionFraction[];
};

type SettlementDistributionRow = {
  fractionId: string;
  fractionIndex: number;
  investorId: string;
  principalAmount: number;
  interestAmount: number;
};

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildSettlementDistribution({
  invoiceAmount,
  invoiceNetAmount,
  fractions,
}: SettlementDistributionInput): {
  rows: SettlementDistributionRow[];
  totals: { principalTotal: number; interestTotal: number };
} {
  if (invoiceNetAmount <= 0 || fractions.length === 0) {
    return {
      rows: [],
      totals: {
        principalTotal: 0,
        interestTotal: 0,
      },
    };
  }

  const interestPool = roundToCents(invoiceAmount - invoiceNetAmount);
  let distributedInterest = 0;

  const rows = fractions.map((fraction, index) => {
    const isLast = index === fractions.length - 1;
    const interestAmount = isLast
      ? roundToCents(interestPool - distributedInterest)
      : roundToCents((fraction.netAmount / invoiceNetAmount) * interestPool);

    distributedInterest = roundToCents(distributedInterest + interestAmount);

    return {
      fractionId: fraction.fractionId,
      fractionIndex: fraction.fractionIndex,
      investorId: fraction.investorId,
      principalAmount: roundToCents(fraction.netAmount),
      interestAmount,
    };
  });

  return {
    rows,
    totals: {
      principalTotal: roundToCents(rows.reduce((sum, row) => sum + row.principalAmount, 0)),
      interestTotal: roundToCents(rows.reduce((sum, row) => sum + row.interestAmount, 0)),
    },
  };
}
