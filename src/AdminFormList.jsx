import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "./apiBase";

// ── Constants ──────────────────────────────────────────────────────────────
const PER_PAGE = 10;
const SORT_OPTIONS = [
  { value: "created_desc", label: "Recently Created" },
  { value: "created_asc", label: "Oldest First" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "owner_asc", label: "Owner A–Z" },
  { value: "responses_desc", label: "Most Responses" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
// Formats a date string into something readable like "May 25, 2026"
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── ThreeDotMenu ───────────────────────────────────────────────────────────
// A self-contained dropdown menu component for each table row.
// We keep it separate because it manages its own open/closed state
// and needs to close when the user clicks outside of it.
function ThreeDotMenu({ form, onView, onEdit, onViewResponses, onDelete }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // When the menu opens, we calculate exactly where the button is
  // on the screen right now. We use this to position the dropdown
  // so it appears directly below the button.
  //
  // getBoundingClientRect() returns the button's position relative
  // to the viewport — top, bottom, left, right, width, height.
  // These are real pixel values regardless of scroll position or
  // any parent's CSS transforms.
  function handleButtonClick() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      // We want the dropdown's top-left corner to sit at the
      // bottom-right of the button. So:
      // top  = where the button's bottom edge is
      // left = where the button's right edge is, then shift left
      //        by a fixed width so it doesn't fly off screen
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX,
      });
    }
    setOpen((prev) => !prev);
  }

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e) {
      // We check both refs — the button and the menu itself.
      // Without checking the button, clicking the button to close
      // would immediately re-open it (the outside click fires
      // before the button's onClick).
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Close if the user scrolls — the dropdown would otherwise
  // stay in its calculated position while the page moves
  useEffect(() => {
    if (!open) return;
    function handleScroll() {
      setOpen(false);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  // The dropdown itself. We render this via createPortal, which
  // places the HTML directly inside document.body — completely
  // outside the table, outside the stacking context that was
  // trapping it. But React still treats it as a child of this
  // component for event handling and state purposes.
  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          className="afl-dropdown"
          style={{
            // position: fixed means coordinates are relative to the
            // viewport, not any parent element. This is what lets us
            // use getBoundingClientRect() values directly.
            position: "fixed",
            top: menuPosition.top - window.scrollY,
            // We shift left by the dropdown's width (150px min-width)
            // so the right edge of the dropdown aligns with the
            // right edge of the button, rather than overflowing right.
            left: menuPosition.left - 150,
            // z-index here competes at the document root level,
            // not inside any stacking context — so 9999 truly wins.
            zIndex: 9999,
          }}
        >
          <button
            className="afl-dropdown-item"
            onClick={() => {
              onView(form.id);
              setOpen(false);
            }}
          >
            View
          </button>
          <button
            className="afl-dropdown-item"
            onClick={() => {
              onEdit(form.id);
              setOpen(false);
            }}
          >
            Edit
          </button>
          <button
            className="afl-dropdown-item"
            onClick={() => {
              onViewResponses(form.id);
              setOpen(false);
            }}
          >
            Responses
          </button>
          <div className="afl-dropdown-divider" />
          <button
            className="afl-dropdown-item afl-dropdown-item--danger"
            onClick={() => {
              onDelete(form);
              setOpen(false);
            }}
          >
            Delete
          </button>
        </div>,
        document.body, // ← render into body, outside all stacking contexts
      )
    : null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        className="afl-dot-btn"
        onClick={handleButtonClick}
        aria-label="Form actions"
      >
        ⋮
      </button>

      {/* The portal renders outside this div, directly in body */}
      {dropdown}
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────
// A single summary card shown above the table.
function MetricCard({ label, value }) {
  return (
    <div className="afl-metric-card">
      <span className="afl-metric-value">
        {value == null ? "…" : value.toLocaleString()}
      </span>
      <span className="afl-metric-label">{label}</span>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
// Renders page number buttons and prev/next controls.
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build an array of page numbers to show.
  // We always show the first page, last page, current page,
  // and one page either side of current. Everything else becomes '…'
  function getPageNumbers() {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }

  return (
    <div className="afl-pagination">
      <button
        className="afl-page-btn"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Prev
      </button>

      {getPageNumbers().map((p, idx) =>
        p === "…" ? (
          <span key={`ellipsis-${idx}`} className="afl-page-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`afl-page-btn ${p === page ? "afl-page-btn--active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        className="afl-page-btn"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}

// ── AdminFormList ──────────────────────────────────────────────────────────
// Main component. Handles data fetching, filtering, and rendering.
function AdminFormList({
  onViewForm,
  onEditForm,
  onViewResponses,
  showToast,
  showConfirm,
}) {
  // ── State ────────────────────────────────────────────────────────────────
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: PER_PAGE,
    total_pages: 1,
  });
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [ownerId, setOwnerId] = useState(0);
  const [sortBy, setSortBy] = useState("created_desc");
  const [page, setPage] = useState(1);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // We store a debounced version of the search string separately.
  // This means the API call only fires after the user stops typing
  // for 400ms, rather than on every single keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // ── Fetch forms ──────────────────────────────────────────────────────────
  // useCallback wraps the function so it only gets recreated when its
  // dependencies change. This prevents unnecessary re-renders.
  const fetchForms = useCallback(async () => {
    setIsRefreshing(true); // 👈 soft loading (NOT hard loading)
    setError(null);

    try {
      const params = new URLSearchParams({
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
      });

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId > 0) params.set("category_id", categoryId);
      if (ownerId > 0) params.set("owner_id", ownerId);

      const res = await fetch(apiUrl(`/get_all_forms.php?${params}`), {
        credentials: "include",
      });

      const result = await res.json();

      if (result.success) {
        setForms(result.forms);
        setPagination(result.pagination);
        setMetrics(result.metrics);
      } else {
        setError(result.error || "Failed to load forms");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [page, sortBy, debouncedSearch, categoryId, ownerId]);

  // Run fetchForms whenever its dependencies change
  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // ── Fetch supporting data ────────────────────────────────────────────────
  // Categories and users only need to be fetched once for the filter dropdowns.
  useEffect(() => {
    async function fetchSupporting() {
      try {
        const [catRes, userRes] = await Promise.all([
          fetch(apiUrl("/get_categories.php"), { credentials: "include" }),
          fetch(apiUrl("/get_users.php"), { credentials: "include" }),
        ]);
        const catData = await catRes.json();
        const userData = await userRes.json();
        if (catData.success) setCategories(catData.categories);
        if (userData.success) setUsers(userData.users);
      } catch (err) {
        console.error("Failed to fetch supporting data", err);
      }
    }
    fetchSupporting();
  }, []);

  // ── Delete form ──────────────────────────────────────────────────────────
  function handleDelete(form) {
    showConfirm(
      `Delete "${form.title}" permanently? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(apiUrl("/delete_form.php"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ form_id: form.id, admin_override: 1 }),
            credentials: "include",
          });
          const result = await res.json();
          if (result.success) {
            showToast("Form deleted.", "success");
            fetchForms();
          } else {
            showToast("Delete failed.", "error");
          }
        } catch {
          showToast("Could not connect to server.", "error");
        }
      },
    );
  }

  // ── Clear filters ────────────────────────────────────────────────────────
  function clearFilters() {
    setSearch("");
    setCategoryId(0);
    setOwnerId(0);
    setSortBy("created_desc");
    setPage(1);
  }

  const hasActiveFilters = search !== "" || categoryId !== 0 || ownerId !== 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="afl-shell">
      {/* ── Page header ── */}
      <div className="afl-header">
        <div>
          <h1 className="afl-title">All Forms</h1>
          {metrics && (
            <p className="afl-subtitle">
              {metrics.total_forms.toLocaleString()} Forms ·{" "}
              {metrics.total_users.toLocaleString()} Users ·{" "}
              {metrics.total_responses.toLocaleString()} Responses
            </p>
          )}
        </div>
        <button
          className={`glass-button ${loading ? "" : ""}`}
          onClick={fetchForms}
          disabled={loading}
        >
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── Metric cards ── */}
      <div className="afl-metrics">
        <MetricCard label="Total Forms" value={metrics?.total_forms} />
        <MetricCard label="Total Users" value={metrics?.total_users} />
        <MetricCard label="Total Responses" value={metrics?.total_responses} />
      </div>

      {/* ── Filter toolbar ── */}
      <div className="afl-toolbar">
        <div className="afl-search-wrap">
          <span className="afl-search-icon">🔍</span>
          <input
            className="afl-search-input"
            type="search"
            placeholder="Search title, description, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="afl-search-clear" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <select
          className="glass-select"
          value={ownerId}
          onChange={(e) => {
            setOwnerId(parseInt(e.target.value));
            setPage(1);
          }}
        >
          <option value={0}>All Owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <select
          className="glass-select"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(parseInt(e.target.value));
            setPage(1);
          }}
        >
          <option value={0}>All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="glass-select"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button className="glass-button" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="glass-card form-list-error">
          <p className="form-list-error__title">⚠ Could not load forms</p>
          <p className="form-list-error__message">{error}</p>
          <button className="glass-button" onClick={fetchForms}>
            Try Again
          </button>
        </div>
      )}

      {/* ── Table (desktop) ── */}
      {!error && (
        <div
          className={`afl-table-wrap afl-fade ${isRefreshing ? "afl-fade-out" : "afl-fade-in"}`}
        >
          {isRefreshing && (
            <div className="afl-loading-overlay show">
              <div className="spinner">Loading...</div>
            </div>
          )}
          <table className="afl-table">
            <thead>
              <tr>
                <th>Form Title</th>
                <th>Owner</th>
                <th>Category</th>
                <th className="afl-th-center">Questions</th>
                <th className="afl-th-center">Responses</th>
                <th>Created</th>
                <th className="afl-th-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="afl-td-loading">
                    <div className="form-list-loading__dots">
                      <span className="form-list-dot" />
                      <span className="form-list-dot" />
                      <span className="form-list-dot" />
                    </div>
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="afl-td-empty">
                    <div className="afl-empty-icon">📋</div>
                    <p className="afl-empty-title">
                      {hasActiveFilters
                        ? "No forms match the selected filters."
                        : "No forms have been created yet."}
                    </p>
                    {hasActiveFilters && (
                      <button className="glass-button" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                forms.map((form) => (
                  <tr key={form.id} className="afl-tr">
                    <td className="afl-td-title">
                      <span className="afl-form-title">{form.title}</span>
                      {form.description &&
                        form.description.trim() !== "\u00A0" && (
                          <span className="afl-form-desc">
                            {form.description}
                          </span>
                        )}
                    </td>
                    <td className="afl-td-owner">
                      <span className="afl-owner-name">
                        {form.owner_username ?? "—"}
                      </span>
                      {form.owner_role === "super_admin" && (
                        <span className="afl-owner-badge">Admin</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`category-badge ${form.category_name?.toLowerCase() ?? "general"}`}
                      >
                        {form.category_name ?? "—"}
                      </span>
                    </td>
                    <td className="afl-td-center">{form.question_count}</td>
                    <td className="afl-td-center">{form.response_count}</td>
                    <td className="afl-td-date">
                      {formatDate(form.created_at)}
                    </td>
                    <td className="afl-td-center">
                      <ThreeDotMenu
                        form={form}
                        onView={onViewForm}
                        onEdit={onEditForm}
                        onViewResponses={onViewResponses}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Mobile cards ── */}
      {!error && !loading && forms.length > 0 && (
        <div
          className={`afl-mobile-cards afl-fade ${isRefreshing ? "afl-fade-out" : "afl-fade-in"}`}
          style={{ position: "relative" }}
        >
          {isRefreshing && (
            <div className="afl-loading-overlay show">
              <div className="spinner">Loading...</div>
            </div>
          )}
          {forms.map((form) => (
            <div key={form.id} className="glass-card afl-mobile-card">
              <div className="form-card-header">
                <h3 className="form-card-title">{form.title}</h3>
                <span
                  className={`category-badge ${form.category_name?.toLowerCase() ?? "general"}`}
                >
                  {form.category_name}
                </span>
              </div>
              <p
                className="afl-owner-name"
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-on-dark-muted)",
                }}
              >
                Owner: {form.owner_username ?? "—"}
              </p>
              <p className="form-card-description">
                {form.description && form.description.trim() !== "\u00A0"
                  ? form.description
                  : "\u00A0"}
              </p>
              <div className="form-card-meta">
                <span className="form-card-meta__item">
                  📝 {form.question_count} questions
                </span>
                <span className="form-card-meta__divider">·</span>
                <span className="form-card-meta__item">
                  📊 {form.response_count} responses
                </span>
                <span className="form-card-meta__divider">·</span>
                <span className="form-card-meta__item">
                  📅 {formatDate(form.created_at)}
                </span>
              </div>
              <div className="card-btn-group">
                <button
                  className="card-btn card-btn-view"
                  onClick={() => onViewForm(form.id)}
                >
                  View
                </button>
                <button
                  className="card-btn card-btn-edit"
                  onClick={() => onEditForm(form.id)}
                >
                  Edit
                </button>
                <button
                  className="card-btn card-btn-delete"
                  onClick={() => handleDelete(form)}
                >
                  Delete
                </button>
              </div>
              <button
                className="card-btn-responses"
                onClick={() => onViewResponses(form.id)}
              >
                View Responses
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!error && pagination.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.total_pages}
          onPageChange={setPage}
        />
      )}

      {/* ── Results count ── */}
      {!error && !loading && (
        <p className="afl-results-count">
          Showing {forms.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–
          {Math.min(page * PER_PAGE, pagination.total)} of {pagination.total}{" "}
          forms
        </p>
      )}
    </div>
  );
}

export default AdminFormList;
