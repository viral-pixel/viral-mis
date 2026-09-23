"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { SectionHead, Btn, Table, Th, Td, Empty, Field, Input, Select, Textarea, Modal, ConfirmDelete } from "@/app/components/ui";
import { C } from "@/app/lib/constants";
import { COSTING_DEFAULT_CATEGORIES } from "@/app/lib/costingMeta";
import { computeCostingRow, computeRecipeRow } from "@/app/lib/costingCalc";

function fmtMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function fmtDateDay(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
  return `${day} (${weekday})`;
}
function todayISO() {
  return new Date().toISOString();
}

// ---------- Farsan-style items ----------
interface ItemRow {
  id: number; category: string; name: string; ratePerUnit: number;
  servingQtyLabel: string; servingsPerUnitLabel: string; costBasis: string; conversionFactor: number; wastagePct: number;
  countPerPlate: string; accompanimentsCost: number | null; tadkaCost: number | null; asOfDate: string; remarks: string;
}

function ItemsTable({ category, rows, onChanged }: { category: string; rows: ItemRow[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);

  const del = async (id: number) => {
    const res = await fetch(`/api/costing/items/${id}`, { method: "DELETE" });
    if (res.ok) onChanged(); else alert("Could not delete");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add {category} Item</Btn>
      </div>
      {rows.length === 0 ? <Empty text={`No ${category} items yet.`} /> : (
        <Table>
          <thead>
            <tr>
              <Th>Item</Th><Th style={{ textAlign: "right" }}>Rate</Th><Th>Serving Qty</Th>
              <Th style={{ textAlign: "right" }}>Cost/Person</Th><Th style={{ textAlign: "right" }}>Wastage</Th>
              <Th style={{ textAlign: "right" }}>Actual Cost</Th><Th>Count/Plate</Th>
              <Th style={{ textAlign: "right" }}>Accompaniments</Th><Th style={{ textAlign: "right" }}>Tadka</Th>
              <Th style={{ textAlign: "right" }}>Approx Total</Th><Th>As Of</Th><Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = computeCostingRow(r);
              return (
                <tr key={r.id}>
                  <Td>{r.name}</Td>
                  <Td style={{ textAlign: "right" }}>{fmtMoney(r.ratePerUnit)}</Td>
                  <Td>{r.servingQtyLabel}{r.servingsPerUnitLabel ? ` / ${r.servingsPerUnitLabel}` : ""}</Td>
                  <Td style={{ textAlign: "right" }}>{fmtMoney(d.costPerPerson)}</Td>
                  <Td style={{ textAlign: "right", color: C.sub }}>{fmtMoney(d.wastageAmount)}</Td>
                  <Td style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney(d.actualCostPerPerson)}</Td>
                  <Td>{r.countPerPlate || "—"}</Td>
                  <Td style={{ textAlign: "right" }}>{r.accompanimentsCost == null ? <span style={{ color: C.amber }}>Pending</span> : fmtMoney(r.accompanimentsCost)}</Td>
                  <Td style={{ textAlign: "right" }}>{r.tadkaCost == null ? <span style={{ color: C.amber }}>Pending</span> : fmtMoney(r.tadkaCost)}</Td>
                  <Td style={{ textAlign: "right", fontWeight: 700 }}>{d.approxTotalCost == null ? <span style={{ color: C.amber }}>Pending</span> : fmtMoney(d.approxTotalCost)}</Td>
                  <Td style={{ color: C.sub, fontSize: 12 }}>{fmtDateDay(r.asOfDate)}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                      <ConfirmDelete onConfirm={() => del(r.id)} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {showAdd && <ItemForm category={category} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onChanged(); }} />}
      {editing && <ItemForm category={category} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function ItemForm({ category, initial, onClose, onSaved }: { category: string; initial?: ItemRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ratePerUnit, setRatePerUnit] = useState(initial ? String(initial.ratePerUnit) : "");
  const [servingQtyLabel, setServingQtyLabel] = useState(initial?.servingQtyLabel ?? "");
  const [servingsPerUnitLabel, setServingsPerUnitLabel] = useState(initial?.servingsPerUnitLabel ?? "");
  const [costBasis, setCostBasis] = useState(initial?.costBasis ?? "PER_KG");
  const [conversionFactor, setConversionFactor] = useState(initial ? String(initial.conversionFactor) : "1");
  const [wastagePct, setWastagePct] = useState(initial ? String(initial.wastagePct) : "10");
  const [countPerPlate, setCountPerPlate] = useState(initial?.countPerPlate ?? "");
  const [accompanimentsCost, setAccompanimentsCost] = useState(initial?.accompanimentsCost != null ? String(initial.accompanimentsCost) : "");
  const [tadkaCost, setTadkaCost] = useState(initial?.tadkaCost != null ? String(initial.tadkaCost) : "");
  const [asOfDate, setAsOfDate] = useState((initial?.asOfDate ?? todayISO()).slice(0, 10));
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/costing/items/${initial.id}` : "/api/costing/items";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category, name, ratePerUnit, servingQtyLabel, servingsPerUnitLabel, costBasis, conversionFactor, wastagePct,
        countPerPlate, accompanimentsCost, tadkaCost, asOfDate, remarks,
      }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? `Edit ${category} Item` : `Add ${category} Item`} onClose={onClose} width={480}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Item Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Rate per Kg / Piece (₹)"><Input type="number" step="0.01" required value={ratePerUnit} onChange={(e) => setRatePerUnit(e.target.value)} /></Field>
          <Field label="As Of Date"><Input type="date" required value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Standard Serving Qty"><Input value={servingQtyLabel} onChange={(e) => setServingQtyLabel(e.target.value)} placeholder="e.g. 70 gm" /></Field>
          <Field label="Approx Servings per Kg/Piece"><Input value={servingsPerUnitLabel} onChange={(e) => setServingsPerUnitLabel(e.target.value)} placeholder="e.g. 14 Persons" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Cost Basis">
            <Select value={costBasis} onChange={(e) => setCostBasis(e.target.value)}>
              <option value="PER_KG">Per Kg — Rate ÷ factor</option>
              <option value="PER_PIECE">Per Piece — Rate × factor</option>
            </Select>
          </Field>
          <Field label="Conversion Factor"><Input type="number" step="0.01" required value={conversionFactor} onChange={(e) => setConversionFactor(e.target.value)} /></Field>
        </div>
        <Field label="Wastage %"><Input type="number" step="0.01" required value={wastagePct} onChange={(e) => setWastagePct(e.target.value)} /></Field>
        <Field label="Count to be Given in One Plate"><Input value={countPerPlate} onChange={(e) => setCountPerPlate(e.target.value)} placeholder="e.g. 2 NOS" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Approx Accompaniments Cost (blank = Pending)"><Input type="number" step="0.01" value={accompanimentsCost} onChange={(e) => setAccompanimentsCost(e.target.value)} /></Field>
          <Field label="Approx Tadka Cost (blank = Pending)"><Input type="number" step="0.01" value={tadkaCost} onChange={(e) => setTadkaCost(e.target.value)} /></Field>
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

// ---------- Sweets-style recipes ----------
interface Ingredient { id?: number; name: string; qtyLabel: string; amount: number }
interface RecipeRow {
  id: number; category: string; name: string; batchQty: number; batchUnit: string;
  servingLabel: string; servingConversionFactor: number; asOfDate: string; remarks: string; ingredients: Ingredient[];
}

function RecipesList({ category, rows, onChanged }: { category: string; rows: RecipeRow[]; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RecipeRow | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const del = async (id: number) => {
    const res = await fetch(`/api/costing/recipes/${id}`, { method: "DELETE" });
    if (res.ok) onChanged(); else alert("Could not delete");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add {category} Recipe</Btn>
      </div>
      {rows.length === 0 ? <Empty text={`No ${category} recipes yet.`} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => {
            const d = computeRecipeRow(r.ingredients, r.batchQty, r.servingConversionFactor);
            const open = expanded.has(r.id);
            return (
              <div key={r.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }} onClick={() => toggle(r.id)}>
                  {open ? <ChevronDown size={16} color={C.sub} /> : <ChevronRight size={16} color={C.sub} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.name}</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>
                      Batch: {r.batchQty.toLocaleString("en-IN")} {r.batchUnit} · Serving: {r.servingLabel || "—"} · As of {fmtDateDay(r.asOfDate)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: C.sub }}>Cost / {r.batchUnit}</div>
                    <div style={{ fontWeight: 600 }}>{fmtMoney(d.costPerBatchUnit)}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 100 }}>
                    <div style={{ fontSize: 12, color: C.sub }}>Cost / Serving</div>
                    <div style={{ fontWeight: 700, color: C.teal }}>{fmtMoney(d.costPerServing)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditing(r)} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>Edit</button>
                    <ConfirmDelete onConfirm={() => del(r.id)} />
                  </div>
                </div>
                {open && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px 14px" }}>
                    <Table>
                      <thead><tr><Th>Ingredient</Th><Th>Qty</Th><Th style={{ textAlign: "right" }}>Amount</Th></tr></thead>
                      <tbody>
                        {r.ingredients.map((ing, i) => (
                          <tr key={ing.id ?? i}><Td>{ing.name}</Td><Td>{ing.qtyLabel || "—"}</Td><Td style={{ textAlign: "right" }}>{fmtMoney(ing.amount)}</Td></tr>
                        ))}
                        <tr>
                          <Td style={{ fontWeight: 700 }}>Total</Td><Td>{""}</Td>
                          <Td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(d.totalAmount)}</Td>
                        </tr>
                      </tbody>
                    </Table>
                    {r.remarks && <div style={{ color: C.sub, fontSize: 12.5, marginTop: 8 }}>{r.remarks}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showAdd && <RecipeForm category={category} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onChanged(); }} />}
      {editing && <RecipeForm category={category} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function RecipeForm({ category, initial, onClose, onSaved }: { category: string; initial?: RecipeRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [batchQty, setBatchQty] = useState(initial ? String(initial.batchQty) : "");
  const [batchUnit, setBatchUnit] = useState(initial?.batchUnit ?? "KG");
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? "");
  const [servingConversionFactor, setServingConversionFactor] = useState(initial ? String(initial.servingConversionFactor) : "1");
  const [asOfDate, setAsOfDate] = useState((initial?.asOfDate ?? todayISO()).slice(0, 10));
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(initial?.ingredients ?? [{ name: "", qtyLabel: "", amount: 0 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setIng = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: field === "amount" ? Number(value) : value } : r)));
  };
  const addIng = () => setIngredients((rows) => [...rows, { name: "", qtyLabel: "", amount: 0 }]);
  const removeIng = (i: number) => setIngredients((rows) => rows.filter((_, idx) => idx !== i));

  const preview = computeRecipeRow(ingredients.filter((i) => i.name), Number(batchQty) || 0, Number(servingConversionFactor) || 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = initial ? `/api/costing/recipes/${initial.id}` : "/api/costing/recipes";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category, name, batchQty, batchUnit, servingLabel, servingConversionFactor, asOfDate, remarks,
        ingredients: ingredients.filter((i) => i.name.trim()),
      }),
    });
    if (res.ok) onSaved();
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Could not save"); setSaving(false); }
  };

  return (
    <Modal title={initial ? `Edit ${category} Recipe` : `Add ${category} Recipe`} onClose={onClose} width={640}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Recipe Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="As Of Date"><Input type="date" required value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Batch Qty"><Input type="number" step="0.01" required value={batchQty} onChange={(e) => setBatchQty(e.target.value)} /></Field>
          <Field label="Batch Unit"><Input required value={batchUnit} onChange={(e) => setBatchUnit(e.target.value)} placeholder="KG / Nos" /></Field>
          <Field label="Serving Label"><Input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="70 GM" /></Field>
        </div>
        <Field label="Serving Conversion Factor (× cost per batch unit = cost per serving)">
          <Input type="number" step="0.0001" required value={servingConversionFactor} onChange={(e) => setServingConversionFactor(e.target.value)} />
        </Field>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.04em" }}>Ingredients</span>
            <Btn variant="ghost" onClick={addIng}><Plus size={13} /> Add Row</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 6 }}>
                <Input placeholder="Item name" value={ing.name} onChange={(e) => setIng(i, "name", e.target.value)} />
                <Input placeholder="Qty (e.g. 150 KG)" value={ing.qtyLabel} onChange={(e) => setIng(i, "qtyLabel", e.target.value)} />
                <Input type="number" step="0.01" placeholder="Amount ₹" value={ing.amount || ""} onChange={(e) => setIng(i, "amount", e.target.value)} />
                <Btn variant="ghost" onClick={() => removeIng(i)}>✕</Btn>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.tealSoft, border: `1px solid ${C.teal}55`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
          Total: <strong>{fmtMoney(preview.totalAmount)}</strong> · Cost/{batchUnit || "unit"}: <strong>{fmtMoney(preview.costPerBatchUnit)}</strong> · Cost/Serving: <strong>{fmtMoney(preview.costPerServing)}</strong>
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

// ---------- Page ----------
export default function CostingPage() {
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
  const [category, setCategory] = useState<string>("Farsan");
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    fetch("/api/costing/items").then((r) => { if (r.status === 403) { setForbidden(true); return null; } return r.json(); }).then((d) => d && setItems(d));
    fetch("/api/costing/recipes").then((r) => r.json()).then(setRecipes);
  };
  useEffect(load, []);

  if (forbidden) return <Empty text="Admin access required — this reference is not shared with other logins." />;

  const categories = new Set<string>(COSTING_DEFAULT_CATEGORIES);
  (items ?? []).forEach((i) => categories.add(i.category));
  (recipes ?? []).forEach((r) => categories.add(r.category));

  const itemsForCat = (items ?? []).filter((i) => i.category === category);
  const recipesForCat = (recipes ?? []).filter((r) => r.category === category);
  // Farsan-style items (a single rate) and Sweets-style recipes (a full
  // ingredient list) are different enough to need different views — a
  // category is whichever shape its own data actually is, defaulting to
  // the items view for a brand-new category with nothing in it yet.
  const usesRecipes = recipesForCat.length > 0 && itemsForCat.length === 0;

  return (
    <div>
      <SectionHead
        title="Costing Reference"
        sub="Per-item and per-recipe cost analysis (Farsan, Sweets, ...) — a personal reference, kept up to date as rates change. Admin only."
      />
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {[...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              background: category === cat ? C.teal : "#fff", color: category === cat ? "#fff" : C.ink,
              border: `1px solid ${category === cat ? C.teal : C.border}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      {items === null || recipes === null ? <Empty text="Loading…" /> : usesRecipes ? (
        <RecipesList category={category} rows={recipesForCat} onChanged={load} />
      ) : (
        <ItemsTable category={category} rows={itemsForCat} onChanged={load} />
      )}
    </div>
  );
}
