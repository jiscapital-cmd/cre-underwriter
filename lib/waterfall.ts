import { DealInputs, DebtSummary, ReturnsSummary } from "./underwriting";

export type WaterfallInputs = {
  preferredReturnPct: number; // annual, compounds on unreturned capital
  gpCoInvestPct: number; // GP's share of total equity contributed (0 = pure sponsor promote)
  catchUpGPSharePct: number; // GP's share of cash during the catch-up tier
  residualGPSplitPct: number; // GP's share of the residual/promote tier (LP gets 1 - this)
};

export type TierRow = {
  tier: string;
  hurdle: string;
  lpSharePct: number;
  gpSharePct: number;
  lpAmount: number;
  gpAmount: number;
};

export type YearlyDistribution = {
  year: number;
  totalCashFlow: number;
  lpDistribution: number;
  gpDistribution: number;
  gpPromotePctOfCash: number;
  lpCumulative: number;
  gpCumulative: number;
};

export type WaterfallResult = {
  lpEquity: number;
  gpEquity: number;
  tiers: TierRow[];
  yearly: YearlyDistribution[];
  lpTotalDistributions: number;
  gpTotalDistributions: number;
  lpIRR: number | null;
  gpIRR: number | null;
  lpEquityMultiple: number;
  gpEquityMultiple: number | null; // null when GP has no invested capital (undefined multiple)
  totalPromoteToGP: number; // GP distributions beyond its pro-rata capital/pref share
};

function irr(cashflows: number[]): number | null {
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  const npv = (rate: number) => cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export function computeWaterfall(inputs: DealInputs, debt: DebtSummary, returns: ReturnsSummary): WaterfallResult {
  const totalEquity = debt.equityRequired;
  const gpEquity = totalEquity * inputs.gpCoInvestPct;
  const lpEquity = totalEquity - gpEquity;
  const lpShareOfCapital = totalEquity > 0 ? lpEquity / totalEquity : 1;
  const gpShareOfCapital = 1 - lpShareOfCapital;

  let lpCapBalance = lpEquity;
  let gpCapBalance = gpEquity;
  let lpPrefBalance = 0;
  let gpPrefBalance = 0;
  let lpProfitCum = 0; // cumulative distributions beyond return of capital
  let gpProfitCum = 0;

  const roc = { lp: 0, gp: 0 };
  const pref = { lp: 0, gp: 0 };
  const catchUp = { lp: 0, gp: 0 };
  const residual = { lp: 0, gp: 0 };

  const yearly: YearlyDistribution[] = [];
  let lpCumDist = 0;
  let gpCumDist = 0;

  // leveredCashFlows[0] is the equity outlay (negative); years 1..N follow.
  const cashFlowsByYear = returns.leveredCashFlows.slice(1);

  for (let i = 0; i < cashFlowsByYear.length; i++) {
    const year = i + 1;
    let cash = Math.max(0, cashFlowsByYear[i]);
    const totalCashFlow = cashFlowsByYear[i];

    // Accrue preferred return on beginning-of-year unreturned capital.
    lpPrefBalance += lpCapBalance * inputs.preferredReturnPct;
    gpPrefBalance += gpCapBalance * inputs.preferredReturnPct;

    let lpThisYear = 0;
    let gpThisYear = 0;

    // Tier 1: Return of Capital — split by capital ownership ratio so both
    // balances clear proportionally (reduces to 100/0 automatically when
    // gpEquity is 0).
    if (cash > 0 && (lpCapBalance > 0 || gpCapBalance > 0)) {
      const need = lpCapBalance + gpCapBalance;
      const pay = Math.min(cash, need);
      const lpPay = pay * lpShareOfCapital;
      const gpPay = pay * gpShareOfCapital;
      lpCapBalance -= lpPay;
      gpCapBalance -= gpPay;
      roc.lp += lpPay;
      roc.gp += gpPay;
      lpThisYear += lpPay;
      gpThisYear += gpPay;
      cash -= pay;
    }

    // Tier 2: Preferred Return — split by accrued preferred balance ratio.
    if (cash > 0 && (lpPrefBalance > 0 || gpPrefBalance > 0)) {
      const need = lpPrefBalance + gpPrefBalance;
      const pay = Math.min(cash, need);
      const lpRatio = need > 0 ? lpPrefBalance / need : 1;
      const lpPay = pay * lpRatio;
      const gpPay = pay - lpPay;
      lpPrefBalance -= lpPay;
      gpPrefBalance -= gpPay;
      pref.lp += lpPay;
      pref.gp += gpPay;
      lpProfitCum += lpPay;
      gpProfitCum += gpPay;
      lpThisYear += lpPay;
      gpThisYear += gpPay;
      cash -= pay;
    }

    // Tier 3: GP Catch-up — split catchUpGPSharePct/rest, until GP's share
    // of cumulative profit (pref + catch-up) reaches residualGPSplitPct.
    if (cash > 0 && inputs.residualGPSplitPct < inputs.catchUpGPSharePct) {
      const totalProfitCum = lpProfitCum + gpProfitCum;
      const targetGpProfit = inputs.residualGPSplitPct * totalProfitCum;
      if (gpProfitCum < targetGpProfit || (totalProfitCum === 0 && gpProfitCum === 0)) {
        const denom = inputs.catchUpGPSharePct - inputs.residualGPSplitPct;
        // Solve for X (total profit distributed in this tier) such that
        // (gpProfitCum + catchUpGPShare*X) = residualGPSplitPct * (totalProfitCum + X)
        const numerator = inputs.residualGPSplitPct * totalProfitCum - gpProfitCum;
        const xNeeded = denom > 0 ? Math.max(0, numerator / denom) : 0;
        const x = Math.min(cash, xNeeded);
        const gpPay = x * inputs.catchUpGPSharePct;
        const lpPay = x - gpPay;
        catchUp.lp += lpPay;
        catchUp.gp += gpPay;
        lpProfitCum += lpPay;
        gpProfitCum += gpPay;
        lpThisYear += lpPay;
        gpThisYear += gpPay;
        cash -= x;
      }
    }

    // Tier 4: Residual Split (Promote) — remaining cash split per the
    // agreed residual ratio.
    if (cash > 0) {
      const lpPay = cash * (1 - inputs.residualGPSplitPct);
      const gpPay = cash * inputs.residualGPSplitPct;
      residual.lp += lpPay;
      residual.gp += gpPay;
      lpProfitCum += lpPay;
      gpProfitCum += gpPay;
      lpThisYear += lpPay;
      gpThisYear += gpPay;
      cash = 0;
    }

    lpCumDist += lpThisYear;
    gpCumDist += gpThisYear;

    yearly.push({
      year,
      totalCashFlow,
      lpDistribution: lpThisYear,
      gpDistribution: gpThisYear,
      gpPromotePctOfCash: lpThisYear + gpThisYear > 0 ? gpThisYear / (lpThisYear + gpThisYear) : 0,
      lpCumulative: lpCumDist,
      gpCumulative: gpCumDist,
    });
  }

  const tiers: TierRow[] = [
    {
      tier: "Return of Capital",
      hurdle: "—",
      lpSharePct: lpShareOfCapital,
      gpSharePct: gpShareOfCapital,
      lpAmount: roc.lp,
      gpAmount: roc.gp,
    },
    {
      tier: `${(inputs.preferredReturnPct * 100).toFixed(1)}% Preferred Return`,
      hurdle: `${(inputs.preferredReturnPct * 100).toFixed(1)}%`,
      lpSharePct: pref.lp + pref.gp > 0 ? pref.lp / (pref.lp + pref.gp) : lpShareOfCapital,
      gpSharePct: pref.lp + pref.gp > 0 ? pref.gp / (pref.lp + pref.gp) : gpShareOfCapital,
      lpAmount: pref.lp,
      gpAmount: pref.gp,
    },
    {
      tier: "Catch-up",
      hurdle: "—",
      lpSharePct: 1 - inputs.catchUpGPSharePct,
      gpSharePct: inputs.catchUpGPSharePct,
      lpAmount: catchUp.lp,
      gpAmount: catchUp.gp,
    },
    {
      tier: "Residual Split (Promote)",
      hurdle: "—",
      lpSharePct: 1 - inputs.residualGPSplitPct,
      gpSharePct: inputs.residualGPSplitPct,
      lpAmount: residual.lp,
      gpAmount: residual.gp,
    },
  ];

  const lpCashFlows = [-lpEquity, ...yearly.map((y) => y.lpDistribution)];
  const gpCashFlows = [-gpEquity, ...yearly.map((y) => y.gpDistribution)];

  const lpIRR = irr(lpCashFlows);
  const gpIRR = gpEquity > 0 ? irr(gpCashFlows) : null;
  const lpEquityMultiple = lpEquity > 0 ? lpCumDist / lpEquity : 0;
  const gpEquityMultiple = gpEquity > 0 ? gpCumDist / gpEquity : null;

  // Promote = what GP received beyond its pro-rata share of capital/pref (i.e. catch-up + residual).
  const totalPromoteToGP = catchUp.gp + residual.gp;

  return {
    lpEquity,
    gpEquity,
    tiers,
    yearly,
    lpTotalDistributions: lpCumDist,
    gpTotalDistributions: gpCumDist,
    lpIRR,
    gpIRR,
    lpEquityMultiple,
    gpEquityMultiple,
    totalPromoteToGP,
  };
}
