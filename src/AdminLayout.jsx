// src/AdminLayout.jsx
//
// CHANGES FROM PREVIOUS VERSION:
// ─────────────────────────────────────────────────────────────────────────
// The "Back to Responses" button was landing on "/" instead of the
// response list. Root cause explained below.
//
// ── WHY "BACK TO RESPONSES" WAS BROKEN ───────────────────────────────────
//
// handleBackToResponses() was doing two things in sequence:
//
//   1. setViewingResponseId(null)   ← state update (React batches this)
//   2. navigate("/responses")       ← navigation
//
// React 18 batches state updates. So on the next render BOTH changes
// apply at once. At that point, the router evaluates which route to show.
//
// The /response-detail route is:
//   viewingResponseId ? <ResponseViewer> : <Navigate to="/" />
//
// Because viewingResponseId is now null, that route renders
// <Navigate to="/" /> — which fires as a redirect and wins over the
// navigate("/responses") call, sending the user to "/" instead.
//
// THE FIX:
// Don't clear viewingResponseId inside handleBackToResponses.
// Just navigate. The old value stays in state harmlessly — it will be
// overwritten the next time a response is opened. The /response-detail
// route's guard only matters if someone manually types that URL directly.
//
// The same race condition existed in handleBackFromResponseList clearing
// responsesFormId (though in practice that one was less likely to fire
// because the /responses route's guard is evaluated AFTER we've already
// navigated away from it — but we clean it up for consistency).
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
import ThemeToggle from "./ThemeToggle";
import NotificationCenter from "./NotificationCenter";

function AdminLayout({
  onLogout,
  currentUser,
  userRole,
  showToast,
  showConfirm,
  theme,
  toggleTheme,
  signingOut = false,
}) {
  const isSuperAdmin = userRole === "super_admin";
  const navigate = useNavigate();
  const [viewingFormId, setViewingFormId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [responsesFormId, setResponsesFormId] = useState(null);
  const [viewingResponseId, setViewingResponseId] = useState(null);

  const location = useLocation();
  const navRef = useRef(null);
  const [navOverContent, setNavOverContent] = useState(false);
  const [navStickyActive, setNavStickyActive] = useState(false);
  const formActionsRef = useRef(null);
  const [actionsInNavbar, setActionsInNavbar] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    let frame = null;
    function check() {
      if (!navRef.current) {
        setNavOverContent(false);
        setNavStickyActive(false);
        return;
      }

      const navRect = navRef.current.getBoundingClientRect();
      const stickyTop = 16;
      const overlapTargets = document.querySelectorAll(
        ".fv-paper, .fv-shell, .fb-shell, .form-list-shell, .afl-shell, .rl-shell, .rv-shell, .um-shell, .bs-shell, .nc-shell"
      );

      const isOverContent = Array.from(overlapTargets).some((target) => {
        const targetRect = target.getBoundingClientRect();
        const overlapsHorizontally =
          targetRect.left < navRect.right && targetRect.right > navRect.left;
        const overlapsVertically =
          targetRect.top < navRect.bottom && targetRect.bottom > navRect.top;

        return (
          targetRect.width > 0 &&
          targetRect.height > 0 &&
          overlapsHorizontally &&
          overlapsVertically
        );
      });

      setNavOverContent(isOverContent);
      setNavStickyActive(Math.abs(navRect.top - stickyTop) <= 1);
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

  // ── Form navigation ───────────────────────────────────────────────────

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

  function handleEditComplete() {
    setEditingFormId(null);
    navigate("/");
  }

  // ── Response navigation ───────────────────────────────────────────────
  //
  // handleViewResponses accepts an optional second argument `fromUser`.
  //
  // When called from a normal form list (My Forms / All Forms):
  //   fromUser is undefined → no state attached → Back goes to "/"
  //
  // When called from inside a user drill-down (Users → [username]):
  //   fromUser = { id, username } → state attached → Back goes to /users
  //   with that user's context restored, exactly like FormViewer does.

  function handleViewResponses(formId, fromUser) {
    setResponsesFormId(formId);
    navigate("/responses", {
      state: fromUser
        ? { fromUserId: fromUser.id, fromUsername: fromUser.username }
        : undefined,
    });
  }

  // Called by the Back button inside ResponseList.
  //
  // Reads the route state that was attached when we navigated to /responses.
  // If fromUserId is present we came from a user drill-down → restore it.
  // If not, we came from the main form list → go to "/".
  //
  // NOTE: We do NOT clear responsesFormId here. See the explanation at the
  // top of this file for why clearing state before navigating causes issues.
  function handleBackFromResponseList() {
    const state = location.state;
    if (state?.fromUserId) {
      navigate("/users", {
        state: {
          viewingUser: {
            id: state.fromUserId,
            username: state.fromUsername,
          },
        },
      });
      return;
    }
    navigate("/");
  }

  // Called when opening a response detail from within ResponseList.
  //
  // We forward whatever route state /responses currently carries onto
  // /response-detail. This keeps the fromUserId context alive through
  // the full Back → Back → Back chain.
  function handleViewResponseDetail(responseId) {
    setViewingResponseId(responseId);
    navigate("/response-detail", {
      state: location.state ?? undefined,
    });
  }

  // Called by the "← Back to Responses" button inside ResponseViewer.
  //
  // FIX: We no longer call setViewingResponseId(null) here.
  //
  // Previously this was:
  //   setViewingResponseId(null);   ← removed
  //   navigate("/responses", ...);
  //
  // The state clear + navigate combination caused React to batch both
  // changes, then re-evaluate the /response-detail route guard
  // (viewingResponseId ? <ResponseViewer> : <Navigate to="/" />).
  // With viewingResponseId null, that guard fired <Navigate to="/" />
  // which overrode the navigate("/responses") call.
  //
  // Solution: just navigate. viewingResponseId stays set to the old value
  // harmlessly — it gets overwritten the next time a response is opened.
  //
  // We also re-attach the route state so ResponseList's own Back button
  // still works correctly (it reads location.state to decide where to go).
  function handleBackToResponses() {
    navigate("/responses", {
      state: location.state ?? undefined,
    });
  }

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
        className={`glass-nav${navOverContent ? " glass-nav--over-form" : ""}${navStickyActive ? " glass-nav--sticky-active" : ""}${actionsInNavbar ? " glass-nav--actions-migrated" : ""}`}
      >
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

        {actionsInNavbar &&
          !isMobile &&
          location.pathname === "/view" && (
            <>
              <div className="nav-actions-divider" />
              <div className="nav-actions">
                <ActionButtons
                  onFillOut={() => formActionsRef.current?.fillOut()}
                  onCopyLink={() => formActionsRef.current?.copyLink()}
                  onShowQr={() => formActionsRef.current?.showQr()}
                />
              </div>
            </>
          )}

        <div className="nav-right nav-user">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <span className="nav-user-chip">👤 {currentUser}</span>
          <button
            onClick={onLogout}
            disabled={signingOut}
            className="glass-button glass-button--danger"
          >
            {signingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </nav>

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
                onBack={handleBackFromResponseList}
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
          path="/notifications"
          element={
            !isSuperAdmin ? (
              <NotificationCenter showToast={showToast} />
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
