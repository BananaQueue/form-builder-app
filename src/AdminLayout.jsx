import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "./useIsMobile";
import ActionButtons from "./ActionButtons";
import FormBuilder from "./FormBuilder";
import FormList from "./FormList";
import FormViewer from "./FormViewer";
import ResponseList from "./ResponseList";
import ResponseViewer from "./ResponseViewer";
import BannerSettings from "./BannerSettings";
import UserManagement from "./UserManagement";
import { useLocation } from "react-router-dom";

function AdminLayout({ onLogout, currentUser, userRole, showToast, showConfirm }) {
  const isSuperAdmin = userRole === 'super_admin';
  const navigate = useNavigate();
  const [viewingFormId, setViewingFormId]       = useState(null);
  const [editingFormId, setEditingFormId]       = useState(null);
  const [responsesFormId, setResponsesFormId]   = useState(null);
  const [viewingResponseId, setViewingResponseId] = useState(null);

  const location = useLocation();
  const navRef = useRef(null);
  const [navOverForm, setNavOverForm] = useState(false);
  const [navStickyActive, setNavStickyActive] = useState(false);
  const formActionsRef = useRef(null);
  const [actionsInNavbar, setActionsInNavbar] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let frame = null;
    function check() {
      const formEl = document.querySelector('.fv-paper, .fb-shell, .fv-shell');
      if (!formEl || !navRef.current) {
        setNavOverForm(false);
        setNavStickyActive(false);
        return;
      }
      const navBottom = navRef.current.getBoundingClientRect().bottom;
      const navTop = navRef.current.getBoundingClientRect().top;
      const stickyTop = 16;
      const formTop = formEl.getBoundingClientRect().top;
      setNavOverForm(formTop < navBottom);
      setNavStickyActive(Math.abs(navTop - stickyTop) <= 1);
    }
    function onScrollOrResize() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        check();
      });
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    check();
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', check);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  

  // ── Navigation handlers (unchanged) ───────────────────────────────────────

  function handleViewForm(formId) {
    setViewingFormId(formId);
    navigate("/view");
  }

  function handleEditForm(formId) {
    setEditingFormId(formId);
    navigate("/edit");
  }

  function handleViewResponses(formId) {
    setResponsesFormId(formId);
    navigate("/responses");
  }

  function handleViewResponseDetail(responseId) {
    setViewingResponseId(responseId);
    navigate("/response-detail");
  }

  function handleEditComplete() {
    setEditingFormId(null);
    navigate("/");
  }

  function handleBackToResponses() {
    setViewingResponseId(null);
    navigate("/responses");
  }

  // ── Helper: build the nav button class name ────────────────────────────────
  //
  // This small helper function reads the current URL path and returns the
  // correct class string for a nav button.
  //
  // How it works:
  //   navButtonClass("/")  →  "glass-button glass-button--active"   (if on "/" )
  //   navButtonClass("/")  →  "glass-button"                        (if NOT on "/")
  //
  // Template literals (backtick strings) let us embed expressions with ${}.
  // The .trim() at the end removes any trailing space if the second class
  // is an empty string — keeps the DOM tidy.
  //
  // We also accept an optional "exact" parameter. When exact is true, the
  // button is only active when the path matches exactly. When false, it's
  // active when the path STARTS WITH the given route. This matters for
  // cases like "/create" — without exact matching, "/create" would also
  // activate a button watching for "/".
  function navButtonClass(path, exact = true) {
    const isActive = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);

    return `glass-button ${isActive ? "glass-button--active" : ""}`.trim();
  }

  return (
    <div style={{ paddingBottom: "40px" }}>

      <nav
        ref={navRef}
        className={`glass-nav${navOverForm ? ' glass-nav--over-form' : ''}${navStickyActive ? ' glass-nav--sticky-active' : ''}${actionsInNavbar ? ' glass-nav--actions-migrated' : ''}`}
      >

        {/* Primary nav links */}
        <div className="nav-nav nav-left">
        <button
          onClick={() => navigate("/")}
          className={navButtonClass("/")}
        >
          My Forms
        </button>

        <button
          onClick={() => navigate("/create")}
          className={navButtonClass("/create")}
        >
          + New Form
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => navigate("/settings")}
              className={navButtonClass("/settings")}
            >
              Settings
            </button>

            <button
              onClick={() => navigate("/users")}
              className={navButtonClass("/users")}
            >
              Users
            </button>
          </>
        )}
        </div>

        {/* Action buttons: render in the nav only when the original actions are overlapped */}
        {actionsInNavbar && !isMobile && location.pathname === '/view' && formActionsRef.current && (
          <>
            <div className="nav-actions-divider" />
            <div className="nav-actions">
              <ActionButtons
                onFillOut={() => formActionsRef.current.fillOut()}
                onCopyLink={() => formActionsRef.current.copyLink()}
                onShowQr={() => formActionsRef.current.showQr()}
              />
            </div>
          </>
        )}

        {/* User info + sign out — pushed to the right via .nav-user's margin-left:auto */}
        <div className="nav-right nav-user">
          {/* The 👤 icon + username */}
          <span>👤 {currentUser}</span>

          {/* Sign Out uses the danger variant for its hover state.
              glass-button--danger is defined in index.css and shows
              a red border/text on hover — a subtle warning signal
              that this action has consequences. */}
          <button
            onClick={onLogout}
            className="glass-button glass-button--danger"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Page Content ────────────────────────────────────────────────────
          All routes and props are completely unchanged from the original.
          We're only touching the nav, not the page content.
      ──────────────────────────────────────────────────────────────────── */}
      <Routes>
        <Route
          path="/"
          element={
            <FormList
              onViewForm={handleViewForm}
              onEditForm={handleEditForm}
              onViewResponses={handleViewResponses}
              showToast={showToast}
              showConfirm={showConfirm}
              isSuperAdmin={isSuperAdmin}
            />
          }
        />

        <Route
          path="/create"
          element={<FormBuilder key="create" showToast={showToast} isSuperAdmin={isSuperAdmin} />}
        />

        <Route
          path="/view"
          element={
            viewingFormId ? (
              <FormViewer
                formId={viewingFormId}
                showToast={showToast}
                actionsRef={formActionsRef}
                onActionBarOverlapChange={setActionsInNavbar}
                actionsInNavbar={actionsInNavbar}
                navStickyActive={navStickyActive}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/edit"
          element={
            editingFormId ? (
              <FormBuilder
                key={editingFormId}
                editFormId={editingFormId}
                onSaveComplete={handleEditComplete}
                showToast={showToast}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/responses"
          element={
            responsesFormId ? (
              <ResponseList
                formId={responsesFormId}
                onBack={() => navigate("/")}
                onViewResponse={handleViewResponseDetail}
                showToast={showToast}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/response-detail"
          element={
            viewingResponseId ? (
              <ResponseViewer
                responseId={viewingResponseId}
                onBack={handleBackToResponses}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/settings"
          element={
            isSuperAdmin
              ? <BannerSettings showToast={showToast} />
              : <Navigate to="/" />
          }
        />

        <Route
          path="/users"
          element={
              isSuperAdmin
                ? <UserManagement
                    showToast={showToast}
                    showConfirm={showConfirm}
                    onViewForm={handleViewForm}
                    onEditForm={handleEditForm}
                    onViewResponses={handleViewResponses}
                    isSuperAdmin={isSuperAdmin}
                  />
                : <Navigate to="/" />
            }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default AdminLayout;