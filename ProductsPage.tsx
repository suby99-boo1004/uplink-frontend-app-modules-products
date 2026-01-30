import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/products.api";
import { Product } from "../../types/products";
import ProductTable from "./components/ProductTable";
import ProductFormModal from "./components/ProductFormModal";
import { useAuth } from "../../lib/auth";

function sortDescKo(arr: string[]) {
  return arr.sort((a, b) => b.localeCompare(a, "ko"));
}


function getAuthHeader(): Record<string, string> {
  // ✅ 업링크 토큰이 어디에 저장되어 있는지 환경마다 달라서, "JWT처럼 생긴 값"을 찾아서 사용합니다.
  // - 잘못된 토큰(예: refresh token, JSON 전체 문자열)을 넣으면 401이 나므로, JWT 패턴(점 2개)을 만족할 때만 Authorization을 붙입니다.
  const isJwtLike = (v: string) => {
    const t = (v || "").trim().replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "");
    // JWT는 보통 '.'이 2개(3파트)입니다.
    if (!t) return false;
    const parts = t.split(".");
    if (parts.length !== 3) return false;
    // 각 파트가 base64url-ish 인지 대충 검사
    return parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p) && p.length >= 8);
  };

  const normalize = (v: string) => (v || "").trim().replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "");

  try {
    // 1) localStorage 전체 스캔: 키 이름 우선순위(ACCESS > TOKEN > 그 외), refresh는 제외
    const candidates: Array<{ key: string; token: string; score: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      const raw = localStorage.getItem(key) || "";
      const k = key.toLowerCase();

      // refresh 류는 제외(대부분 access token과 같은 형태라도 서버에선 invalid 처리)
      if (k.includes("refresh")) continue;

      // 값이 JWT-like 문자열인 경우
      if (isJwtLike(raw)) {
        const token = normalize(raw);
        let score = 10;
        if (k.includes("access")) score += 30;
        if (k.includes("token")) score += 10;
        if (k.includes("auth")) score += 5;
        candidates.push({ key, token, score });
        continue;
      }

      // 값이 JSON이면 파싱해서 token 후보를 뽑는다
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const obj: any = JSON.parse(raw);
          const possibles = [
            obj?.access_token,
            obj?.token,
            obj?.jwt,
            obj?.data?.access_token,
            obj?.data?.token,
            obj?.session?.access_token,
            obj?.session?.token,
          ].filter((x) => typeof x === "string") as string[];

          for (const pv of possibles) {
            if (!pv) continue;
            if (!isJwtLike(pv)) continue;
            const token = normalize(pv);
            let score = 8;
            if (k.includes("access")) score += 30;
            if (k.includes("token")) score += 10;
            if (k.includes("auth")) score += 5;
            candidates.push({ key, token, score });
          }
        } catch {
          // ignore
        }
      }
    }

    if (candidates.length) {
      candidates.sort((a, b) => b.score - a.score);
      return { Authorization: `Bearer ${candidates[0].token}` };
    }
  } catch {
    // ignore
  }

  // 토큰을 확신할 수 없으면 Authorization을 붙이지 않음(잘못된 토큰으로 401 유발 방지)
  return {};
}



export default function ProductsPage() {
  const { user } = useAuth();

  const roleId: number | null = (user as any)?.role_id ?? null;
  const canManage = roleId === 6 || roleId === 7;

  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [itemOptions, setItemOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const debounceRef = useRef<number | null>(null);

  async function load(search?: string) {
    setLoading(true);
    try {
      const data = await fetchProducts({ q: (search ?? q).trim() });
      setRows(data);

      const items = Array.from(new Set(data.map((r) => (r.item_name || "").trim()).filter(Boolean)));
      const cats = Array.from(new Set(data.map((r) => (r.category_name || "").trim()).filter(Boolean)));
      setItemOptions(sortDescKo(items));
      setCategoryOptions(sortDescKo(cats));
    } finally {
      setLoading(false);
    }
  }

  // ✅ 초기 로드
  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 검색(q) 변경 시 서버 검색 재호출 (디바운스)
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      load(q);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onUpload(file: File) {
    // ✅ 제품 업로드: products.api 래퍼 대신 직접 업로드(폼데이터)로 안정화
    const fd = new FormData();
    fd.append("file", file);

    let data: any = null;
    try {
      const resp = await fetch(`/api/products/upload`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { ...getAuthHeader() },
      });

      // 서버가 JSON을 반환 (ok/imported/errors)
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) data = await resp.json();
      else data = { ok: resp.ok };

      if (!resp.ok || !data?.ok) {
        const msg =
          (data?.detail ? String(data.detail) : "") ||
          (Array.isArray(data?.errors) ? data.errors.join("\\n") : "") ||
          `HTTP ${resp.status}`;
        alert("업로드 실패\n" + msg);
        return;
      }

      alert(`업로드 완료: ${data?.imported ?? 0}건`);
      // ✅ 업로드 후 즉시 재조회(검색어 유지)
      await load((q ?? "").trim());
    } catch (e: any) {
      alert("업로드 실패\n" + (e?.message || String(e)));
    }
  }


  async function onDownload() {
    try {
      const resp = await fetch(`/api/products/download`, {
        method: "GET",
        credentials: "include",
        headers: { ...getAuthHeader() },
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        alert("다운로드 실패\n" + (txt || `HTTP ${resp.status}`));
        return;
      }

      const blob = await resp.blob();
      // 파일명 추출(Content-Disposition)
      const cd = resp.headers.get("content-disposition") || "";
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\"]+)\"?/i);
      const filenameRaw = decodeURIComponent((match?.[1] || match?.[2] || "").trim());
      const filename = filenameRaw || `products.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("다운로드 실패\n" + (e?.message || String(e)));
    }
  }

  async function onSave(payload: Partial<Product>) {
    if (editing) {
      await updateProduct(editing.id, payload);
    } else {
      await createProduct(payload);
    }
    setModalOpen(false);
    setEditing(null);
    await load(q);
  }

  async function onDelete(row: Product) {
    if (!confirm(`삭제할까요?\n${row.name}`)) return;
    await deleteProduct(row.id);
    await load(q);
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>제품(자재관리)</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제품 검색(항목/구분/모델명/규격/비고)"
            style={{ padding: "6px 10px", minWidth: 320 }}
          />

          {canManage && (
            <>
              <button onClick={() => { setEditing(null); setModalOpen(true); }}>
                등록
              </button>
              <label style={{ border: "1px solid #ccc", padding: "6px 10px", cursor: "pointer" }}>
                업로드
                <input
                  type="file"
                  accept=".xlsx"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button onClick={onDownload}>다운로드</button>
            </>
          )}
        </div>
      </div>

      {/* ✅ 서버에서 이미 항목/구분/규격/비고까지 검색 필터링된 rows를 그대로 표시 */}
      <ProductTable
        rows={rows}
        loading={loading}
        roleId={roleId}
        onEdit={(r) => { setEditing(r); setModalOpen(true); }}
        onDelete={onDelete}
      />

      {canManage && (
        <ProductFormModal
          open={modalOpen}
          title={editing ? "제품 수정" : "제품 등록"}
          initial={editing}
          itemOptions={itemOptions}
          categoryOptions={categoryOptions}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}