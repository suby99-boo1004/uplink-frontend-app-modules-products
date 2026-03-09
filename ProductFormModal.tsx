import React, { useEffect, useState } from "react";
import { Product } from "../../../types/products";

function calcSmall(design: number) {
  return Math.round((design || 0) * 0.85);
}
function calcDelivery(small: number) {
  return Math.round((small || 0) * 0.82);
}

type SelectOrInputProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
};

function SelectOrInput({ label, options, value, onChange }: SelectOrInputProps) {
  const [mode, setMode] = useState<"select" | "input">("select");
  const [selectValue, setSelectValue] = useState("");

  useEffect(() => {
    const exists = options.includes(value);
    setMode(exists ? "select" : "input");
    setSelectValue(exists ? value : "");
  }, [value, options]);

  return (
    <>
      <div style={{ fontSize: 12, color: "#E5E7EB" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {mode === "select" ? (
          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              setSelectValue(v);
              onChange(v);
            }}
            style={{
              flex: 1,
              padding: "8px 10px",
              fontSize: 12,
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          >
            <option value="">선택</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="수기 입력"
            style={{
              flex: 1,
              padding: "8px 10px",
              fontSize: 12,
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />
        )}

        <button
          type="button"
          onClick={() => {
            if (mode === "select") {
              setMode("input");
              onChange(value || "");
            } else {
              setMode("select");
              setSelectValue("");
              onChange("");
            }
          }}
          style={{
            fontSize: 12,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#0B1220",
            color: "#E5E7EB",
            cursor: "pointer",
          }}
        >
          {mode === "select" ? "수기" : "선택"}
        </button>
      </div>
    </>
  );
}

export default function ProductFormModal({
  open,
  title,
  initial,
  itemOptions,
  categoryOptions,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: Product | null;
  itemOptions: string[];
  categoryOptions: string[];
  onClose: () => void;
  onSave: (payload: Partial<Product>) => Promise<void>;
}) {
  const [itemName, setItemName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [priceDesign, setPriceDesign] = useState(0);
  const [priceSmall, setPriceSmall] = useState<number | null>(null);
  const [priceDelivery, setPriceDelivery] = useState<number | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItemName(initial?.item_name || "");
    setCategoryName(initial?.category_name || "");
    setName(initial?.name || "");
    setSpec(initial?.spec || "");
    setPriceDesign(initial?.price_design || 0);
    setPriceSmall(initial ? initial.price_small : null);
    setPriceDelivery(initial ? initial.price_delivery : null);
    setStockQty(initial?.stock_qty || 0);
    setMemo(initial?.memo || "");
  }, [open, initial]);

  const autoSmall = calcSmall(priceDesign);
  const autoDelivery = calcDelivery(priceSmall ?? autoSmall);

  if (!open) return null;

  async function submit() {
    if (!name.trim()) {
      alert("제품명(모델명)은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      // '자동' 선택(=null)인 경우, 계산값을 실제 저장값으로 전송한다.
      // - 소보수가: 설계가의 85%
      // - 납품가: (소보수가 or 자동 소보수가)의 82%
      const finalSmall = priceSmall === null ? autoSmall : priceSmall;
      const finalDelivery = priceDelivery === null ? autoDelivery : priceDelivery;

      await onSave({
        item_name: itemName.trim(),
        category_name: categoryName.trim(),
        name: name.trim(),
        spec: spec.trim(),
        price_design: priceDesign,
        // 자동이면 undefined로 보내지 말고 계산값을 넣어서 0으로 떨어지는 현상을 방지
        price_small: finalSmall,
        price_delivery: finalDelivery,
        stock_qty: stockQty,
        memo: memo.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 620,
          maxWidth: "100%",
          background: "linear-gradient(180deg, #0B1220 0%, #050814 100%)",
          borderRadius: 14,
          padding: 16,
          color: "#F9FAFB",
          border: "1px solid #334155",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 0.2 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #374151",
              background: "#0B1220",
              color: "#E5E7EB",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 1fr",
            gap: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #1F2937",
            background: "rgba(17,24,39,0.55)",
          }}
        >
          <SelectOrInput label="항목" options={itemOptions} value={itemName} onChange={setItemName} />
          <SelectOrInput label="구분" options={categoryOptions} value={categoryName} onChange={setCategoryName} />

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>모델명</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              fontSize: 12,
              padding: "8px 10px",
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>규격</div>
          <input
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            style={{
              fontSize: 12,
              padding: "8px 10px",
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>설계가</div>
          <input
            type="number"
            value={priceDesign}
            onChange={(e) => setPriceDesign(Number(e.target.value || 0))}
            style={{
              fontSize: 12,
              padding: "8px 10px",
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>소보수가</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              value={priceSmall ?? ""}
              placeholder={`자동: ${autoSmall.toLocaleString()}`}
              onChange={(e) => {
                const v = e.target.value;
                setPriceSmall(v === "" ? null : Number(v));
              }}
              style={{
                flex: 1,
                fontSize: 12,
                padding: "8px 10px",
                background: "#111827",
                color: "#F9FAFB",
                border: "1px solid #374151",
                borderRadius: 8,
              }}
            />
            <button
              onClick={() => setPriceSmall(null)}
              style={{
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#0B1220",
                color: "#E5E7EB",
                cursor: "pointer",
              }}
            >
              자동
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>납품가</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number"
              value={priceDelivery ?? ""}
              placeholder={`자동: ${autoDelivery.toLocaleString()}`}
              onChange={(e) => {
                const v = e.target.value;
                setPriceDelivery(v === "" ? null : Number(v));
              }}
              style={{
                flex: 1,
                fontSize: 12,
                padding: "8px 10px",
                background: "#111827",
                color: "#F9FAFB",
                border: "1px solid #374151",
                borderRadius: 8,
              }}
            />
            <button
              onClick={() => setPriceDelivery(null)}
              style={{
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#0B1220",
                color: "#E5E7EB",
                cursor: "pointer",
              }}
            >
              자동
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>사무실 재고</div>
          <input
            type="number"
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value || 0))}
            style={{
              fontSize: 12,
              padding: "8px 10px",
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />

          <div style={{ fontSize: 12, color: "#E5E7EB" }}>비고</div>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{
              fontSize: 12,
              padding: "8px 10px",
              background: "#111827",
              color: "#F9FAFB",
              border: "1px solid #374151",
              borderRadius: 8,
            }}
          />
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #374151",
              background: "#0B1220",
              color: "#E5E7EB",
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #1D4ED8",
              background: "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)",
              color: "#F9FAFB",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {saving ? "저장중..." : "저장"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: "#93C5FD" }}>
          ※ 등록/수정 다이얼로그는 가독성을 위해 다크 배경 + 밝은 글씨로 고정되었습니다.
        </div>
      </div>
    </div>
  );
}
