// src/AdminLayout.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. Navigation buttons now use class names for active/hover states
//    instead of inline style={{ backgroundColor: ... }}.
//
//    WHY: Inline styles override CSS custom properties (variables). Our new
//    design system uses CSS variables for colors. If we keep inline styles,
//    the variables can never reach those buttons — inline styles always win
//    the "specificity war." By switching to class names, CSS takes full
//    control of appearance and JavaScript only controls behavior.
//
// 2. The nav user display uses the new .nav-user class instead of an
//    inline <span> with margin/font-size styles hardcoded in JSX.
//
//    WHY: Same reason — separation of concerns. CSS handles looks,
//    JavaScript handles logic.
//
// 3. The Sign Out button uses glass-button--danger for its hover style.
//
// EVERYTHING ELSE IS IDENTICAL TO THE ORIGINAL.
// All routing, state, and prop-passing behavior is untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import FormBuilder from "./FormBuilder";
import FormList from "./FormList";
import FormViewer from "./FormViewer";
import ResponseList from "./ResponseList";
import ResponseViewer from "./ResponseViewer";
import BannerSettings from "./BannerSettings";
import { useLocation } from "react-router-dom";

function AdminLayout({ onLogout, currentUser, showToast, showConfirm }) {
  const navigate = useNavigate();
  const [viewingFormId, setViewingFormId]       = useState(null);
  const [editingFormId, setEditingFormId]       = useState(null);
  const [responsesFormId, setResponsesFormId]   = useState(null);
  const [viewingResponseId, setViewingResponseId] = useState(null);

  const location = useLocation();

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

      {/* ── Glass Navigation Bar ────────────────────────────────────────────
          
          BEFORE (the old way, using inline styles):
          ──────────────────────────────────────────
          <button
            style={{
              backgroundColor: location.pathname === "/"
                ? "rgba(0,0,255)"
                : "rgba(52,152,219,0.45)",
            }}
          >
            My Forms
          </button>

          AFTER (the new way, using class names):
          ──────────────────────────────────────
          <button className={navButtonClass("/")}>
            My Forms
          </button>

          The visual result is the same — the active button looks different.
          But now the CSS file is in charge of WHAT it looks like,
          and JavaScript only decides WHICH state it's in.

          This separation is called the "Single Responsibility Principle."
          Each piece of code does one job. CSS: appearance. JS: state.
      ──────────────────────────────────────────────────────────────────── */}
      <nav className="glass-nav">

        {/* Primary nav links */}
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

        <button
          onClick={() => navigate("/settings")}
          className={navButtonClass("/settings")}
        >
          Settings
        </button>

        {/* User info + sign out — pushed to the right via .nav-user's margin-left:auto */}
        <div className="nav-user">
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
            />
          }
        />

        <Route
          path="/create"
          element={<FormBuilder key="create" showToast={showToast} />}
        />

        <Route
          path="/view"
          element={
            viewingFormId ? (
              <FormViewer
                formId={viewingFormId}
                onBack={() => navigate("/")}
                showToast={showToast}
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
                showToast={showToast}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/settings"
          element={<BannerSettings showToast={showToast} />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default AdminLayout;