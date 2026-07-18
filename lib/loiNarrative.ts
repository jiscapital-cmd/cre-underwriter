import { DealInputs, DebtSummary, ReturnsSummary, offerPrice } from "./underwriting";
import { fmtUsd } from "./format";

function orPlaceholder(value: string, placeholder: string): string {
  return value.trim() ? value.trim() : placeholder;
}

const DD_EXHIBIT_A = `Exhibit A
Due Diligence Materials

(a) Copies of ad valorem and personal property tax statements covering the Property for the
three (3) years prior to the Effective Date) or the period of time Seller has owned the Real
Property, whichever is less) and, if and when available, for the current year, together with
a copy of the current year Tax Assessment Notice from applicable appraisal district office.

(b) Copies of all licenses and permits with respect to Seller's ownership and operation of the
Property, including, without limitation, building permits, swimming pool permits, boiler
permits, mechanical permits and certificates of occupancy.

(c) To the extent that Seller has possession of these items: Copies of as-built engineering and
architectural plans, drawings, specifications, geotechnical subsoil tests or analyses,
termite inspection reports, structural reports, foundation reports, and all amendments or
changes thereto, and all blueprints, schematics, renderings, architect's drawings; all other
reports, plans or studies held by or for Seller which relate to the Property (collectively,
the "Plans").

(d) Copies of all Leases (including, without limitation, all modifications, amendments, or
supplements thereto) in effect with respect to the Property, as a certified rent roll in excel
and PDF formats ("Rent Roll") prepared as of the first day of the month in which the
Contract is executed, which Rent Roll shall reflect, as of the date thereof with respect to
each tenant occupying the Property or with respect to prospective tenants who have
executed leases but have not yet occupied the Property: (i) the space occupied (or to be
occupied); (ii) names of tenants, (iii) monthly rent, including escalations; the amount of
the security deposit (and any other deposits) and any prepaid rent or charges; amount of
rent in arrearage; (vi) the date through which rent is paid, (vii) the commencement date
and the expiration date of the lease term; (viii) any concessions granted which are now
effective or which may in the future become effective; and (ix) tenant responsibility for
water, sewage and other utility charges. The Rent Roll shall be accompanied by Seller's
signed certificate that the Rent Roll is complete and correct as of the date shown on said
Rent Roll, and that there has been no material adverse change with respect to any item
shown on the Rent Roll during the period from the date thereof to the date of such
certificate.

(e) Copies of all service contracts, landscaping, pool and/or other maintenance agreements,
management contracts, warranties, guaranties, or other agreements relating to the
Property, including, without limitation, all laundry leases, other equipment leases and
particularly all coin-operated vending or other machines.

(f) A reasonably detailed list from Seller showing the description and approximate quantity
of all of Seller's Personal Property included as part of this transaction, together with
copies of any lease, rental, or other agreements with respect to any such Personal
Property.

(g) A true and correct statement of income and expenses on a cash basis provided in excel
and PDF format, if possible, for the Property for the current year to date and the two
previous calendar years, accompanied by copies of Seller's bank statements evidencing
the same for the past 3 years.

(h) From Seller's Purchase of Property, the appraisal, inspection/property condition reports
and repair or replacement estimates.

(i) Detailed List of Insurance Claims filed for the Property during time of Seller's
ownership.

(j) Detailed List of Legal Claims made against Seller, Property, Insurance Policies of
Property/Seller.

(k) List and description of all code violations, citations, warnings, or inspections by any
entity with the authority to enforce or conduct codes, rules, regulations, or orders of the
entity.

(l) Schedule of Capital Projects completed at the Property over past two years and, at closing,
any additional information available during Seller's ownership.

(m) Copy of Maintenance Log and Resident Work Order Log during Seller's ownership.

(n) Copies of invoices and work descriptions for plumbing, electrical, and HVAC repairs and
maintenance over the past 36 months.`;

export function buildLoiNarrative(inputs: DealInputs, debt: DebtSummary, returns: ReturnsSummary): string {
  const price = offerPrice(inputs);
  const pricePerUnit = price / inputs.unitCount;
  const emAmount = price * inputs.emDepositPct;

  const buyerEntity = orPlaceholder(inputs.buyerEntityName, "[Buyer Entity Name]");
  const sellerOrBroker = orPlaceholder(inputs.sellerOrBrokerName, "[Seller/Broker Name]");
  const address = orPlaceholder(inputs.propertyAddress, "[Full Address]");
  const cityState = orPlaceholder(
    [inputs.propertyCity, inputs.propertyState].filter(Boolean).join(", "),
    "[City, State]"
  );
  const titleCo = orPlaceholder(inputs.titleCompanyName, "a mutually agreed title company");

  const hasConcessions = inputs.sellerConcessions > 0;
  const titleNum = hasConcessions ? 7 : 6;
  const closingCostsNum = hasConcessions ? 8 : 7;
  const assignmentNum = hasConcessions ? 9 : 8;
  const accessNum = hasConcessions ? 10 : 9;
  const confidentialityNum = hasConcessions ? 11 : 10;
  const exclusivityNum = hasConcessions ? 12 : 11;
  const nonBindingNum = hasConcessions ? 13 : 12;
  const governingLawNum = hasConcessions ? 14 : 13;

  return `LETTER OF INTENT
${inputs.propertyName}

Date: [Insert Date]

RE: ${inputs.propertyName}, a ${inputs.unitCount}-unit ${inputs.assetType.toLowerCase()} community located at ${address}, ${cityState} (the "Property")

Dear ${sellerOrBroker},

This Letter of Intent ("LOI") sets forth the principal terms and conditions upon which ${buyerEntity} ("Buyer") is prepared to purchase one hundred percent (100%) of the fee simple interest in the Property, including all personal property, leases, and related assets utilized in connection therewith.

This LOI is non-binding except as specifically provided in Sections ${confidentialityNum}, ${exclusivityNum}, and ${nonBindingNum} below.

1. Purchase Price
The purchase price for the Property shall be ${fmtUsd(price)} (${fmtUsd(pricePerUnit)} per unit), payable in cash at Closing, subject to customary prorations and adjustments.

2. Earnest Money Deposit
Within three (3) business days after the Effective Date of the definitive Purchase and Sale Agreement ("PSA"), Buyer shall deposit ${fmtUsd(emAmount)} (${(inputs.emDepositPct * 100).toFixed(1)}% of the Purchase Price) as earnest money (the "Deposit") with ${titleCo} (the "Title Company"). The Deposit shall be refundable during the Inspection Period and shall become non-refundable upon expiration of the Inspection Period (except as otherwise provided in the PSA). The Deposit shall be credited toward the Purchase Price at Closing.

3. Due Diligence / Inspection Period
Buyer shall have a period of ${inputs.ddPeriodDays} days from the Effective Date of the PSA (the "Inspection Period") to conduct comprehensive due diligence. Seller shall deliver all requested Due Diligence Materials (as outlined in Exhibit A attached hereto) within five (5) business days after the Effective Date. The Inspection Period shall commence upon Buyer's receipt of all such materials. During the Inspection Period, Buyer may terminate the PSA in its sole discretion for any reason and receive a full refund of the Deposit.

4. Financing Contingency
Buyer's obligation to proceed to Closing shall be contingent upon Buyer obtaining financing on terms and conditions satisfactory to Buyer in its sole and absolute discretion. Buyer shall have ${inputs.financingContingencyDays} days from the Effective Date of the PSA to satisfy or waive this contingency.

5. Closing Date
Closing shall occur within ${inputs.closingDays} days after the expiration of the Inspection Period, or on such other date as mutually agreed by the parties (the "Closing Date").

${
  inputs.sellerConcessions > 0
    ? `6. Seller Concessions
Buyer requests a credit of ${fmtUsd(inputs.sellerConcessions)} at Closing to be applied toward deferred maintenance and capital improvements identified during due diligence. The final amount shall be negotiated in good faith and documented in the PSA.

7`
    : `6`
}. Title and Survey
Seller shall convey good and marketable title to the Property, free and clear of all liens and encumbrances except for permitted exceptions. Seller shall provide an ALTA Owner's Policy of Title Insurance in the amount of the Purchase Price. Seller shall pay the premium for the standard owner's policy; Buyer shall pay for any extended coverage or endorsements.

${closingCostsNum}. Closing Costs
Buyer shall pay: title examination fees, Buyer's title policy endorsements, Buyer's due diligence costs, recording fees, and Buyer's attorney fees.
Seller shall pay: standard owner's title policy premium and Seller's attorney fees.
Transfer taxes and recording fees shall be paid by Buyer. Escrow fees shall be split equally.

${assignmentNum}. Assignment
Buyer may assign its rights under this LOI and the PSA to any entity controlled by, affiliated with, or under common control with Buyer upon written notice to Seller.

${accessNum}. Access
Seller shall provide Buyer and its agents, consultants, and contractors reasonable access to the Property during the Inspection Period upon reasonable notice.

${confidentialityNum}. Confidentiality
The parties agree to maintain the confidentiality of this LOI and the negotiations, except as required by law or to their respective advisors, lenders, and investors (who shall also maintain confidentiality).

${exclusivityNum}. Exclusivity
Seller agrees that, for a period of ${inputs.exclusivityDays} days from the date of this LOI, it will not solicit, entertain, or negotiate any other offers for the sale of the Property.

${nonBindingNum}. Non-Binding Provision
Except for the provisions contained in the Confidentiality, Exclusivity, and this Non-Binding Provision section, this LOI is non-binding and does not create any legal obligations between the parties. No binding agreement shall exist until the parties execute and deliver a mutually acceptable PSA.

${governingLawNum}. Governing Law
This LOI shall be governed by the laws of the State of ${orPlaceholder(inputs.governingLawState, "[State]")}.

If these terms are acceptable, please execute and return one original of this LOI to the undersigned within five (5) business days.

We are excited about the potential transaction and look forward to working cooperatively toward a successful closing.

Sincerely,

[Buyer Name]
${buyerEntity}
[Title]
[Contact Information]
[Signature]


Accepted and Agreed:

Seller: _______________________________          Date: ________________

Name: _______________________________

Title: _______________________________


Attached: Exhibit A – Due Diligence Materials


${DD_EXHIBIT_A}`;
}
