"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SectionHead, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete } from "@/app/components/ui";
import { C } from "@/app/lib/constants";
import { ALKESH_COMMODITY_CATEGORIES } from "@/app/lib/alkeshMeta";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- MRP tab ----------
interface MrpRow { id: number; date: string; vendorName: string; category: string; site: string; amount: number; remarks: string }
interface MrpSuggestions { vendorNames: string[]; categories: string[]; sites: string[] }

function MrpTab() {
  const [rows, setRows] = useState<MrpRow[] | null>(null);
  const [suggestions, setSuggestions] = useState<MrpSuggestions>({ vendorNames: [], categories: [], sites: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MrpRow | null>(null);

  const load = () => {
    fetch("/api/alkesh/mrp").then((r) => r.json()).then(setRows);
    fetch("/api/alkesh/mrp/suggestions").then((r) => r.json()).then(setSuggestions);
  };
  useEffect(load, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/alkesh/mrp/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add MRP Purchase</Btn>
      </div>
      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No MRP entries yet." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Vendor</Th><Th>Category</Th><Th>Site</Th><Th style={{ textAlign: "right" }}>Amount</Th><Th>Remarks</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{r.vendorName}</Td>
                <Td>{r.category}</Td>
                <Td>{r.site}</Td>
                <Td style={{ textAlign: "right" }}>₹{fmtNum(r.amount)}</Td>
                <Td style={{ color: C.sub }}>{r.remarks || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    <ConfirmDelete onConfirm={() => del(r.id)} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {showAdd && <MrpForm suggestions={suggestions} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <MrpForm suggestions={suggestions} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function MrpForm({ suggestions, initial, onClose, onSaved }: { suggestions: MrpSuggestions; initial?: MrpRow; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(initial?.date.slice(0, 10) ?? todayStr());
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [site, setSite] = useState(initial?.site ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/alkesh/mrp/${initial.id}` : "/api/alkesh/mrp";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, vendorName, category, site, amount, remarks }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit MRP Purchase" : "Add MRP Purchase"} onClose={onClose} width={440}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Vendor Name">
          <Input list="mrp-vendors" required value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Havmor Agency" />
          <datalist id="mrp-vendors">{suggestions.vendorNames.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Category">
          <Input list="mrp-categories" required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Biscuit, Juice, Namkeen" />
          <datalist id="mrp-categories">{suggestions.categories.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Site">
          <Input list="mrp-sites" required value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. IBPL, TTEC" />
          <datalist id="mrp-sites">{suggestions.sites.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Amount (₹)"><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Remarks (optional)"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Milk & Dairy tab ----------
const MILK_SITE_SUGGESTIONS = ["Sez", "Amneal", "Intas", "IBPL", "Unison", "Ttec", "Finar", "Veeglow", "O2H", "Inox Solar", "CK"];

interface MilkRow { id: number; date: string; site: string; milkTeaQty: number; milkPantryQty: number; curdQty: number; buttermilkQty: number; remarks: string }

function MilkTab() {
  const [rows, setRows] = useState<MilkRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MilkRow | null>(null);

  const load = () => { fetch("/api/alkesh/milk").then((r) => r.json()).then(setRows); };
  useEffect(load, []);

  const del = async (id: number) => {
    const res = await fetch(`/api/alkesh/milk/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <div style={{ background: C.tealSoft, border: `1px solid ${C.teal}55`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
        Split milk into <strong>Tea</strong> (used for tea/coffee) and <strong>Pantry</strong> (diverted, not for tea) — this keeps the tea-consumption ratio accurate without a manual adjustment.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add Milk / Curd / Buttermilk Entry</Btn>
      </div>
      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No entries yet." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Site</Th><Th style={{ textAlign: "right" }}>Milk (Tea) Ltr</Th><Th style={{ textAlign: "right" }}>Milk (Pantry) Ltr</Th><Th style={{ textAlign: "right" }}>Curd Kg</Th><Th style={{ textAlign: "right" }}>Buttermilk pcs</Th><Th>Remarks</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{r.site}</Td>
                <Td style={{ textAlign: "right" }}>{fmtNum(r.milkTeaQty)}</Td>
                <Td style={{ textAlign: "right", color: r.milkPantryQty > 0 ? C.amber : C.ink }}>{fmtNum(r.milkPantryQty)}</Td>
                <Td style={{ textAlign: "right" }}>{fmtNum(r.curdQty)}</Td>
                <Td style={{ textAlign: "right" }}>{fmtNum(r.buttermilkQty)}</Td>
                <Td style={{ color: C.sub }}>{r.remarks || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    <ConfirmDelete onConfirm={() => del(r.id)} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {showAdd && <MilkForm onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <MilkForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function MilkForm({ initial, onClose, onSaved }: { initial?: MilkRow; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(initial?.date.slice(0, 10) ?? todayStr());
  const [site, setSite] = useState(initial?.site ?? "");
  const [milkTeaQty, setMilkTeaQty] = useState(initial ? String(initial.milkTeaQty) : "");
  const [milkPantryQty, setMilkPantryQty] = useState(initial ? String(initial.milkPantryQty) : "");
  const [curdQty, setCurdQty] = useState(initial ? String(initial.curdQty) : "");
  const [buttermilkQty, setButtermilkQty] = useState(initial ? String(initial.buttermilkQty) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/alkesh/milk/${initial.id}` : "/api/alkesh/milk";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, site, milkTeaQty, milkPantryQty, curdQty, buttermilkQty, remarks }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Entry" : "Add Milk / Curd / Buttermilk Entry"} onClose={onClose} width={460}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Site">
          <Input list="milk-sites" required value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. IBPL" />
          <datalist id="milk-sites">{MILK_SITE_SUGGESTIONS.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Milk — Tea Use (Ltr)"><Input type="number" step="0.01" value={milkTeaQty} onChange={(e) => setMilkTeaQty(e.target.value)} /></Field>
          <Field label="Milk — Pantry Use (Ltr)"><Input type="number" step="0.01" value={milkPantryQty} onChange={(e) => setMilkPantryQty(e.target.value)} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Curd (Kg)"><Input type="number" step="0.01" value={curdQty} onChange={(e) => setCurdQty(e.target.value)} /></Field>
          <Field label="Buttermilk (pcs)"><Input type="number" step="0.01" value={buttermilkQty} onChange={(e) => setButtermilkQty(e.target.value)} /></Field>
        </div>
        <Field label="Remarks (optional)"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Gas, Oil & Provision tab ----------
interface CommodityRow { id: number; date: string; category: string; quantity: number | null; rate: number | null; amount: number; remarks: string }

function CommodityTab() {
  const [rows, setRows] = useState<CommodityRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CommodityRow | null>(null);

  const load = () => {
    const qs = filter ? `?category=${encodeURIComponent(filter)}` : "";
    fetch(`/api/alkesh/commodity${qs}`).then((r) => r.json()).then(setRows);
  };
  useEffect(load, [filter]);

  const del = async (id: number) => {
    const res = await fetch(`/api/alkesh/commodity/${id}`, { method: "DELETE" });
    if (res.ok) load(); else alert("Could not delete");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All categories</option>
          {ALKESH_COMMODITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add Entry</Btn>
      </div>
      {rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No entries yet." /> : (
        <Table>
          <thead><tr><Th>Date</Th><Th>Category</Th><Th style={{ textAlign: "right" }}>Qty</Th><Th style={{ textAlign: "right" }}>Rate</Th><Th style={{ textAlign: "right" }}>Amount</Th><Th>Remarks</Th><Th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{r.category}</Td>
                <Td style={{ textAlign: "right" }}>{r.quantity == null ? "—" : fmtNum(r.quantity)}</Td>
                <Td style={{ textAlign: "right" }}>{r.rate == null ? "—" : fmtNum(r.rate)}</Td>
                <Td style={{ textAlign: "right" }}>₹{fmtNum(r.amount)}</Td>
                <Td style={{ color: C.sub }}>{r.remarks || "—"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    <ConfirmDelete onConfirm={() => del(r.id)} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {showAdd && <CommodityForm onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {editing && <CommodityForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CommodityForm({ initial, onClose, onSaved }: { initial?: CommodityRow; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(initial?.date.slice(0, 10) ?? todayStr());
  const [category, setCategory] = useState(initial?.category ?? ALKESH_COMMODITY_CATEGORIES[0]);
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : "");
  const [rate, setRate] = useState(initial?.rate != null ? String(initial.rate) : "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = Number(quantity), r = Number(rate);
    if (quantity !== "" && rate !== "" && !isNaN(q) && !isNaN(r)) setAmount(String(Math.round(q * r * 100) / 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, rate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/alkesh/commodity/${initial.id}` : "/api/alkesh/commodity";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, category, quantity: quantity || undefined, rate: rate || undefined, amount, remarks }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? "Edit Entry" : "Add Gas / Oil / Provision Entry"} onClose={onClose} width={440}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Category">
          <Select required value={category} onChange={(e) => setCategory(e.target.value)}>
            {ALKESH_COMMODITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Quantity (optional)"><Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
          <Field label="Rate (optional)"><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        </div>
        <Field label="Amount (₹) — auto-fills from Qty × Rate, editable"><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Remarks (optional)"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        {error && <div style={{ color: C.red, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Page ----------
export default function AlkeshKitchenPage() {
  const [tab, setTab] = useState<"mrp" | "milk" | "commodity">("mrp");

  return (
    <div>
      <SectionHead
        title="Alkesh Reports"
        sub="Kitchen Weekly MIS — MRP, Milk & Dairy, Gas, Oil and Provision entries. Roti and Vegetable are pulled in automatically from Kiran's and Ketan's modules, no entry needed here."
      />
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["mrp", "MRP"],
          ["milk", "Milk & Dairy"],
          ["commodity", "Gas, Oil & Provision"],
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
      {tab === "mrp" && <MrpTab />}
      {tab === "milk" && <MilkTab />}
      {tab === "commodity" && <CommodityTab />}
    </div>
  );
}
