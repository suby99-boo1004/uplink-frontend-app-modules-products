import React from "react";
import { Product } from "../../../types/products";

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
  const isLimitedView = roleId === 9 || roleId === 10; // 외부직원/게스트
  const canManage = roleId === 6 || roleId === 7; // 관리자/운영자

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#111827", color: "#F9FAFB" }}>
            <th style={{ padding: "8px 10px" }}>항목</th>
            <th style={{ padding: "8px 10px" }}>구분</th>
            <th style={{ padding: "8px 10px" }}>제품명</th>
            <th style={{ padding: "8px 10px" }}>규격</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>설계가</th>
            <th style={{ padding: "8px 10px", textAlign: "right" }}>소보수가</th>

            {/* 외부직원/게스트는 여기까지만 */}
            {!isLimitedView && (
              <>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>납품가</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>재고</th>
                <th style={{ padding: "8px 10px" }}>비고</th>
              </>
            )}

            {/* 작업(수정/삭제)은 관리자/운영자만 */}
            {canManage && <th style={{ padding: "8px 10px", width: 120 }}>작업</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6 + (isLimitedView ? 0 : 3) + (canManage ? 1 : 0)} style={{ padding: 12 }}>
                로딩중...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6 + (isLimitedView ? 0 : 3) + (canManage ? 1 : 0)} style={{ padding: 12 }}>
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "8px 10px" }}>{r.item_name || ""}</td>
                <td style={{ padding: "8px 10px" }}>{r.category_name || ""}</td>
                <td style={{ padding: "8px 10px" }}>{r.name || ""}</td>
                <td style={{ padding: "8px 10px" }}>{r.spec || ""}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{(r.price_design || 0).toLocaleString()}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{(r.price_small || 0).toLocaleString()}</td>

                {!isLimitedView && (
                  <>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{(r.price_delivery || 0).toLocaleString()}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{r.stock_qty ?? 0}</td>
                    <td style={{ padding: "8px 10px" }}>{r.memo || ""}</td>
                  </>
                )}

                {canManage && (
                  <td style={{ padding: "8px 10px" }}>
                    <button onClick={() => onEdit(r)} style={{ marginRight: 6, fontSize: 12 }}>
                      수정
                    </button>
                    <button onClick={() => onDelete(r)} style={{ fontSize: 12 }}>
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
