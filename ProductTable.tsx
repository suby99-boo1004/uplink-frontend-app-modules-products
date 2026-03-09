import React from "react";
import type { Product } from "../../../types/products";

export default function ProductTable({
  rows,
  loading,
  roleId,
  onEdit,
  onDelete,
}: {
  rows: Product[];
  loading: boolean;
  roleId: number | null;
  onEdit: (row: Product) => void;
  onDelete: (row: Product) => void;
}) {
  const isExternal = roleId === 9;
  const canManage = roleId === 6 || roleId === 7;
  const colSpan = isExternal ? 6 : 10;

  return (
    <div style={wrap}>
      <table style={table}>
        <colgroup>
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          {!isExternal && (
            <>
              <col style={{ width: "7%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </>
          )}
        </colgroup>

        <thead>
          <tr>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa" }}>항목</th>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa" }}>구분</th>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa" }}>제품명</th>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa" }}>규격</th>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa", textAlign: "center" }}>설계가</th>
            <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa", textAlign: "center" }}>소보수가</th>
            {!isExternal && (
              <>
                <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa", textAlign: "center" }}>납품가</th>
                <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa", textAlign: "center" }}>재고</th>
                <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa" }}>비고</th>
                <th style={{ ...thLeft, color: "#000000" , backgroundColor: "#8ec7fa", textAlign: "center" }}>작업</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td style={tdMuted} colSpan={colSpan}>
                로딩중...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td style={tdMuted} colSpan={colSpan}>
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={r.id} style={idx % 2 === 0 ? trEven : trOdd}>
                {/* ✅ UI만 수정: 항목/구분/제품명 파란색 라인 강조 */}
                <td style={{ ...tdWrapLeft }}>{r.item_name || ""}</td>
                <td style={{ ...tdWrapLeft }}>{r.category_name || ""}</td>
                <td style={{ ...tdWrapLeft }}>{r.name || ""}</td>

                <td style={tdWrapLeft}>{r.spec || ""}</td>
                <td style={{ ...tdRight, ...pillDesign }}>{(r.price_design || 0).toLocaleString()}</td>
                <td style={{ ...tdRight, ...pillSmall }}>{(r.price_small || 0).toLocaleString()}</td>

                {!isExternal && (
                  <>
                    <td style={{ ...tdRight, ...pillDelivery }}>{(r.price_delivery || 0).toLocaleString()}</td>
                    <td style={tdRight}>
                      {(r as any).stock_qty ?? 0}
                    </td>
                    <td style={tdWrapLeft}>{(r as any).memo || ""}</td>
                    <td style={tdCenter}>
                      {canManage ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button style={btnGhost} onClick={() => onEdit(r)}>수정</button>
                          <button style={btnDanger} onClick={() => onDelete(r)}>삭제</button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ========================= UI ONLY ========================= */

const wrap: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  background: "rgba(0,0,0,0.18)",
};

const table: React.CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 13,
};

const thBase: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  fontWeight: 800,
};

const thLeft = { ...thBase, textAlign: "left" };
const thRight = { ...thBase, textAlign: "right" };
const thCenter = { ...thBase, textAlign: "center" };

const tdBase: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top",
};

const tdWrapLeft = { ...tdBase, textAlign: "left", whiteSpace: "normal", wordBreak: "break-word" };
const tdRight = { ...tdBase, textAlign: "right", whiteSpace: "normal" };
const tdCenter = { ...tdBase, textAlign: "center" };
const tdMuted = { ...tdBase, textAlign: "center", opacity: 0.7 };

const trEven = { background: "rgba(255,255,255,0.02)" };
const trOdd = { background: "rgba(255,255,255,0.06)" };

/* 🔵 파란색 강조 */
const blueLine: React.CSSProperties = {
  background: "rgba(59,130,246,0.15)",
  borderLeft: "3px solid rgba(59,130,246,0.8)",
};

/* 가격 색 유지 */
const pillDesign = {  color: "#1774f6", fontWeight: 700 };
const pillSmall = { color: "#17f61b", fontWeight: 700 };
const pillDelivery = {  color: "#f61717", fontWeight: 700 };

const btnBase = {
  padding: "5px 8px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
};

const btnGhost = { ...btnBase };
const btnDanger = { ...btnBase, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" };
