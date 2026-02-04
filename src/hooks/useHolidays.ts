import { useEffect, useMemo, useState } from "react";
import { parseYM } from "../utils/date";

// ✅ 로컬 JSON(공휴일/대체공휴일) 우선 사용
import holidays2025 from "../data/holidays-2025.json";
import holidays2026 from "../data/holidays-2026.json";
import holidays2027 from "../data/holidays-2027.json";

type RawLocalHoliday = { date: string; name: string; substitute: boolean };

export type Holiday = {
  date: string;          // YYYY-MM-DD
  localName: string;     // 표시명 (여러 개면 ' / '로 합침)
  substitute: boolean;   // 대체공휴일 여부
};

function getLocalList(year: number): RawLocalHoliday[] | null {
  if (year === 2025) return holidays2025 as any;
  if (year === 2026) return holidays2026 as any;
  if (year === 2027) return holidays2027 as any;
  return null;
}

async function fetchHolidaysNager(year: number, countryCode: string): Promise<Array<{ date: string; localName: string; name: string }>> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Holiday API error: ${res.status}`);
  const data = (await res.json()) as Array<any>;
  return data.map((h) => ({
    date: h.date as string,
    localName: h.localName as string,
    name: h.name as string,
  }));
}

function mergeByDate(list: Array<{ date: string; name: string; substitute?: boolean }>): Record<string, Holiday> {
  const m: Record<string, { names: string[]; substitute: boolean }> = {};
  list.forEach((h) => {
    if (!h.date) return;
    if (!m[h.date]) m[h.date] = { names: [], substitute: false };
    if (h.name && !m[h.date].names.includes(h.name)) m[h.date].names.push(h.name);
    if (h.substitute) m[h.date].substitute = true;
    if (h.name?.includes("대체")) m[h.date].substitute = true;
  });

  const out: Record<string, Holiday> = {};
  Object.entries(m).forEach(([date, v]) => {
    out[date] = {
      date,
      localName: v.names.join(" / "),
      substitute: v.substitute,
    };
  });
  return out;
}

/**
 * ✅ 공휴일/대체공휴일 반영
 * - 2025~2027: 업로드한 로컬 JSON 우선 사용
 * - 그 외 연도: Nager.Date API fallback
 */
export function useHolidays(ym: string, countryCode = "KR") {
  const { y } = useMemo(() => parseYM(ym), [ym]);
  const [map, setMap] = useState<Record<string, Holiday>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const local = getLocalList(y);
    if (local) {
      const merged = mergeByDate(local.map((h) => ({ date: h.date, name: h.name, substitute: h.substitute })));
      if (mounted) setMap(merged);
      if (mounted) setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // fallback: API (연도 JSON 없을 때)
    fetchHolidaysNager(y, countryCode)
      .then((list) => {
        if (!mounted) return;
        const merged = mergeByDate(list.map((h) => ({ date: h.date, name: h.localName || h.name })));
        setMap(merged);
      })
      .catch(() => {
        if (mounted) setMap({});
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [y, countryCode]);

  return { holidays: map, loading };
}
