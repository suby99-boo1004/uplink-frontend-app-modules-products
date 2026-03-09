import React, { useEffect, useMemo, useRef, useState } from "react";
import ProductTable from "./components/ProductTable";
import ProductFormModal from "./components/ProductFormModal";
import { sortProducts } from "../../utils/productSort";
import type { Product } from "../../types/products";

/**
 * ProductsPage.tsx
 * - 기능: 자동검색(디바운스), 등록/수정/삭제, 업로드/다운로드
 * - 정렬: productSort.ts (숫자→영어→한글 / 항목→구분→모델명→규격)
 * - 인증: credentials: "include" 유지 + local/sessionStorage 전체 스캔으로 JWT 토큰 자동 탐색
 *
 * ✅ 이번 수정(대표님 요구):
 * - 관리자(6), 운영자(7)만: 신규등록/업로드/다운로드 + 테이블의 수정/삭제(테이블은 roleId로 이미 제어)
 * - 그 외 UI/기능은 고정 (문법/구조 깨짐만 복구)
 */

/** JWT처럼 보이는 토큰(aaa.bbb.ccc)만 골라냄 */
function findJwtLikeToken(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const s = val.trim().replace(/^Bearer\s+/i, "");
    if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(s)) return s;
    return null;
  }
  if (typeof val === "object") {
    const keys = ["access_token", "accessToken", "token", "jwt", "id_token", "idToken"];
    for (const k of keys) {
      const t = findJwtLikeToken((val as any)[k]);
      if (t) return t;
    }
  }
  return null;
}

function scanStorageForToken(storage: Storage): string | null {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;

      // 1) raw가 토큰일 때
      const direct = findJwtLikeToken(raw);
      if (direct) return direct;

      // 2) JSON 문자열일 때
      if (raw.startsWith("{") || raw.startsWith("[")) {
        try {
          const obj = JSON.parse(raw);
          const t = findJwtLikeToken(obj);
          if (t) return t;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getAuthHeaders(): Record<string, string> {
  const token = scanStorageForToken(localStorage) || scanStorageForToken(sessionStorage);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    } as any,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${msg}`);
  }
  return (await res.json()) as T;
}

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState<number>(0);

  const debounceRef = useRef<number | null>(null);

  // 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("제품 등록");
  const [editing, setEditing] = useState<Product | null>(null);

  // ✅ 관리 버튼 노출: 관리자(6), 운영자(7)만
  const canManage = roleId === 6 || roleId === 7;

  // ✅ 정렬(표시만)
  const sortedRows = useMemo(() => sortProducts(rows), [rows]);

  // 콤보 옵션
  const itemOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.item_name && s.add(r.item_name));
    return Array.from(s).sort();
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.category_name && s.add(r.category_name));
    return Array.from(s).sort();
  }, [rows]);

  const loadProducts = async (query: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set("q", query.trim());
      const data = await fetchJson<Product[]>(`/api/products?${qs.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 권한: 관리자(6), 운영자(7)만 관리 버튼 노출
  const loadRoleId = async () => {
    const endpoints = ["/api/auth/me", "/api/users/me", "/api/me"];
    for (const ep of endpoints) {
      try {
        const me: any = await fetchJson<any>(ep, { method: "GET" });
        const rid =
          me?.role_id ??
          me?.roleId ??
          me?.role?.id ??
          me?.user?.role_id ??
          me?.user?.roleId ??
          me?.user?.role?.id ??
          null;
        if (rid !== null && rid !== undefined && !Number.isNaN(Number(rid))) {
          setRoleId(Number(rid));
          return;
        }
      } catch {
        // 다음 엔드포인트 시도
      }
    }
    setRoleId(0);
  };

  useEffect(() => {
    loadProducts("");
    loadRoleId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 자동 검색(디바운스)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      loadProducts(q);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const onOpenCreate = () => {
    setEditing(null);
    setModalTitle("제품 등록");
    setModalOpen(true);
  };

  const onOpenEdit = (row: Product) => {
    setEditing(row);
    setModalTitle("제품 수정");
    setModalOpen(true);
  };

  const onDelete = async (row: Product) => {
    const ok = window.confirm(`삭제(비활성화) 하시겠습니까?\n- ${row.name}`);
    if (!ok) return;
    try {
      await fetchJson(`/api/products/${row.id}`, { method: "DELETE" });
      await loadProducts(q);
    } catch (err: any) {
      alert(err?.message || "삭제 실패");
    }
  };

  const onSave = async (payload: Partial<Product>) => {
    try {
      if (editing?.id) {
        await fetchJson(`/api/products/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson(`/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await loadProducts(q);
    } catch (err: any) {
      alert(err?.message || "저장 실패");
    }
  };

  // 업로드/다운로드
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onUploadClick = () => fileRef.current?.click();

  const onUploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/products/upload", {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: { ...getAuthHeaders() },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${msg}`);
    }

    const data: any = await res.json().catch(() => ({}));
    const imported = data?.imported ?? (data?.inserted ?? 0) + (data?.updated ?? 0);
    alert(`업로드 완료: ${imported}건 (신규 ${data?.inserted ?? 0}, 수정 ${data?.updated ?? 0})`);
    await loadProducts(q);
  };

  const onDownload = async () => {
    try {
      const res = await fetch("/api/products/download", {
        method: "GET",
        credentials: "include",
        headers: { ...getAuthHeaders() },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${msg}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disp = res.headers.get("content-disposition") || "";
      const m = disp.match(/filename\*?=([^;]+)/i);
      let filename = "products.xlsx";
      if (m?.[1]) filename = m[1].trim().replace(/^UTF-8''/i, "").replace(/\"/g, "").replace(/"/g, "");

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "다운로드 실패");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>제품(자재관리)</h2>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {/* 왼쪽: 검색 + 신규등록 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색 (항목/구분/모델명/규격/비고)"
            style={{
              width: 350,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
            }}
          />
          {canManage && (
            <button
              onClick={onOpenCreate}
              style={{
                padding: "10px 12px",
				fontWeight: 900,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)",
                color: "#fff",
                
              }}
            >
              +신규 등록
            </button>
          )}
        </div>

        {/* 오른쪽: 업로드/다운로드 */}
        {canManage && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={onUploadClick}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              파일 업로드
            </button>

            <button
              onClick={onDownload}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              다운로드
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await onUploadFile(f);
                } catch (err: any) {
                  alert(err?.message || "업로드 실패");
                } finally {
                  e.currentTarget.value = "";
                }
              }}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <ProductTable rows={sortedRows} loading={loading} roleId={roleId} onEdit={onOpenEdit} onDelete={onDelete} />
      </div>

      <ProductFormModal
        open={modalOpen}
        title={modalTitle}
        initial={editing}
        itemOptions={itemOptions}
        categoryOptions={categoryOptions}
        onClose={() => setModalOpen(false)}
        onSave={onSave}
      />
    </div>
  );
}
