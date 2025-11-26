import React, { useEffect, useMemo, useState } from "react";
import { loadInzetrollen } from "../data/inzetrollen";

export default function InzetrollenPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [inzetrollen, setInzetrollen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    loadInzetrollen()
      .then((data) => {
        if (mounted) setInzetrollen(data);
      })
      .catch((e) => {
        if (mounted) setError(e?.message ?? "Laden mislukt");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inzetrollen.filter((item: any) => {
      // text search over a few key fields
      const matchesSearch = q.length === 0 || [
        item.afkorting,
        item.gms_omschrijving,
        item.benaming_voluit,
      ]
        .map((v: any) => (v ? String(v).toLowerCase() : ""))
        .some((v: string) => v.includes(q));

      const matchesCategorie = !categorieFilter || (item.primair_of_alternatief ? String(item.primair_of_alternatief).toLowerCase().includes(categorieFilter) : false);

      // typeFilter not mapped yet (source has no clear type); ignore for now
      const matchesType = !typeFilter || true;

      return matchesSearch && matchesCategorie && matchesType;
    });
  }, [inzetrollen, categorieFilter, typeFilter, searchQuery]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="gms-eenheden-container">
      {/* Header */}
      <div className="gms-eenheden-header">
        <div className="gms-eenheden-title">
          <h2>GMS Inzetrollen</h2>
          <div className="gms-eenheden-time">{formatTime(currentTime)}</div>
        </div>

        {/* Filters */}
        <div className="gms-filter-controls" style={{ gap: 8 }}>
          <input
            type="text"
            placeholder="Zoek op code, omschrijving of type"
            value={searchQuery}
            onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
            className="gms-location-input"
          />

          <select
            value={categorieFilter}
            onChange={(e) => { setPage(1); setCategorieFilter(e.target.value); }}
            className="gms-status-filter"
          >
            <option value="">Alle categorieën</option>
            <option value="primair">Primair</option>
            <option value="alternatief">Alternatief</option>
            <option value="ondersteunend">Ondersteunend</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}
            className="gms-status-filter"
          >
            <option value="">Alle typen</option>
            <option value="brandbestrijding">Brandbestrijding</option>
            <option value="hulpverlening">Hulpverlening</option>
            <option value="specialistisch">Specialistisch</option>
            <option value="leiding">Leiding/Coördinatie</option>
            <option value="logistiek">Logistiek</option>
            <option value="ondersteunend">Ondersteunend</option>
          </select>

          <button
            onClick={() => { setSearchQuery(""); setCategorieFilter(""); setTypeFilter(""); setPage(1); }}
            className="gms-dienst-button"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="gms-eenheden-scroll-container">
        <div className="gms-eenheden-table-container">
          <table className="gms-eenheden-table">
            <thead>
              <tr className="gms-eenheden-header-row">
                <th>Soort</th>
                <th>Afkorting</th>
                <th>GMS omschrijving</th>
                <th>Typenr LRNP</th>
                <th>Materieel/Functievoertuig</th>
                <th>Benaming voluit</th>
                <th>Criteria/Eisen</th>
                <th>Primair of alternatief</th>
                <th>Alternatieven</th>
                <th>Opmerkingen</th>
                <th>Datum aanvraag</th>
                <th>Datum akkoord</th>
                <th>Status</th>
                <th>Sortering</th>
                <th>Vorige sortering</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} className="gms-eenheden-data-row">Bezig met laden…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={15} className="gms-eenheden-data-row">Laden mislukt: {error}</td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={15} className="gms-eenheden-data-row">
                    Geen resultaten.
                  </td>
                </tr>
              ) : (
                pageItems.map((item: any, index: number) => (
                  <tr
                    key={index}
                    className="gms-eenheden-data-row"
                    onClick={() => setSelectedCode(item.afkorting ?? null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{item.soort ?? '-'}</td>
                    <td className="gms-eenheden-roepnummer"><strong>{item.afkorting ?? '-'}</strong></td>
                    <td>{item.gms_omschrijving ?? '-'}</td>
                    <td>{item.typenr_lrnp ?? '-'}</td>
                    <td>{item.materieel_functievoertuig ?? '-'}</td>
                    <td>{item.benaming_voluit ?? '-'}</td>
                    <td>{item.criteria_eisen ?? '-'}</td>
                    <td>{item.primair_of_alternatief ?? '-'}</td>
                    <td>{Array.isArray(item.alternatieven) ? item.alternatieven.slice(0, 6).join(', ') : '-'}</td>
                    <td>{item.opmerkingen ?? '-'}</td>
                    <td>{item.datum_aanvraag ?? '-'}</td>
                    <td>{item.datum_akkoord ?? '-'}</td>
                    <td>{item.status ?? '-'}</td>
                    <td>{item.sortering ?? '-'}</td>
                    <td>{item.vorige_sortering ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="gms-eenheden-footer">
        <div className="gms-eenheden-summary">
          <span>Pagina {page} van {totalPages}{total > 0 ? ` (${total} items)` : ''}</span>
        </div>
        <div className="gms-eenheden-summary" style={{ gap: 12 }}>
          <button
            className="gms-dienst-button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Vorige
          </button>
          <button
            className="gms-dienst-button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Volgende
          </button>
        </div>
      </div>
    </div>
  );
}


