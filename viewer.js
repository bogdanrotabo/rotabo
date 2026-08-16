/*
 * Rotabo viewer access: shared "unlock full details" flow used by the
 * homepage list and browse.html. Browsing (number, name, flag, category)
 * is free; phone / address / description are served only through the
 * SECURITY DEFINER functions get_listing_details / get_listing_details_by_id,
 * and only after the viewer proves a verified email that holds active paid
 * access (viewer_access). Payment reuses the SAME two Stripe Payment Links
 * as listings, told apart by client_reference_id = "viewer-<token>".
 */
(function () {
  if (!window.supabase) return;
  var SUPABASE_URL = "https://caqfbpzwdgnwjoaedjrg.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcWZicHp3ZGdud2pvYWVkanJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDkwMzgsImV4cCI6MjEwMTc4NTAzOH0.nds6gT2P32WT0wKoeCFAWuGLX3oipGKtvuU2mwdxi3w";
  var FUNCTIONS_URL = SUPABASE_URL + "/functions/v1";
  var TIER_LINKS = {
    "1": "https://buy.stripe.com/bJedR2eZo5ANe10b8w0co0b",
    "12": "https://buy.stripe.com/6oU6oA18y8MZ9KKgsQ0co0c"
  };
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: function (u, o) { return fetch(u, Object.assign({}, o, { cache: "no-store" })); } }
  });

  // Reuse the site's existing verified-email token (also set by the
  // listing forms), valid ~29 min after a successful email verification.
  function getToken() {
    var token = localStorage.getItem("rotabo_verified_token");
    var email = localStorage.getItem("rotabo_verified_email");
    var until = parseInt(localStorage.getItem("rotabo_verified_until") || "0", 10);
    if (token && email && until > Date.now()) return { token: token, email: email };
    return null;
  }
  function storeToken(email, token) {
    localStorage.setItem("rotabo_verified_email", email);
    localStorage.setItem("rotabo_verified_token", token);
    localStorage.setItem("rotabo_verified_until", String(Date.now() + 29 * 60000));
  }

  // The verified-email token above lives ~29 minutes, which is right for
  // proving an address but wrong for paid access that lasts a month or a
  // year -- it made buyers redo the emailed code every half hour. Once
  // access is confirmed we trade it for a viewer session, minted server
  // side and capped at the paid-access expiry.
  function getSession() {
    var token = localStorage.getItem("rotabo_viewer_session");
    var email = localStorage.getItem("rotabo_verified_email") || "";
    var until = parseInt(localStorage.getItem("rotabo_viewer_session_until") || "0", 10);
    if (token && until > Date.now()) return { token: token, email: email };
    return null;
  }
  function clearSession() {
    localStorage.removeItem("rotabo_viewer_session");
    localStorage.removeItem("rotabo_viewer_session_until");
  }
  // Whichever credential is currently good: the long session first.
  function getCredential() { return getSession() || getToken(); }

  // Swap a fresh verified-email token for a session. Best effort -- if it
  // fails the viewer simply keeps using the short token as before.
  function startSession(tok) {
    if (!tok || getSession()) return Promise.resolve();
    return sb.rpc("viewer_start_session", { p_token: tok.token }).then(function (r) {
      var row = r && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (!row || !row.session_token) return;
      localStorage.setItem("rotabo_viewer_session", row.session_token);
      localStorage.setItem(
        "rotabo_viewer_session_until",
        String(row.session_expires ? new Date(row.session_expires).getTime() : Date.now() + 30 * 86400000)
      );
    }).catch(function () { /* keep the short token */ });
  }

  function T(key, def, vars) {
    var d = window.__dict;
    var val = def;
    if (d && d.viewer && d.viewer[key] != null) val = d.viewer[key];
    if (vars) { Object.keys(vars).forEach(function (k) { val = val.split("{" + k + "}").join(vars[k]); }); }
    return val;
  }
  var STR = {
    title: ["title", "Unlock full access"],
    intro: ["intro", "Browsing is free. To see phone numbers and addresses and contact anyone, unlock full access to every listing."],
    email_ph: ["email_placeholder", "your@email.com"],
    send: ["send_btn", "Send code"],
    code_ph: ["code_placeholder", "6-digit code"],
    verify: ["verify_btn", "Verify"],
    sent: ["code_sent", "We sent a code to {email}."],
    choose: ["choose", "Choose your access:"],
    tier1: ["tier1", "1 CHF — 1 month"],
    tier12: ["tier12", "2 CHF — 1 year"],
    localcur: ["local_currency", "Charged in your local currency."],
    paynote: ["pay_note", "After paying, come back and tap the listing again to reveal the details."],
    unlocked: ["unlocked", "Access unlocked — details are now visible."],
    err_email: ["err_email", "Please enter a valid email."],
    err_code: ["err_code", "Invalid or expired code."],
    err_generic: ["err_generic", "Something went wrong. Please try again."]
  };
  function t(k, vars) { var s = STR[k]; return T(s[0], s[1], vars); }

  // ----- modal -----
  var overlay, box, onUnlock;
  function injectStyles() {
    if (document.getElementById("rv-styles")) return;
    var css =
      ".rv-overlay{position:fixed;inset:0;background:rgba(40,10,55,.55);display:none;align-items:center;justify-content:center;z-index:9999;padding:18px;}" +
      ".rv-overlay.open{display:flex;}" +
      ".rv-box{background:#fff;max-width:420px;width:100%;border-radius:18px;padding:26px 24px;box-shadow:0 20px 60px rgba(60,20,80,.35);font-family:'Segoe UI',system-ui,sans-serif;color:#3a1650;position:relative;max-height:90vh;overflow:auto;}" +
      ".rv-box h3{margin:0 0 10px;font-size:1.35rem;color:#7c2d9c;}" +
      ".rv-box p{margin:0 0 14px;line-height:1.55;color:#6b5878;font-size:.98rem;}" +
      ".rv-box input{width:100%;box-sizing:border-box;border:1px solid #e2c3ee;border-radius:40px;padding:13px 18px;font-size:1rem;margin-bottom:10px;}" +
      ".rv-box input:focus{outline:none;border-color:#9b3fc0;box-shadow:0 0 0 3px rgba(155,63,192,.18);}" +
      ".rv-btn{display:block;width:100%;box-sizing:border-box;border:none;border-radius:40px;padding:14px 18px;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:10px;text-align:center;text-decoration:none;}" +
      ".rv-btn.solid{background:#9333a8;color:#fff;}" +
      ".rv-btn.tier{background:#f3e6f8;color:#7c2d9c;border:1px solid #e2c3ee;}" +
      ".rv-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:1.6rem;line-height:1;color:#8a7a94;cursor:pointer;}" +
      ".rv-err{color:#b23f78;font-weight:600;font-size:.9rem;margin:0 0 10px;display:none;}" +
      ".rv-err.show{display:block;}" +
      ".rv-ok{color:#3ecb7e;font-weight:700;}" +
      "html[dir=rtl] .rv-close{right:auto;left:16px;}";
    var s = document.createElement("style");
    s.id = "rv-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }
  function build() {
    injectStyles();
    overlay = document.createElement("div");
    overlay.className = "rv-overlay";
    overlay.innerHTML = '<div class="rv-box"><button class="rv-close" aria-label="Close">×</button><div class="rv-body"></div></div>';
    document.body.appendChild(overlay);
    box = overlay.querySelector(".rv-body");
    overlay.querySelector(".rv-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }
  function open(cb) {
    if (!overlay) build();
    onUnlock = cb || null;
    overlay.classList.add("open");
    var tok = getCredential();
    if (tok) stepAccessCheck(tok); else stepEmail();
  }
  function close() { if (overlay) overlay.classList.remove("open"); }

  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function stepEmail(prefill) {
    box.innerHTML =
      '<h3>' + esc(t("title")) + '</h3>' +
      '<p>' + esc(t("intro")) + '</p>' +
      '<p class="rv-err" id="rvErr"></p>' +
      '<input type="email" id="rvEmail" autocomplete="email" placeholder="' + esc(t("email_ph")) + '">' +
      '<button class="rv-btn solid" id="rvSend">' + esc(t("send")) + '</button>';
    var input = box.querySelector("#rvEmail");
    if (prefill) input.value = prefill;
    box.querySelector("#rvSend").addEventListener("click", function () {
      var email = (input.value || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr(t("err_email")); return; }
      var btn = this; btn.disabled = true;
      post({ action: "send", email: email }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { showErr(t("err_generic")); return; }
        stepCode(email);
      }).catch(function () { btn.disabled = false; showErr(t("err_generic")); });
    });
  }
  function stepCode(email) {
    box.innerHTML =
      '<h3>' + esc(t("title")) + '</h3>' +
      '<p>' + esc(t("sent", { email: email })) + '</p>' +
      '<p class="rv-err" id="rvErr"></p>' +
      '<input type="text" id="rvCode" inputmode="numeric" autocomplete="one-time-code" placeholder="' + esc(t("code_ph")) + '">' +
      '<button class="rv-btn solid" id="rvVerify">' + esc(t("verify")) + '</button>';
    box.querySelector("#rvVerify").addEventListener("click", function () {
      var code = (box.querySelector("#rvCode").value || "").trim();
      if (!code) { showErr(t("err_code")); return; }
      var btn = this; btn.disabled = true;
      post({ action: "verify", email: email, code: code }).then(function (r) {
        btn.disabled = false;
        if (!r.ok || !r.json || !r.json.token) { showErr(t("err_code")); return; }
        storeToken(email, r.json.token);
        stepAccessCheck({ token: r.json.token, email: email });
      }).catch(function () { btn.disabled = false; showErr(t("err_code")); });
    });
  }
  function stepAccessCheck(tok) {
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p>…</p>';
    sb.rpc("viewer_has_access", { p_token: tok.token }).then(function (r) {
      if (r && r.data === true) {
        // Access confirmed: mint the long session before showing success,
        // so the next visit needs no emailed code.
        startSession(tok).then(function () {
          stepSuccess();
          if (onUnlock) onUnlock();
        });
      } else toPayment();
    }).catch(function () { toPayment(); });

    // No access (or it lapsed). Any session we hold is worthless now, and
    // the checkout's client_reference_id must carry a verified-email token
    // -- that is what the Stripe webhook looks up to know who paid. With a
    // session token there it would find nothing and fall back to whatever
    // address Stripe collected. So drop the session and, if there is no
    // fresh verified token, send them back through the emailed code.
    function toPayment() {
      clearSession();
      var verified = getToken();
      if (verified) stepPay(verified);
      else stepEmail(tok.email || "");
    }
  }
  function stepPay(tok) {
    var q = "?client_reference_id=" + encodeURIComponent("viewer-" + tok.token) + "&prefilled_email=" + encodeURIComponent(tok.email);
    box.innerHTML =
      '<h3>' + esc(t("title")) + '</h3>' +
      '<p>' + esc(t("choose")) + '</p>' +
      '<a class="rv-btn tier" href="' + TIER_LINKS["1"] + q + '">' + esc(t("tier1")) + '</a>' +
      '<a class="rv-btn tier" href="' + TIER_LINKS["12"] + q + '">' + esc(t("tier12")) + '</a>' +
      // Prices are quoted in CHF, but Stripe's Adaptive Pricing is always
      // on for Payment Links, so a buyer abroad is billed in their own
      // currency. Saying so keeps the CHF figure honest without the site
      // having to carry live exchange rates.
      '<p style="font-size:.85rem;margin-top:6px;">' + esc(t("localcur")) + '</p>' +
      '<p style="font-size:.85rem;margin-top:6px;">' + esc(t("paynote")) + '</p>';
  }
  function stepSuccess() {
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p class="rv-ok">' + esc(t("unlocked")) + '</p>';
    setTimeout(close, 1400);
  }
  function showErr(msg) { var e = box.querySelector("#rvErr"); if (e) { e.textContent = msg; e.classList.add("show"); } }

  function post(body) {
    return fetch(FUNCTIONS_URL + "/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (res) { return res.json().then(function (json) { return { ok: res.ok, json: json }; }); });
  }

  // ----- public API -----
  window.RotaboViewer = {
    hasToken: function () { return !!getCredential(); },
    open: open,
    // Reveal a listing's details. opts: {id} or {number}, onDetails(rows), onLocked()
    reveal: function (opts) {
      var tok = getCredential();
      if (!tok) { open(function () { window.RotaboViewer.reveal(opts); }); return; }
      var call = opts.id
        ? sb.rpc("get_listing_details_by_id", { p_id: opts.id, p_token: tok.token })
        : sb.rpc("get_listing_details", { p_number: opts.number, p_token: tok.token });
      call.then(function (r) {
        var rows = (r && r.data) || [];
        if (rows.length) { if (opts.onDetails) opts.onDetails(rows); }
        else { open(function () { window.RotaboViewer.reveal(opts); }); if (opts.onLocked) opts.onLocked(); }
      }).catch(function () { if (opts.onLocked) opts.onLocked(); });
    }
  };
})();
