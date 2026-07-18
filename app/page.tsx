"use client";

import { useMemo, useState } from "react";
import { computeT12Actuals, DEFAULT_INPUTS, DealInputs, hasT12Actuals, hydrateInputs, runUnderwriting, syncDetailToAggregates } from "@/lib/underwriting";
import { DetailedLineItems } from "@/lib/detailedProforma";
import { EMPTY_MARKET_COMPS, Extracted, ExtractionEntry, MarketComps, mergeExtractions, mergeMarketComps } from "@/lib/applyExtraction";
import { buildScorecard, buildTopRisks } from "@/lib/scorecard";
import { buildInvestmentThesis, buildRiskScorecard, buildFinalRecommendation, computeTrueNetYieldModel } from "@/lib/riskAnalysis";
import { buildLoiNarrative } from "@/lib/loiNarrative";
import { runScenarios, computeBreakEven } from "@/lib/scenarios";
import { buildAssumptionsRegister } from "@/lib/assumptionsRegister";
import { buildDdChecklist } from "@/lib/ddChecklist";
import { computeWaterfall } from "@/lib/waterfall";
import { buildFullReport, computeCapexAnalysis } from "@/lib/report";

import Tabs, { TabName } from "@/components/Tabs";
import CoverDashboard from "@/components/CoverDashboard";
import InputsForm from "@/components/InputsForm";
import DocUploader from "@/components/DocUploader";
import ExtractionReview from "@/components/ExtractionReview";
import SourcesUses from "@/components/SourcesUses";
import ProformaTable from "@/components/ProformaTable";
import DetailedProformaTable from "@/components/DetailedProformaTable";
import ReturnsSummaryPanel from "@/components/ReturnsSummary";
import DebtFinancingTab from "@/components/DebtFinancingTab";
import SensitivityScenariosTab from "@/components/SensitivityScenariosTab";
import MarketCompsTab from "@/components/MarketCompsTab";
import ScorecardTab from "@/components/ScorecardTab";
import DdChecklistTab from "@/components/DdChecklistTab";
import AssumptionsRegisterTab from "@/components/AssumptionsRegisterTab";
import LoiOutputTab from "@/components/LoiOutputTab";
import WaterfallTab from "@/components/WaterfallTab";
import MyDealsTab from "@/components/MyDealsTab";
import AiAssistantTab, { ChatMessage } from "@/components/AiAssistantTab";
import ReportModal from "@/components/ReportModal";

export default function Home() {
  const [tab, setTab] = useState<TabName>("Dashboard");
  const [inputs, setInputs] = useState<DealInputs>(DEFAULT_INPUTS);
  const [extractionLog, setExtractionLog] = useState<ExtractionEntry[]>([]);
  const [applied, setApplied] = useState(false);
  const [marketComps, setMarketComps] = useState<MarketComps>(EMPTY_MARKET_COMPS);
  const [compsAppliedCount, setCompsAppliedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);
  const [dealsRefreshToken, setDealsRefreshToken] = useState(0);
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>([]);
  const [showReport, setShowReport] = useState(false);

  const result = useMemo(() => runUnderwriting(inputs), [inputs]);
  const scorecard = useMemo(
    () => buildScorecard(inputs, result.debt, result.returns, result.proforma),
    [inputs, result]
  );
  const risks = useMemo(
    () => buildTopRisks(inputs, result.debt, result.returns, result.proforma),
    [inputs, result]
  );
  const narrative = useMemo(() => buildLoiNarrative(inputs, result.debt, result.returns), [inputs, result]);
  const scenarios = useMemo(() => runScenarios(inputs), [inputs]);
  const breakEven = useMemo(() => computeBreakEven(inputs, result.proforma), [inputs, result]);
  const assumptions = useMemo(() => buildAssumptionsRegister(inputs), [inputs]);
  const ddItems = useMemo(() => buildDdChecklist(inputs.ddPeriodDays), [inputs.ddPeriodDays]);
  const t12 = useMemo(() => (hasT12Actuals(inputs) ? computeT12Actuals(inputs) : null), [inputs]);
  const waterfall = useMemo(() => computeWaterfall(inputs, result.debt, result.returns), [inputs, result]);
  const thesis = useMemo(
    () => buildInvestmentThesis(inputs, result.debt, result.returns, result.proforma[0].noi),
    [inputs, result]
  );
  const yieldModel = useMemo(() => computeTrueNetYieldModel(inputs), [inputs]);
  const riskRows = useMemo(
    () => buildRiskScorecard(inputs, result.debt, result.returns, yieldModel, marketComps),
    [inputs, result, yieldModel, marketComps]
  );
  const recommendation = useMemo(
    () => buildFinalRecommendation(riskRows, result.returns, inputs),
    [riskRows, result, inputs]
  );
  const capex = useMemo(() => computeCapexAnalysis(inputs), [inputs]);
  const reportMarkdown = useMemo(
    () =>
      buildFullReport({
        inputs,
        debt: result.debt,
        proforma: result.proforma,
        returns: result.returns,
        sourcesAndUses: result.sourcesAndUses,
        yieldModel,
        riskRows,
        recommendation,
        waterfall,
        scenarios,
        breakEven,
        marketComps,
        assumptions,
        thesis,
        capex,
      }),
    [inputs, result, yieldModel, riskRows, recommendation, waterfall, scenarios, breakEven, marketComps, assumptions, thesis, capex]
  );

  const assistantSnapshot = useMemo(
    () => ({
      inputs,
      debt: result.debt,
      sourcesAndUses: result.sourcesAndUses,
      t12Actuals: t12,
      proformaYears1to5: result.proforma,
      returns: result.returns,
      scorecard,
      topRisks: risks,
      trueNetYieldModel: yieldModel,
      riskScorecard: riskRows,
      recommendation,
      breakEven,
      scenarios: scenarios.map((s) => ({ name: s.name, returns: s.returns })),
      sensitivityGrid: result.sensitivity,
      waterfall,
      marketComps,
    }),
    [inputs, result, t12, scorecard, risks, yieldModel, riskRows, recommendation, breakEven, scenarios, waterfall, marketComps]
  );

  function handleChange(patch: Partial<DealInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }));
  }

  function handleExtracted(docType: string, extracted: Extracted) {
    setExtractionLog((prev) => [...prev, { docType, extracted }]);
    setApplied(false);
  }

  function handleApply() {
    setInputs((prev) => syncDetailToAggregates(mergeExtractions(prev, extractionLog)));
    // Only merge comps from entries not already folded in, so re-clicking
    // Apply after a new upload doesn't duplicate previously-merged rows.
    setMarketComps((prev) => mergeMarketComps(prev, extractionLog.slice(compsAppliedCount)));
    setCompsAppliedCount(extractionLog.length);
    setApplied(true);
  }

  function handleDetailChange(which: "t12Detail" | "year1Detail", patch: Partial<DetailedLineItems>) {
    setInputs((prev) => syncDetailToAggregates({ ...prev, [which]: { ...prev[which], ...patch } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body = JSON.stringify({ inputs, sourceDocuments: extractionLog.map((e) => ({ docType: e.docType })) });
      const res = await fetch(currentDealId ? `/api/deals/${currentDealId}` : "/api/deals", {
        method: currentDealId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setCurrentDealId(json.deal.id);
      setDealsRefreshToken((n) => n + 1);
      setSaveMsg(currentDealId ? "Updated." : "Saved.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleNewDeal() {
    if (!confirm("Start a new deal? Any unsaved changes to the current one will be lost.")) return;
    setInputs(DEFAULT_INPUTS);
    setCurrentDealId(null);
    setExtractionLog([]);
    setApplied(false);
    setMarketComps(EMPTY_MARKET_COMPS);
    setCompsAppliedCount(0);
    setSaveMsg(null);
    setAssistantMessages([]);
    setTab("Dashboard");
  }

  function handleLoadDeal(id: string, loadedInputs: DealInputs) {
    setInputs(hydrateInputs(loadedInputs));
    setCurrentDealId(id);
    setExtractionLog([]);
    setApplied(false);
    setMarketComps(EMPTY_MARKET_COMPS);
    setCompsAppliedCount(0);
    setSaveMsg(null);
    setAssistantMessages([]);
    setTab("Dashboard");
  }

  return (
    <div className="app-root max-w-7xl mx-auto flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-cardBorder px-4 py-6 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-6 px-1">
          <h1 className="text-lg font-bold leading-tight">CRE Underwriter</h1>
          <p className="text-xs text-silver mt-1">Institutional-grade underwriting, from OM upload to LOI submission.</p>
        </div>
        <Tabs active={tab} onChange={setTab} />
        <button
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            window.location.href = "/login";
          }}
          className="mt-6 text-xs text-silver hover:text-white px-3"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 space-y-6">
        <header className="flex items-center justify-end">
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm text-silver">{saveMsg}</span>}
            <button
              onClick={handleNewDeal}
              className="text-sm font-medium text-silver hover:text-white px-2"
            >
              New Deal
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="text-sm font-medium px-4 py-2 rounded-md border border-cardBorder text-white hover:border-ink/50"
            >
              Full Report
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-ink text-navy font-semibold text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : currentDealId ? "Update Deal" : "Save Deal"}
            </button>
          </div>
        </header>

        {tab === "Dashboard" && (
        <CoverDashboard inputs={inputs} onChange={handleChange} returns={result.returns} scorecard={scorecard} waterfall={waterfall} />
      )}

      {tab === "AI Assistant" && (
        <AiAssistantTab snapshot={assistantSnapshot} messages={assistantMessages} setMessages={setAssistantMessages} />
      )}

      {tab === "My Deals" && (
        <MyDealsTab currentDealId={currentDealId} onLoad={handleLoadDeal} refreshToken={dealsRefreshToken} />
      )}

      {tab === "Inputs" && (
        <div className="space-y-6">
          <DocUploader onExtracted={handleExtracted} />
          <ExtractionReview entries={extractionLog} onApply={handleApply} applied={applied} />
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
            <InputsForm inputs={inputs} onChange={handleChange} />
            <ReturnsSummaryPanel returns={result.returns} />
          </div>
        </div>
      )}

      {tab === "Sources & Uses" && <SourcesUses data={result.sourcesAndUses} />}

      {tab === "Proforma" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <DetailedProformaTable
              title="T-12 (Current Underwriting)"
              detail={inputs.t12Detail}
              units={inputs.unitCount}
              editable
              onChange={(patch) => handleDetailChange("t12Detail", patch)}
            />
            <DetailedProformaTable
              title="Year 1 (Pro Forma Underwriting)"
              detail={inputs.year1Detail}
              units={inputs.unitCount}
              editable
              onChange={(patch) => handleDetailChange("year1Detail", patch)}
            />
          </div>
          <ProformaTable proforma={result.proforma} t12={t12} />
        </div>
      )}

      {tab === "Waterfall" && <WaterfallTab inputs={inputs} onChange={handleChange} waterfall={waterfall} />}

      {tab === "Debt & Financing" && <DebtFinancingTab inputs={inputs} proforma={result.proforma} />}

      {tab === "Sensitivity & Scenarios" && (
        <SensitivityScenariosTab grid={result.sensitivity} scenarios={scenarios} breakEven={breakEven} inputs={inputs} />
      )}

      {tab === "Market & Comps" && (
        <MarketCompsTab comps={marketComps} onChange={(patch) => setMarketComps((prev) => ({ ...prev, ...patch }))} />
      )}

      {tab === "Scorecard & Risk" && (
        <ScorecardTab metrics={scorecard} thesis={thesis} yieldModel={yieldModel} riskRows={riskRows} recommendation={recommendation} />
      )}

      {tab === "DD Checklist" && <DdChecklistTab items={ddItems} ddPeriodDays={inputs.ddPeriodDays} />}

      {tab === "Assumptions Register" && <AssumptionsRegisterTab rows={assumptions} />}

        {tab === "LOI Output" && <LoiOutputTab narrative={narrative} inputs={inputs} onChange={handleChange} />}
      </main>

      {showReport && <ReportModal markdown={reportMarkdown} onClose={() => setShowReport(false)} />}
    </div>
  );
}
