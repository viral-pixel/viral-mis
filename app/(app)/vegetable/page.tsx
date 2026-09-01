"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Upload, Settings2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SectionHead, StatCard, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete, ClearDataModal } from "@/app/components/ui";
import { C, FONT_BODY } from "@/app/lib/constants";
import { IndianRupee, Scale, CalendarClock } from "lucide-react";

interface VegItem { id: number; srNo: number; name: string }
interface Vendor { id: number; name: string }
interface PurchaseRow { id: number; date: string; itemId: number; item: VegItem; vendorId: number; vendor: Vendor; quantity: number; rate: number; amount: number; remarks: string }
interface PotatoOnionRow {
  id: number; billNo: string; billDate: string | null; materialReceivedDate: string;
  vendorId: number | null; vendor: Vendor | null; source: string; item: string;
  quantity: number | null; rate: number | null; amount: number | null; closingStockNote: string;
}
interface CashRow { id: number; date: string; category: string; amount: number; remarks: string }
interface OverviewRow {
  monthKey: string; monthLabel: string; totalQty: number | null; totalAmount: number; avgRate: number | null;
  qtyChangePct: number | null; amountChangePct: number | null; rateChangePct: number | null;
}
interface VendorCompRow { itemId: number; itemName: string; srNo: number; vendorId: number; vendorName: string; totalQty: number; totalAmount: number; avgRate: number }
interface ItemTrendRow { date: string; vendorName: string; quantity: number; rate: number; amount: number }
interface BillDraftLine { particulars: string; quantity: number; rate: number; amount: number; itemId: number | null; itemName: string | null }
interface BillDraft {
  date: string | null; invoiceNo: string | null; vendorId: number | null; vendorName: string;
  printedTotal: number | null; sumOfLines: number; totalMismatch: boolean; lines: BillDraftLine[]; unmatchedCount: number;
}

const CASH_CATEGORIES = ["Fruit & Cash Purchase", "Onion & Garlic Flakes"];

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function PctBadge({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value == null) return <span style={{ color: C.faint }}>—</span>;
  const up = value > 0;
  const good = invert ? !up : up; // for rate, "up" is bad; for qty/amount context-dependent, caller decides via invert
  const color = value === 0 ? C.sub : good ? C.green : C.red;
  return <span style={{ color, fontWeight: 600 }}>{up ? "▲" : value < 0 ? "▼" : "–"} {Math.abs(value)}%</span>;
}

export default function VegetablePage() {
  const [tab, setTab] = useState<"overview" | "purchases" | "potatoOnion" | "cash">("overview");
  const [items, setItems] = useState<VegItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const loadMasters = () => {
    fetch("/api/vegetable/items").then((r) => r.json()).then(setItems);
    fetch("/api/vegetable/vendors").then((r) => r.json()).then(setVendors);
  };

  useEffect(() => {
    loadMasters();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.user?.isAdmin));
  }, []);

  return (
    <div>
      <SectionHead
        title="Ketan Reports"
        sub="Vegetable & Produce Purchase — daily rates, quantities, and vendor comparison"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <a href="/api/vegetable/export" style={{ textDecoration: "none" }}>
              <Btn variant="ghost"><Download size={15} /> Export Excel</Btn>
            </a>
            <label style={{ display: "inline-flex" }}>
              <Btn variant="ghost" onClick={() => document.getElementById("veg-import-input")?.click()}>
                <Upload size={15} /> Import Excel
              </Btn>
              <input
                id="veg-import-input" type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/vegetable/import", { method: "POST", body: fd });
                  const d = await res.json().catch(() => ({}));
                  if (res.ok) { alert(`Imported ${d.created} row(s).${d.errors?.length ? ` ${d.errors.length} error(s).` : ""}`); loadMasters(); }
                  else alert(d.error || "Import failed");
                  e.target.value = "";
                }}
              />
            </label>
            <Btn variant="ghost" onClick={() => setShowManage(true)}><Settings2 size={15} /> Manage Items & Vendors</Btn>
          </div>
        }
      />

      {showManage && <ManageMastersModal items={items} vendors={vendors} onClose={() => setShowManage(false)} onChanged={loadMasters} />}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["overview", "Overview & Analysis"],
          ["purchases", "Vegetable Purchases"],
          ["potatoOnion", "Potato & Onion"],
          ["cash", "Cash Purchases"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              background: tab === key ? C.teal : "#fff", color: tab === key ? "#fff" : C.ink,
              border: `1px solid ${tab === key ? C.teal : C.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab items={items} />}
      {tab === "purchases" && <PurchasesTab items={items} vendors={vendors} isAdmin={isAdmin} onVendorAdded={loadMasters} />}
      {tab === "potatoOnion" && <PotatoOnionTab vendors={vendors} isAdmin={isAdmin} onVendorAdded={loadMasters} />}
      {tab === "cash" && <CashTab isAdmin={isAdmin} />}
    </div>
  );
}

function ChartPanel({ title, sub, action, children, style }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function OverviewTab({ items }: { items: VegItem[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<string>("main");
  const [produceItems, setProduceItems] = useState<string[]>([]);
  const [overview, setOverview] = useState<OverviewRow[] | null>(null);
  const [combined, setCombined] = useState<{ monthKey: string; monthLabel: string; totalAmount: number; amountChangePct: number | null }[] | null>(null);

  const [vendorMonth, setVendorMonth] = useState("");
  const [vendorRows, setVendorRows] = useState<VendorCompRow[] | null>(null);

  const [trendItemId, setTrendItemId] = useState<number | null>(null);
  const [trendRows, setTrendRows] = useState<ItemTrendRow[] | null>(null);

  useEffect(() => {
    fetch("/api/vegetable/stats?distinctProduceItems=1").then((r) => r.json()).then((d) => setProduceItems(d.items ?? []));
    fetch("/api/vegetable/stats?combined=1").then((r) => r.json()).then((d) => setCombined(d.rows ?? []));
  }, []);

  useEffect(() => {
    if (items.length > 0 && trendItemId === null) setTrendItemId(items[0].id);
  }, [items, trendItemId]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [from, to]);

  useEffect(() => {
    setOverview(null);
    const p = new URLSearchParams(qs);
    if (category === "main") {
      p.set("overview", "main");
    } else if (category.startsWith("cash:")) {
      p.set("overview", "cash");
      p.set("category", category.slice(5));
    } else if (category.startsWith("produce:")) {
      p.set("overview", "produce");
      p.set("item", category.slice(8));
    } else {
      return;
    }
    fetch(`/api/vegetable/stats?${p.toString()}`).then((r) => r.json()).then((d) => setOverview(d.rows ?? []));
  }, [category, qs]);

  useEffect(() => {
    if (!vendorMonth) return;
    setVendorRows(null);
    fetch(`/api/vegetable/stats?vendorComparison=1&month=${vendorMonth}`).then((r) => r.json()).then((d) => setVendorRows(d.rows ?? []));
  }, [vendorMonth]);

  useEffect(() => {
    if (!trendItemId) return;
    setTrendRows(null);
    const p = new URLSearchParams(qs);
    p.set("itemTrend", "1");
    p.set("itemId", String(trendItemId));
    fetch(`/api/vegetable/stats?${p.toString()}`).then((r) => r.json()).then((d) => setTrendRows(d.rows ?? []));
  }, [trendItemId, qs]);

  const latest = combined && combined.length > 0 ? combined[combined.length - 1] : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard icon={CalendarClock} label="Months Tracked" value={combined?.length ?? "—"} tint={C.teal} />
        <StatCard icon={IndianRupee} label={`Latest Month${latest ? " — " + latest.monthLabel : ""} (All Categories)`} value={latest ? fmtMoney(latest.totalAmount) : "—"} tint={C.amber} />
        <StatCard icon={Scale} label="Total Spend (all time, all categories)" value={combined ? fmtMoney(combined.reduce((s, r) => s + r.totalAmount, 0)) : "—"} tint={C.green} />
      </div>

      {combined && combined.length > 0 && (
        <ChartPanel title="Total Monthly Spend (All Categories Combined)" sub="Vegetables + Potato + Onion + Garlic/Flakes + Fruit & Cash" style={{ marginBottom: 22 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={combined} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} />
              <YAxis tick={{ fontFamily: FONT_BODY, fontSize: 11, fill: C.sub }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => fmtMoney(Number(v))} contentStyle={{ fontFamily: FONT_BODY, fontSize: 12.5, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Bar dataKey="totalAmount" fill={C.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      <ChartPanel
        title="Monthly Overview — Quantity, Amount & Rate"
        sub="Pick a category — same quantity but higher amount means the rate went up; a quantity spike at a stable rate flags over-ordering"
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Field label="From">
              <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 140 }} />
            </Field>
            <Field label="To">
              <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 140 }} />
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 220 }}>
                <option value="main">Main Vegetables (All Items)</option>
                {produceItems.map((it) => <option key={it} value={`produce:${it}`}>{it}</option>)}
                {CASH_CATEGORIES.map((c) => <option key={c} value={`cash:${c}`}>{c}</option>)}
              </Select>
            </Field>
          </div>
        }
        style={{ marginBottom: 22 }}
      >
        {!overview ? <Empty text="Loading…" /> : overview.length === 0 ? <Empty text="No data for this filter." /> : (
          <Table>
            <thead>
              <tr>
                <Th>Month</Th><Th>Qty (Kg)</Th><Th>Amount</Th><Th>Avg Rate</Th>
                <Th>Qty vs Prior</Th><Th>Amount vs Prior</Th><Th>Rate vs Prior</Th>
              </tr>
            </thead>
            <tbody>
              {overview.map((r) => (
                <tr key={r.monthKey}>
                  <Td>{r.monthLabel}</Td>
                  <Td>{r.totalQty != null ? r.totalQty.toLocaleString("en-IN") : "—"}</Td>
                  <Td>{fmtMoney(r.totalAmount)}</Td>
                  <Td>{r.avgRate != null ? `₹${r.avgRate}` : "—"}</Td>
                  <Td><PctBadge value={r.qtyChangePct} /></Td>
                  <Td><PctBadge value={r.amountChangePct} /></Td>
                  <Td><PctBadge value={r.rateChangePct} invert /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ChartPanel>

      <ChartPanel
        title="Vendor Comparison — Item-wise Average Rate"
        sub="Weighted average (Total Amount ÷ Total Quantity) per item per vendor, for one month"
        action={
          <Field label="Month">
            <Input type="month" value={vendorMonth} onChange={(e) => setVendorMonth(e.target.value)} style={{ width: 160 }} />
          </Field>
        }
        style={{ marginBottom: 22 }}
      >
        {!vendorMonth ? <Empty text="Pick a month to compare vendors." /> : !vendorRows ? <Empty text="Loading…" /> : vendorRows.length === 0 ? <Empty text="No purchases recorded that month." /> : (
          <Table>
            <thead>
              <tr><Th>Item</Th><Th>Vendor</Th><Th>Qty (Kg)</Th><Th>Amount</Th><Th>Avg Rate</Th></tr>
            </thead>
            <tbody>
              {vendorRows.map((r) => (
                <tr key={`${r.itemId}-${r.vendorId}`}>
                  <Td>{r.itemName}</Td>
                  <Td>{r.vendorName}</Td>
                  <Td>{r.totalQty.toLocaleString("en-IN")}</Td>
                  <Td>{fmtMoney(r.totalAmount)}</Td>
                  <Td>₹{r.avgRate}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ChartPanel>

      <ChartPanel
        title="Item Price & Quantity Trend"
        sub="Every purchase of one item over time — see rate/quantity fluctuation day by day"
        action={
          <Field label="Item">
            <Select value={trendItemId ?? ""} onChange={(e) => setTrendItemId(Number(e.target.value))} style={{ minWidth: 220 }}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
        }
      >
        {!trendRows ? <Empty text="Loading…" /> : trendRows.length === 0 ? <Empty text="No purchases recorded for this item in range." /> : (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <Table>
              <thead><tr><Th>Date</Th><Th>Vendor</Th><Th>Qty (Kg)</Th><Th>Rate</Th><Th>Amount</Th></tr></thead>
              <tbody>
                {trendRows.map((r, i) => (
                  <tr key={i}>
                    <Td>{fmtDate(r.date)}</Td><Td>{r.vendorName}</Td><Td>{r.quantity}</Td><Td>₹{r.rate}</Td><Td>{fmtMoney(r.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}

function FilterRow({ from, to, onChange, extra }: { from: string; to: string; onChange: (v: { from?: string; to?: string }) => void; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
      <Field label="From month">
        <Input type="month" value={from} onChange={(e) => onChange({ from: e.target.value })} />
      </Field>
      <Field label="To month">
        <Input type="month" value={to} onChange={(e) => onChange({ to: e.target.value })} />
      </Field>
      {extra}
    </div>
  );
}

function PurchasesTab({ items, vendors, isAdmin, onVendorAdded }: { items: VegItem[]; vendors: Vendor[]; isAdmin: boolean; onVendorAdded: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [itemId, setItemId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [rows, setRows] = useState<PurchaseRow[] | null>(null);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [importedDraft, setImportedDraft] = useState<BillDraft | null>(null);
  const [presetVendorId, setPresetVendorId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (itemId) p.set("itemId", itemId);
    if (vendorId) p.set("vendorId", vendorId);
    return p.toString();
  }, [from, to, itemId, vendorId]);

  const load = () => fetch(`/api/vegetable/purchases?${qs}`).then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, [qs]);

  const del = async (id: number) => {
    const res = await fetch(`/api/vegetable/purchases/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <FilterRow from={from} to={to} onChange={(v) => { if (v.from !== undefined) setFrom(v.from); if (v.to !== undefined) setTo(v.to); }} extra={
        <>
          <Field label="Item">
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} style={{ minWidth: 180 }}>
              <option value="">All items</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label="Vendor">
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">All vendors</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
        </>
      } />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <label style={{ display: "inline-flex" }}>
          <Btn variant="ghost" disabled={importing} onClick={() => document.getElementById("ambe-bill-input")?.click()}>
            <Upload size={15} /> {importing ? "Reading bill…" : "Import Ambe Bill (PDF)"}
          </Btn>
          <input
            id="ambe-bill-input" type="file" accept="application/pdf" style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImporting(true);
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/vegetable/purchases/import-ambe-bill", { method: "POST", body: fd });
              const d = await res.json().catch(() => ({}));
              setImporting(false);
              e.target.value = "";
              if (res.ok) { setImportedDraft(d); setShowBatchForm(true); }
              else alert(d.error || "Could not read this bill");
            }}
          />
        </label>
        <label style={{ display: "inline-flex" }}>
          <Btn variant="ghost" onClick={() => document.getElementById("milan-bill-input")?.click()}>
            <Upload size={15} /> Import Milan Veg Bill
          </Btn>
          {/* Milan Vegetable Co. (Jakir) bills are handwritten — there's no
              working parser for them, so this doesn't read the file at all.
              It's a shortcut that jumps straight into the manual entry grid
              with the vendor pre-selected, so picking a photo/scan here just
              opens the form for Ketan to enter numbers by hand. */}
          <input
            id="milan-bill-input" type="file" accept="application/pdf,image/*" style={{ display: "none" }}
            onChange={(e) => {
              if (!e.target.files?.[0]) return;
              e.target.value = "";
              setImportedDraft(null);
              const jakir = vendors.find((v) => v.name.toLowerCase() === "jakir");
              setPresetVendorId(jakir?.id ?? null);
              setShowBatchForm(true);
            }}
          />
        </label>
        <Btn onClick={() => { setImportedDraft(null); setPresetVendorId(null); setShowBatchForm(true); }}><Plus size={15} /> Add Day&apos;s Purchase</Btn>
        {isAdmin && <Btn variant="danger" onClick={() => setShowClear(true)}>Clear Data</Btn>}
      </div>

      {showClear && (
        <ClearDataModal
          title="Clear Vegetable Purchases"
          apiBase="/api/vegetable/purchases/clear"
          onClose={() => setShowClear(false)}
          onCleared={load}
        />
      )}

      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No purchases for this filter yet." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Item</Th><Th>Vendor</Th><Th>Qty (Kg)</Th><Th>Rate</Th><Th>Amount</Th><Th>Remarks</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.date)}</Td><Td>{r.item.name}</Td><Td>{r.vendor.name}</Td><Td>{r.quantity}</Td><Td>₹{r.rate}</Td><Td>{fmtMoney(r.amount)}</Td>
                <Td>{r.remarks || <span style={{ color: C.faint }}>—</span>}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(r.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showBatchForm && (
        <BatchPurchaseForm
          items={items} vendors={vendors} initialDraft={importedDraft} presetVendorId={presetVendorId}
          onClose={() => setShowBatchForm(false)}
          onSaved={() => { setShowBatchForm(false); setImportedDraft(null); setPresetVendorId(null); load(); }}
          onVendorAdded={onVendorAdded}
        />
      )}
      {showForm && (
        <PurchaseForm items={items} vendors={vendors} initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} onVendorAdded={onVendorAdded} />
      )}
    </div>
  );
}

// One vendor's full day of items at once — mirrors how the paper bill and
// the original Excel day-blocks actually work (one vendor, many items, one
// sitting), instead of the old one-item-per-modal flow. Reopening the same
// date+vendor preloads whatever was already saved (highlighted rows) so
// entries can be extended or corrected without creating duplicates.
function BatchPurchaseForm({
  items, vendors, initialDraft, presetVendorId, onClose, onSaved, onVendorAdded,
}: {
  items: VegItem[]; vendors: Vendor[]; initialDraft?: BillDraft | null; presetVendorId?: number | null;
  onClose: () => void; onSaved: () => void; onVendorAdded: () => void;
}) {
  const [date, setDate] = useState(() => initialDraft?.date ?? new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState<number | "">(initialDraft?.vendorId ?? presetVendorId ?? "");
  const [newVendor, setNewVendor] = useState("");
  const [search, setSearch] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [lines, setLines] = useState<Record<number, { entryId: number | null; quantity: string; rate: string }>>({});
  const [remarks, setRemarks] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVendor = async () => {
    if (!newVendor.trim()) return;
    const res = await fetch("/api/vegetable/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendor.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setNewVendor(""); onVendorAdded(); setVendorId(d.id); }
    else alert(d.error || "Could not add vendor");
  };

  // Adding a missing item right from the entry grid (instead of a separate
  // Manage Items screen) — jump the search box to it so it's the one row
  // Ketan sees, ready to fill in immediately.
  const addItem = async () => {
    if (!newItemName.trim()) return;
    const res = await fetch("/api/vegetable/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newItemName.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setSearch(newItemName.trim()); setNewItemName(""); onVendorAdded(); }
    else alert(d.error || "Could not add item");
  };

  useEffect(() => {
    if (!date || !vendorId) { setLines({}); setRemarks(""); return; }
    setLoadingExisting(true);
    fetch(`/api/vegetable/purchases?vendorId=${vendorId}&date=${date}`)
      .then((r) => r.json())
      .then((rows: PurchaseRow[]) => {
        const map: Record<number, { entryId: number | null; quantity: string; rate: string }> = {};
        for (const r of rows) map[r.itemId] = { entryId: r.id, quantity: String(r.quantity), rate: String(r.rate) };
        // Already-saved entries win (never silently overwritten by a
        // re-imported bill); the draft only fills in items with no existing
        // entry yet for this date+vendor.
        if (initialDraft) {
          for (const line of initialDraft.lines) {
            if (line.itemId != null && !map[line.itemId]) {
              map[line.itemId] = { entryId: null, quantity: String(line.quantity), rate: String(line.rate) };
            }
          }
        }
        setLines(map);
        // One Remarks value per day+vendor batch — every saved line for
        // this date/vendor should already carry the same text, so the
        // first non-empty one found is the batch's remarks.
        setRemarks(rows.find((r) => r.remarks)?.remarks ?? "");
        setLoadingExisting(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, vendorId]);

  const setLine = (itemId: number, patch: Partial<{ quantity: string; rate: string }>) => {
    setLines((prev) => ({
      ...prev,
      [itemId]: { entryId: prev[itemId]?.entryId ?? null, quantity: prev[itemId]?.quantity ?? "", rate: prev[itemId]?.rate ?? "", ...patch },
    }));
  };

  const filteredItems = search.trim() ? items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase())) : items;

  const activeCount = Object.values(lines).filter((l) => l.quantity && l.rate).length;
  const totalAmount = Object.values(lines).reduce((s, l) => {
    const q = Number(l.quantity), r = Number(l.rate);
    return s + (l.quantity && l.rate && !isNaN(q) && !isNaN(r) ? q * r : 0);
  }, 0);

  const submit = async () => {
    if (!date || !vendorId) { setError("Pick a date and vendor first"); return; }
    const jobs: Promise<Response>[] = [];
    for (const item of items) {
      const line = lines[item.id];
      if (!line || !line.quantity || !line.rate) continue;
      const q = Number(line.quantity), r = Number(line.rate);
      if (isNaN(q) || isNaN(r)) continue;
      if (line.entryId) {
        jobs.push(fetch(`/api/vegetable/purchases/${line.entryId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, itemId: item.id, vendorId, quantity: q, rate: r, remarks }),
        }));
      } else {
        jobs.push(fetch("/api/vegetable/purchases", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, itemId: item.id, vendorId, quantity: q, rate: r, remarks }),
        }));
      }
    }
    if (jobs.length === 0) { setError("Enter quantity and rate for at least one item"); return; }
    setSaving(true); setError("");
    const results = await Promise.all(jobs);
    const failed = results.filter((r) => !r.ok).length;
    setSaving(false);
    if (failed > 0) { setError(`${failed} of ${jobs.length} line(s) failed to save — please retry.`); return; }
    onSaved();
  };

  const unmatchedLines = initialDraft?.lines.filter((l) => l.itemId == null) ?? [];

  return (
    <Modal title={initialDraft ? "Review Imported Bill" : "Add Day's Purchase"} onClose={onClose} width={720}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {initialDraft && (
          <div style={{ background: "#F0FBF6", border: `1px solid ${C.green}`, borderRadius: 8, padding: 12, fontSize: 12.5, color: C.ink }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Imported from {initialDraft.vendorName}{initialDraft.invoiceNo ? ` invoice ${initialDraft.invoiceNo}` : ""} — nothing is saved yet, review below then click Save All.
            </div>
            <div style={{ color: C.sub }}>
              Bill total: {fmtMoney(initialDraft.printedTotal ?? 0)} · Read from bill: {fmtMoney(initialDraft.sumOfLines)}
              {initialDraft.totalMismatch && <span style={{ color: C.red, fontWeight: 600 }}> — totals don&apos;t match, please double-check every line</span>}
            </div>
            {unmatchedLines.length > 0 && (
              <div style={{ color: C.red, marginTop: 6 }}>
                {unmatchedLines.length} item(s) on the bill could not be matched to a known item and were NOT pre-filled — add them manually below: {unmatchedLines.map((l) => `"${l.particulars}" (${l.quantity} @ ₹${l.rate})`).join(", ")}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Vendor">
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">Select…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
        </div>
        {date && vendorId ? (
          <>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item…" />
            {loadingExisting ? <Empty text="Loading…" /> : (
              <div style={{ maxHeight: "42vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: C.sub, fontWeight: 600, fontSize: 11.5 }}>ITEM</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: C.sub, fontWeight: 600, fontSize: 11.5, width: 110 }}>QTY (KG)</th>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: C.sub, fontWeight: 600, fontSize: 11.5, width: 110 }}>RATE (₹)</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: C.sub, fontWeight: 600, fontSize: 11.5, width: 100 }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const line = lines[item.id];
                      const hasExisting = !!line?.entryId;
                      const q = line ? Number(line.quantity) : NaN;
                      const r = line ? Number(line.rate) : NaN;
                      const amt = line?.quantity && line?.rate && !isNaN(q) && !isNaN(r) ? q * r : null;
                      return (
                        <tr key={item.id} style={{ borderTop: `1px solid ${C.border}`, background: hasExisting ? "#F0FBF6" : "transparent" }}>
                          <td style={{ padding: "5px 10px" }}>{item.name}</td>
                          <td style={{ padding: "5px 6px" }}>
                            <input
                              type="number" step="any" value={line?.quantity ?? ""}
                              onChange={(e) => setLine(item.id, { quantity: e.target.value })}
                              style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT_BODY }}
                            />
                          </td>
                          <td style={{ padding: "5px 6px" }}>
                            <input
                              type="number" step="any" value={line?.rate ?? ""}
                              onChange={(e) => setLine(item.id, { rate: e.target.value })}
                              style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: FONT_BODY }}
                            />
                          </td>
                          <td style={{ padding: "5px 10px", textAlign: "right", color: C.sub }}>{amt != null ? fmtMoney(amt) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.sub }}>
              <span>{activeCount} item(s) entered · green rows were already saved for this date &amp; vendor</span>
              <span>Total: <strong style={{ color: C.ink }}>{fmtMoney(totalAmount)}</strong> — check this against the vendor&apos;s bill</span>
            </div>
          </>
        ) : (
          <div style={{ color: C.sub, fontSize: 13, padding: "10px 0" }}>Pick a date and vendor to start entering items.</div>
        )}

        <Field label="Remarks (optional — e.g. quality issue, a debit applied)">
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Applies to this whole day's purchase from this vendor" />
        </Field>

        <div style={{ display: "flex", gap: 8 }}>
          <Input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="New vendor name" style={{ flex: 1 }} />
          <Btn type="button" variant="ghost" onClick={addVendor}>Add Vendor</Btn>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="New vegetable/fruit item name (not in the list below)" style={{ flex: 1 }} />
          <Btn type="button" variant="ghost" onClick={addItem}>Add Item</Btn>
        </div>

        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving || !date || !vendorId}>{saving ? "Saving…" : "Save All"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function PurchaseForm({
  items, vendors, initial, onClose, onSaved, onVendorAdded,
}: {
  items: VegItem[]; vendors: Vendor[]; initial: PurchaseRow | null;
  onClose: () => void; onSaved: () => void; onVendorAdded: () => void;
}) {
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? "");
  const [itemId, setItemId] = useState<number | "">(initial?.itemId ?? "");
  const [vendorId, setVendorId] = useState<number | "">(initial?.vendorId ?? "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : "");
  const [rate, setRate] = useState(initial ? String(initial.rate) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [newVendor, setNewVendor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVendor = async () => {
    if (!newVendor.trim()) return;
    const res = await fetch("/api/vegetable/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendor.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setNewVendor(""); onVendorAdded(); setVendorId(d.id); }
    else alert(d.error || "Could not add vendor");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !itemId || !vendorId || !quantity || !rate) { setError("All fields are required"); return; }
    setSaving(true); setError("");
    const url = initial ? `/api/vegetable/purchases/${initial.id}` : "/api/vegetable/purchases";
    const res = await fetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, itemId, vendorId, quantity, rate, remarks }) });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Purchase" : "Add Purchase"} onClose={onClose} width={480}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label="Item">
          <Select value={itemId} onChange={(e) => setItemId(Number(e.target.value))} required>
            <option value="">Select…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        </Field>
        <Field label="Vendor">
          <div style={{ display: "flex", gap: 8 }}>
            <Select value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))} required style={{ flex: 1 }}>
              <option value="">Select…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="New vendor name" style={{ flex: 1 }} />
            <Btn type="button" variant="ghost" onClick={addVendor}>Add</Btn>
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Quantity (Kg)"><Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></Field>
          <Field label="Rate (₹/Kg)"><Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} required /></Field>
        </div>
        {quantity && rate && !isNaN(Number(quantity)) && !isNaN(Number(rate)) && (
          <div style={{ fontSize: 13, color: C.sub }}>Amount: <strong style={{ color: C.ink }}>{fmtMoney(Number(quantity) * Number(rate))}</strong></div>
        )}
        <Field label="Remarks (optional)">
          <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. quality issue, a debit applied" />
        </Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function PotatoOnionTab({ vendors, isAdmin, onVendorAdded }: { vendors: Vendor[]; isAdmin: boolean; onVendorAdded: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<PotatoOnionRow[] | null>(null);
  const [editing, setEditing] = useState<PotatoOnionRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = () => fetch(`/api/vegetable/potato-onion?${qs}`).then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, [qs]);

  const del = async (id: number) => {
    const res = await fetch(`/api/vegetable/potato-onion/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <FilterRow from={from} to={to} onChange={(v) => { if (v.from !== undefined) setFrom(v.from); if (v.to !== undefined) setTo(v.to); }} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Add Entry</Btn>
        {isAdmin && <Btn variant="danger" onClick={() => setShowClear(true)}>Clear Data</Btn>}
      </div>

      {showClear && (
        <ClearDataModal
          title="Clear Potato & Onion Entries"
          apiBase="/api/vegetable/potato-onion/clear"
          onClose={() => setShowClear(false)}
          onCleared={load}
        />
      )}

      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No entries for this filter yet." /> : (
        <Table>
          <thead>
            <tr>
              <Th>Bill Date</Th><Th>Bill No</Th><Th>Item</Th><Th>Vendor</Th><Th>Source</Th>
              <Th>Qty (Kg)</Th><Th>Rate</Th><Th>Amount</Th><Th>Received</Th><Th>Stock Note</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.billDate)}</Td><Td>{r.billNo || "—"}</Td><Td>{r.item}</Td><Td>{r.vendor?.name ?? "—"}</Td><Td>{r.source || "—"}</Td>
                <Td>{r.quantity ?? "—"}</Td><Td>{r.rate != null ? `₹${r.rate}` : "—"}</Td><Td>{r.amount != null ? fmtMoney(r.amount) : "—"}</Td>
                <Td>{r.materialReceivedDate || "—"}</Td><Td>{r.closingStockNote || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(r.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && (
        <PotatoOnionForm vendors={vendors} initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} onVendorAdded={onVendorAdded} />
      )}
    </div>
  );
}

function PotatoOnionForm({
  vendors, initial, onClose, onSaved, onVendorAdded,
}: {
  vendors: Vendor[]; initial: PotatoOnionRow | null;
  onClose: () => void; onSaved: () => void; onVendorAdded: () => void;
}) {
  const [billNo, setBillNo] = useState(initial?.billNo ?? "");
  const [billDate, setBillDate] = useState(initial?.billDate?.slice(0, 10) ?? "");
  const [materialReceivedDate, setMaterialReceivedDate] = useState(initial?.materialReceivedDate ?? "");
  const [vendorId, setVendorId] = useState<number | "">(initial?.vendorId ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [item, setItem] = useState(initial?.item ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : "");
  const [rate, setRate] = useState(initial?.rate != null ? String(initial.rate) : "");
  const [closingStockNote, setClosingStockNote] = useState(initial?.closingStockNote ?? "");
  const [newVendor, setNewVendor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addVendor = async () => {
    if (!newVendor.trim()) return;
    const res = await fetch("/api/vegetable/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendor.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setNewVendor(""); onVendorAdded(); setVendorId(d.id); }
    else alert(d.error || "Could not add vendor");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDate || !item.trim()) { setError("Bill Date and Item are required"); return; }
    setSaving(true); setError("");
    const url = initial ? `/api/vegetable/potato-onion/${initial.id}` : "/api/vegetable/potato-onion";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billNo, billDate, materialReceivedDate, vendorId: vendorId || null, source, item, quantity, rate, closingStockNote }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Entry" : "Add Potato/Onion Entry"} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Bill Date"><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required /></Field>
          <Field label="Bill No"><Input value={billNo} onChange={(e) => setBillNo(e.target.value)} /></Field>
        </div>
        <Field label="Item">
          <Input value={item} onChange={(e) => setItem(e.target.value)} list="produce-item-suggestions" placeholder="e.g. Potato, Onion, Garlic, Baby Potato" required />
          <datalist id="produce-item-suggestions">
            <option value="Potato" /><option value="Onion" /><option value="Garlic" /><option value="Baby Potato" />
          </datalist>
        </Field>
        <Field label="Vendor">
          <Select value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="New vendor name" style={{ flex: 1 }} />
            <Btn type="button" variant="ghost" onClick={addVendor}>Add</Btn>
          </div>
        </Field>
        <Field label="Source (broker/contact)"><Input value={source} onChange={(e) => setSource(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Quantity (Kg)"><Input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
          <Field label="Rate (₹/Kg)"><Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        </div>
        <Field label="Material Received Date (free text — e.g. '29-07-2025 Morning')">
          <Input value={materialReceivedDate} onChange={(e) => setMaterialReceivedDate(e.target.value)} />
        </Field>
        <Field label="Closing Stock Note"><Input value={closingStockNote} onChange={(e) => setClosingStockNote(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function CashTab({ isAdmin }: { isAdmin: boolean }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<CashRow[] | null>(null);
  const [editing, setEditing] = useState<CashRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = () => fetch(`/api/vegetable/cash?${qs}`).then((r) => r.json()).then(setRows);
  useEffect(() => { load(); }, [qs]);

  const del = async (id: number) => {
    const res = await fetch(`/api/vegetable/cash/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <FilterRow from={from} to={to} onChange={(v) => { if (v.from !== undefined) setFrom(v.from); if (v.to !== undefined) setTo(v.to); }} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={15} /> Add Entry</Btn>
        {isAdmin && <Btn variant="danger" onClick={() => setShowClear(true)}>Clear Data</Btn>}
      </div>

      {showClear && (
        <ClearDataModal
          title="Clear Cash Purchases"
          apiBase="/api/vegetable/cash/clear"
          onClose={() => setShowClear(false)}
          onCleared={load}
        />
      )}

      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No entries for this filter yet." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Category</Th><Th>Amount</Th><Th>Remarks</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.date)}</Td><Td>{r.category}</Td><Td>{fmtMoney(r.amount)}</Td><Td>{r.remarks || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    {isAdmin && <ConfirmDelete onConfirm={() => del(r.id)} />}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {showForm && <CashForm initial={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function CashForm({ initial, onClose, onSaved }: { initial: CashRow | null; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? "");
  const [category, setCategory] = useState(initial?.category ?? CASH_CATEGORIES[0]);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) { setError("Date and Amount are required"); return; }
    setSaving(true); setError("");
    const url = initial ? `/api/vegetable/cash/${initial.id}` : "/api/vegetable/cash";
    const res = await fetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, category, amount, remarks }) });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Entry" : "Add Cash Purchase"} onClose={onClose} width={440}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CASH_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Amount (₹)"><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field label="Remarks"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

function ManageMastersModal({
  items, vendors, onClose, onChanged,
}: {
  items: VegItem[]; vendors: Vendor[]; onClose: () => void; onChanged: () => void;
}) {
  const [tab, setTab] = useState<"items" | "vendors">("items");
  const [newItem, setNewItem] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addItem = async () => {
    if (!newItem.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/vegetable/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newItem.trim() }) });
    if (res.ok) { setNewItem(""); onChanged(); } else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not add"); }
    setSaving(false);
  };
  const addVendor = async () => {
    if (!newVendor.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/vegetable/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendor.trim() }) });
    if (res.ok) { setNewVendor(""); onChanged(); } else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not add"); }
    setSaving(false);
  };

  return (
    <Modal title="Manage Items & Vendors" onClose={onClose} width={520}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setTab("items")} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: tab === "items" ? C.teal : "#fff", color: tab === "items" ? "#fff" : C.ink, border: `1px solid ${tab === "items" ? C.teal : C.border}` }}>Vegetable/Fruit Items</button>
        <button onClick={() => setTab("vendors")} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: tab === "vendors" ? C.teal : "#fff", color: tab === "vendors" ? "#fff" : C.ink, border: `1px solid ${tab === "vendors" ? C.teal : C.border}` }}>Vendors</button>
      </div>

      {tab === "items" ? (
        <div>
          <div style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>New items are always added at the end (highest Sr. No.) — the existing order 1–{items.length} never changes.</div>
          <div style={{ maxHeight: "35vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "6px 10px", color: C.sub, width: 50 }}>{i.srNo}</td>
                    <td style={{ padding: "6px 10px" }}>{i.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="New item name" style={{ flex: 1 }} />
            <Btn onClick={addItem} disabled={saving}>Add</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ maxHeight: "35vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "6px 10px" }}>{v.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="New vendor name" style={{ flex: 1 }} />
            <Btn onClick={addVendor} disabled={saving}>Add</Btn>
          </div>
        </div>
      )}

      {error && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Close</Btn>
      </div>
    </Modal>
  );
}
