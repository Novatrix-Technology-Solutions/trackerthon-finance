export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_status: 'paid' | 'pending';
  type: 'income' | 'expense';
}

export class FinanceEngine {
  /**
   * Calculates the cash flow (Total Inflow - Total Outflow)
   */
  static calculateCashFlow(transactions: Transaction[]): number {
    return transactions.reduce((acc, curr) => {
      // Assuming paid and pending? We might only want 'paid' for cash flow, or everything.
      // Usually, cash flow is realized, but let's include all 'income' vs 'expense' for simplicity,
      // or filter based on 'paid' only if required. Let's do paid only.
      if (curr.payment_status === 'paid') {
        if (curr.type === 'income') return acc + curr.amount;
        if (curr.type === 'expense') return acc - curr.amount;
      }
      return acc;
    }, 0);
  }

  /**
   * Net Profit = Revenue - (COGS + Operating Expenses)
   * Basically total income - total expenses (regardless of payment status, assuming accrual)
   */
  static calculateNetProfit(transactions: Transaction[]): number {
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'income') return acc + curr.amount;
      if (curr.type === 'expense') return acc - curr.amount;
      return acc;
    }, 0);
  }

  /**
   * Growth Rate = ((Current Period - Previous Period) / Previous Period) * 100
   */
  static calculateGrowthRate(currentPeriodNetProfit: number, previousPeriodNetProfit: number): number {
    if (previousPeriodNetProfit === 0) return 0; // Prevent division by zero
    return ((currentPeriodNetProfit - previousPeriodNetProfit) / Math.abs(previousPeriodNetProfit)) * 100;
  }

  /**
   * Burn Rate = Monthly average of negative cash flow 
   * Given an array of monthly cash flows, average the negative ones.
   */
  static calculateBurnRate(monthlyCashFlows: number[]): number {
    const negativeFlows = monthlyCashFlows.filter(cf => cf < 0);
    if (negativeFlows.length === 0) return 0; // No burn if always positive
    const totalBurn = negativeFlows.reduce((acc, cf) => acc + Math.abs(cf), 0);
    return totalBurn / negativeFlows.length;
  }
}
