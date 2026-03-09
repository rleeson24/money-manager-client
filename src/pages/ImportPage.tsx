import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPaymentMethods, type PaymentMethod } from "../services/paymentMethodService";
import {
  getLastImportDates,
  importFromFile,
  formatFromFile,
  IMPORT_SOURCE_KEYS,
  type LastImportDatesItem,
  type ImportResult,
} from "../services/importService";
import "./ImportPage.css";

const SECTIONS = [
  { id: 0, card: "Arvest", label: "Arvest", sourceKey: IMPORT_SOURCE_KEYS.Arvest, useDatePaid: false },
  { id: 1, card: "ABFCU", label: "ABFCU Savings", sourceKey: IMPORT_SOURCE_KEYS.ABFCUSavings, useDatePaid: false },
  { id: 2, card: "ABFCU", label: "ABFCU Checking", sourceKey: IMPORT_SOURCE_KEYS.ABFCUChecking, useDatePaid: false },
  { id: 3, card: "Discover", label: "Discover Savings", sourceKey: IMPORT_SOURCE_KEYS.DiscoverSavings, useDatePaid: false },
  { id: 4, card: "Discover", label: "Discover Checking", sourceKey: IMPORT_SOURCE_KEYS.DiscoverChecking, useDatePaid: false },
  { id: 5, card: "Discover", label: "Discover Credit", sourceKey: IMPORT_SOURCE_KEYS.DiscoverCredit, useDatePaid: true },
] as const;

/** Pick the payment method that best matches the section's card/label (e.g. "Discover Credit" → PM named "Discover"). */
function matchPaymentMethodForSection(
  paymentMethods: PaymentMethod[],
  section: (typeof SECTIONS)[number]
): number {
  if (paymentMethods.length === 0) return 1;
  const name = (pm: PaymentMethod) => pm.PaymentMethod.trim().toLowerCase();
  const cardLower = section.card.toLowerCase();
  const labelLower = section.label.toLowerCase();
  // Sub-label without card prefix (e.g. "Savings", "Checking", "Credit")
  const subLabel = labelLower.replace(cardLower, "").trim() || labelLower;

  let best: PaymentMethod | null = null;
  let bestScore = -1;

  for (const pm of paymentMethods) {
    const n = name(pm);
    let score = 0;
    // Prefer exact match on full label (e.g. "Discover Credit" matches "Discover Credit")
    if (n === labelLower) {
      score = 100;
    } else if (n.includes(labelLower) || labelLower.includes(n)) {
      score = 80;
    } else if (n.includes(cardLower)) {
      score = 50;
      // Within same card, prefer sub-label match (e.g. "Discover" + "Credit" for Discover Credit)
      if (subLabel && n.includes(subLabel)) score = 70;
    } else if (subLabel && n.includes(subLabel)) {
      score = 30;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pm;
    }
  }

  return (best ?? paymentMethods[0]).id;
}

export default function ImportPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(() => SECTIONS.map(() => 1));
  const [lastDates, setLastDates] = useState<LastImportDatesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [result, setResult] = useState<{ sectionId: number; data: ImportResult } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pms = await getPaymentMethods();
      if (cancelled) return;
      setPaymentMethods(pms);
      if (pms.length > 0) {
        const initialIds = SECTIONS.map((section) =>
          matchPaymentMethodForSection(pms, section)
        );
        setSelectedIds(initialIds);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (paymentMethods.length === 0) return;
    const ids = SECTIONS.map((_, i) => selectedIds[i] ?? paymentMethods[0]?.id ?? 1);
    let cancelled = false;
    setLoading(true);
    getLastImportDates(ids)
      .then((data) => {
        if (!cancelled) setLastDates(data);
      })
      .catch(() => {
        if (!cancelled) setLastDates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [paymentMethods.length, selectedIds.join(",")]);

  const handlePaymentMethodChange = (sectionId: number, paymentMethodId: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[sectionId] = paymentMethodId;
      return next;
    });
  };

  const handleImport = async (sectionId: number, file: File) => {
    const section = SECTIONS[sectionId];
    if (!section) return;
    const format = formatFromFile(file);
    const paymentMethodId = selectedIds[sectionId] ?? paymentMethods[0]?.id ?? 1;
    setImportingId(sectionId);
    setResult(null);
    try {
      const data = await importFromFile(file, format, section.sourceKey, paymentMethodId);
      setResult({ sectionId, data });
      const ids = SECTIONS.map((_, i) => selectedIds[i] ?? paymentMethods[0]?.id ?? 1);
      const dates = await getLastImportDates(ids);
      setLastDates(dates);
    } catch (err) {
      setResult({
        sectionId,
        data: { created: 0, skippedDuplicates: 0, errors: [err instanceof Error ? err.message : "Import failed"] },
      });
    } finally {
      setImportingId(null);
    }
  };

  const cards = [
    { title: "Arvest", sections: SECTIONS.filter((s) => s.card === "Arvest") },
    { title: "ABFCU", sections: SECTIONS.filter((s) => s.card === "ABFCU") },
    { title: "Discover", sections: SECTIONS.filter((s) => s.card === "Discover") },
  ];

  return (
    <div className="import-page">
      <h1>Banking Import</h1>
      <p>
        <Link to="/">← Back to Home</Link>
      </p>

      <div className="import-cards">
        {cards.map((card) => (
          <div key={card.title} className="import-card">
            <h2>{card.title}</h2>
            <div className="import-sections">
              {card.sections.map((section) => {
                const dateInfo = lastDates[section.id];
                const lastDate = section.useDatePaid
                  ? dateInfo?.latestDatePaid ?? null
                  : dateInfo?.latestExpenseDate ?? null;
                const isImporting = importingId === section.id;
                const showResult = result?.sectionId === section.id;

                return (
                  <div key={section.id} className="import-section">
                    <h3>{section.label}</h3>
                    <div className="import-section-row">
                      <label>
                        File (OFX/QFX/CSV):
                        <input
                          type="file"
                          accept=".ofx,.qfx,.csv"
                          disabled={isImporting}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(section.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <label>
                        Payment method:
                        <select
                          value={selectedIds[section.id] ?? ""}
                          onChange={(e) =>
                            handlePaymentMethodChange(section.id, Number(e.target.value))
                          }
                        >
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.PaymentMethod}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {loading ? (
                      <div className="last-import">Loading…</div>
                    ) : lastDate ? (
                      <div className="last-import">
                        {section.useDatePaid ? "Most recent DatePaid: " : "Most recent transaction: "}
                        {new Date(lastDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="last-import none">No import yet</div>
                    )}
                    {showResult && result && (
                      <div
                        className={
                          result.data.errors.length > 0
                            ? "import-result error"
                            : "import-result success"
                        }
                      >
                        {result.data.errors.length > 0 ? (
                          <>
                            <span>Errors:</span>
                            <ul>
                              {result.data.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <>
                            Added {result.data.created} transaction
                            {result.data.created !== 1 ? "s" : ""}.
                            {result.data.skippedDuplicates > 0 &&
                              ` ${result.data.skippedDuplicates} duplicate(s) skipped.`}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
