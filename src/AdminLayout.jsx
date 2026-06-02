// src/AdminLayout.jsx
//
// CHANGES FROM ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────
// 1. Import ThemeToggle from './ThemeToggle'
// 2. Accept `theme` and `toggleTheme` as new props
// 3. Render <ThemeToggle> in the nav bar, between the left nav links
//    and the right user area
//
// WHERE THE TOGGLE LIVES IN THE NAV:
// The nav uses flexbox. Left group: page nav links. Right group: user info
// + sign out. The toggle sits between them, in its own small group.
// On mobile it wraps into the nav's second line with the other controls.
//
// ALL OTHER LOGIC IS IDENTICAL TO THE ORIGINAL.
// ─────────────────────────────────────────────────────────────────────────

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
import AdminFormList from "./AdminFormList";
import ThemeToggle from "./ThemeToggle";    // NEW

function AdminLayout({
  onLogout,
  currentUser,
  userRole,
  showToast,
  showConfirm,
  theme,          // NEW: 'dark' or 'light'
  toggleTheme,    // NEW: function to toggle
}) {
  const isSuperAdmin = userRole === "super_admin";
  const navigate = useNavigate();
  const [viewingFormId, setViewingFormId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [responsesFormId, setResponsesFormId] = useState(null);
  const [viewingResponseId, setViewingResponseId] = useState(null);

  const location = useLocation();
  const navRef = useRef(null);
  const [navOverForm, setNavOverForm] = useState(false);
  const [navStickyActive, setNavStickyActive] = useState(false);
  const formActionsRef = useRef(null);
  const [actionsInNavbar, setActionsInNavbar] = useState(false);
  const isMobile = useIsMobile();

  // ── Scroll detection for nav overlay effect (unchanged) ──────────────
  useEffect(() => {
    let frame = null;
    function check() {
      const formEl = document.querySelector(".fv-paper, .fb-shell, .fv-shell");
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
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", check);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  // ── Navigation handlers (unchanged) ──────────────────────────────────
  function handleViewForm(formId) {
    setViewingFormId(formId);
    navigate("/view");
  }

  function handleViewFormAsAdmin(formId, userId, username) {
    setViewingFormId(formId);
    navigate("/view", {
      state: { fromUserId: userId, fromUsername: username },
    });
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

  // ── Nav button class helper (unchanged) ──────────────────────────────
  function navButtonClass(path, exact = true) {
    const isActive = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
    return `glass-button ${isActive ? "glass-button--active" : ""}`.trim();
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: "40px" }}>
      <nav
        ref={navRef}
        className={`glass-nav${navOverForm ? " glass-nav--over-form" : ""}${navStickyActive ? " glass-nav--sticky-active" : ""}${actionsInNavbar ? " glass-nav--actions-migrated" : ""}`}
      >
        {/* ── Left group: primary nav links ─────────────────────────── */}
        <div className="nav-nav nav-left">
          <button onClick={() => navigate("/")} className={navButtonClass("/")}>
            {isSuperAdmin ? "All Forms" : "My Forms"}
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

        {/* ── Migrated action buttons (unchanged) ──────────────────── */}
        {actionsInNavbar &&
          !isMobile &&
          location.pathname === "/view" &&
          formActionsRef.current && (
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

        {/* ── Right group: theme toggle + user info + sign out ─────── */}
        {/*
          The theme toggle sits between the left links and the user area.
          On desktop: it floats in the space between them.
          On mobile: it wraps to the nav's second row with the sign-out button.

          WHY NOT put the toggle inside nav-user?
          nav-user has margin-left: auto which pushes everything to the right.
          We want the toggle to be visually separate from the user info —
          it's a display preference, not a user account action.
          So it gets its own wrapper that sits just before nav-user.

          In practice it appears right next to the user info because the
          only thing between them is empty flex space.
        */}
        <div className="nav-theme-area">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="nav-right nav-user">
          <span> {isSuperAdmin ? '🫂': '👤' }
            {currentUser}</span>
          <button
            onClick={onLogout}
            className="glass-button glass-button--danger"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Page Content (unchanged) ─────────────────────────────────── */}
      <Routes>
        <Route
          path="/"
          element={
            isSuperAdmin ? (
              <AdminFormList
                onViewForm={handleViewForm}
                onEditForm={handleEditForm}
                onViewResponses={handleViewResponses}
                showToast={showToast}
                showConfirm={showConfirm}
              />
            ) : (
              <FormList
                onViewForm={handleViewForm}
                onEditForm={handleEditForm}
                onViewResponses={handleViewResponses}
                showToast={showToast}
                showConfirm={showConfirm}
                isSuperAdmin={isSuperAdmin}
              />
            )
          }
        />

        <Route
          path="/create"
          element={
            <FormBuilder
              key="create"
              showToast={showToast}
              isSuperAdmin={isSuperAdmin}
            />
          }
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
            isSuperAdmin ? (
              <BannerSettings showToast={showToast} />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/users"
          element={
            isSuperAdmin ? (
              <UserManagement
                showToast={showToast}
                showConfirm={showConfirm}
                onViewForm={handleViewFormAsAdmin}
                onEditForm={handleEditForm}
                onViewResponses={handleViewResponses}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default AdminLayout;