/*
 * Rotabo viewer access: shared "unlock full access" flow used by the
 * homepage list and browse.html. Nothing about the people here is free:
 * the list itself (browse_public) and their phone / address / description
 * (get_listing_details / get_listing_details_by_id) are all SECURITY
 * DEFINER functions that answer only for a verified email holding active
 * paid access (viewer_access). browse_count -- a bare headcount, no names
 * -- is all a stranger gets. Payment reuses the SAME two Stripe Payment
 * Links as listings, told apart by client_reference_id = "viewer-<token>".
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
  // With site data blocked (Safari "Block All Cookies", Chrome's
  // per-site block, a sandboxed iframe) every setItem throws and every
  // getItem comes back empty, so a token that was just verified vanished
  // between one step of the modal and the next: toPayment re-read it
  // from storage, got null, and sent the buyer back to the email box --
  // forever, with the Stripe buttons unreachable. Keeping the live
  // credential in memory costs nothing when storage works and is the
  // only thing that works when it does not. It dies with the page,
  // which is exactly the lifetime such a browser is asking for.
  var memToken = null;    // freshly verified email token
  var memSession = null;  // viewer session minted from it

  // The verified-email token, from memory first: storage may be denied,
  // and when it is not, the two hold the same thing anyway.
  function getToken() {
    if (memToken && memToken.until > Date.now()) return { token: memToken.token, email: memToken.email };
    try {
      var token = localStorage.getItem("rotabo_verified_token");
      var email = localStorage.getItem("rotabo_verified_email");
      var until = parseInt(localStorage.getItem("rotabo_verified_until") || "0", 10);
      if (token && email && until > Date.now()) return { token: token, email: email };
    } catch (e) { /* storage denied */ }
    return null;
  }
  function storeToken(email, token) {
    var until = Date.now() + 29 * 60000;
    memToken = { token: token, email: email, until: until };
    // Guarded: with storage denied the token simply lives only as long
    // as the page -- the flow must not die on the throw.
    try {
      localStorage.setItem("rotabo_verified_email", email);
      localStorage.setItem("rotabo_verified_token", token);
      localStorage.setItem("rotabo_verified_until", String(until));
    } catch (e) {}
  }

  // The verified-email token above lives ~29 minutes, which is right for
  // proving an address but wrong for paid access that lasts a month or a
  // year -- it made buyers redo the emailed code every half hour. Once
  // access is confirmed we trade it for a viewer session, minted server
  // side and capped at the paid-access expiry.
  function getSession() {
    if (memSession && memSession.until > Date.now()) return { token: memSession.token, email: memSession.email };
    try {
      var token = localStorage.getItem("rotabo_viewer_session");
      var email = localStorage.getItem("rotabo_verified_email") || "";
      var until = parseInt(localStorage.getItem("rotabo_viewer_session_until") || "0", 10);
      if (token && until > Date.now()) return { token: token, email: email };
    } catch (e) { /* storage denied */ }
    return null;
  }
  function clearSession() {
    memSession = null;
    try {
      localStorage.removeItem("rotabo_viewer_session");
      localStorage.removeItem("rotabo_viewer_session_until");
    } catch (e) {}
  }
  // Whichever credential is currently good: the long session first.
  function getCredential() { return getSession() || getToken(); }

  // The "a checkout just started" marker, read by justPaid() and by
  // browse.html to know not to quote a price at someone mid-payment.
  // It has to be cleared the moment access is confirmed, on every path
  // that confirms it.
  function clearPaidStamp() {
    try { localStorage.removeItem("rotabo_viewer_paid_at"); } catch (e) {}
  }

  // Swap a fresh verified-email token for a session. Best effort -- if it
  // fails the viewer simply keeps using the short token as before.
  function startSession(tok) {
    if (!tok || getSession()) return Promise.resolve();
    return sb.rpc("viewer_start_session", { p_token: tok.token }).then(function (r) {
      var row = r && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (!row || !row.session_token) return;
      var until = row.session_expires ? new Date(row.session_expires).getTime() : Date.now() + 30 * 86400000;
      // In memory as well, so a browser that refuses storage still holds
      // a working credential for the rest of the visit -- without it the
      // page told a paying viewer "Access unlocked" and then immediately
      // re-locked, because browse_public was called with a null token.
      memSession = { token: row.session_token, email: tok.email || "", until: until };
      try {
        localStorage.setItem("rotabo_viewer_session", row.session_token);
        localStorage.setItem("rotabo_viewer_session_until", String(until));
      } catch (e) { /* storage denied: memSession carries this visit */ }
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
    // Cheie noua, nu textul vechi tradus: din 23 august cei 2 franci
    // deschid tot site-ul, nu categoria rasfoita. Cele 38 de locale au
    // inca traducerea veche, care spune "aceasta categorie" -- daca as fi
    // pastrat cheia, fiecare neenglez ar fi citit o minciuna despre ce
    // cumpara. Asa citeste englezeste pana traduc, ceea ce e mai putin rau.
    intro: ["intro_all", "One payment opens the whole site: see who is here in every category, with their phone numbers and addresses, and contact anyone."],
    email_ph: ["email_placeholder", "your@email.com"],
    send: ["send_btn", "Send code"],
    code_ph: ["code_placeholder", "6-digit code"],
    verify: ["verify_btn", "Verify"],
    sent: ["code_sent", "We sent a code to {email}."],
    choose: ["choose", "Choose your access:"],
    // tier1 (1 CHF for a month) is no longer offered -- since 2026-08-22
    // there is a single tier. The string stays defined, and translated in
    // all 38 locales, so restoring the two-tier modal is one line in
    // stepPay rather than another pass over the locale files.
    tier1: ["tier1", "1 CHF — 1 month"],
    tier12: ["tier12", "2 CHF — 1 year"],
    // Shown instead of the price when the visitor has no listing of their
    // own. Rotabo has the supply problem every marketplace starts with,
    // and someone who wants to see the list is exactly the person who
    // should be on it: listing is free, so this costs them a minute, not
    // a franc.
    need_title: ["need_listing_title", "First put yourself on the list — it is free"],
    need_body: ["need_listing_body", "Rotabo shows you who is here once you are here too. Publishing your own listing costs nothing and takes a minute: say what you need, or what you can do. Then come back and unlock the full list."],
    need_btn: ["need_listing_btn", "Add my free listing"],
    localcur: ["local_currency", "Charged in your local currency."],
    paynote: ["pay_note", "After paying, come back to this page — everyone here becomes visible."],
    unlocked: ["unlocked", "Access unlocked — details are now visible."],
    err_email: ["err_email", "Please enter a valid email."],
    err_code: ["err_code", "Invalid or expired code."],
    err_generic: ["err_generic", "Something went wrong. Please try again."],
    gone: ["listing_gone", "This listing is no longer available."],
    confirming: ["confirming", "Confirming your payment…"],
    retry: ["retry_btn", "Try again"],
    // Since 2026-08-23 the emailed code no longer ends in a 29-minute
    // token and nothing else: it ends in an account. Someone who paid was
    // never a user before -- just a row keyed by email, good only in the
    // browser they paid from. That is how thousands of sessions had
    // produced eight people.
    pw_new_title: ["pw_new_title", "Choose a password"],
    pw_new_body: ["pw_new_body", "Your email is confirmed. Pick a password and this becomes your Rotabo account: next time you simply sign in, from any device, with no code to wait for."],
    pw_have_title: ["pw_have_title", "Enter your password"],
    pw_have_body: ["pw_have_body", "This email already has a Rotabo account. Sign in and everything you have unlocked comes with you."],
    pw_ph: ["pw_placeholder", "Password (at least 8 characters)"],
    pw_btn: ["pw_btn", "Continue"],
    err_pw_short: ["err_pw_short", "Please use at least 8 characters."],
    err_pw_wrong: ["err_pw_wrong", "That password does not match this email."],
    forgot: ["forgot_pw", "Forgotten your password?"]
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
  // Which category this modal is selling, since 2026-08-22: access is
  // bought one category at a time, not for the whole site. browse.html
  // passes the category it is showing. Null means "no category context"
  // -- the modal then asks only whether the visitor has access to
  // anything at all, which is all it can honestly check.
  var activeCategory = null;
  function open(cb, category) {
    if (!overlay) build();
    onUnlock = cb || null;
    activeCategory = category || null;
    overlay.classList.add("open");
    var tok = getCredential();
    if (tok) { stepAccessCheck(tok); return; }
    // Logat, dar fara credential in browserul asta. Asta e tot rostul
    // contului: sesiunea se preschimba in token de vizionare fara sa mai
    // treaca prin email. Inainte, al doilea telefon cerea iar un cod
    // desi omul platise, si de acolo multi renuntau.
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p>…</p>';
    sb.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      var email = session && session.user && session.user.email;
      if (!session || !email) { stepEmail(); return; }
      sb.rpc("viewer_token_for_session").then(function (r) {
        if (r && !r.error && r.data) {
          storeToken(email, r.data);
          stepAccessCheck({ token: r.data, email: email });
        } else stepEmail(email);
      }).catch(function () { stepEmail(email); });
    }).catch(function () { stepEmail(); });
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
      // purpose tells verify-email this is not a listing, so it does not
      // hand out a permanent Rotabo number and promise it "goes live
      // together with your listing" to somebody buying viewer access.
      post({ action: "send", email: email, purpose: "viewer" }).then(function (r) {
        btn.disabled = false;
        // 429 is verify-email's own rate limit: a code went to this
        // address less than a minute ago and is still valid. Showing the
        // generic error here left the buyer staring at the email box with
        // a working code in their inbox and no field to type it into.
        // index.html has treated 429 as "go on to the code step" for a
        // while; this modal is the other half of the same flow.
        if (!r.ok && r.status !== 429) { showErr(t("err_generic")); return; }
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
        stepPassword({ token: r.json.token, email: email }, r.json.has_account === true);
      }).catch(function () { btn.disabled = false; showErr(t("err_code")); });
    });
  }
  // Intre codul pe email si verificarea accesului: aici o adresa
  // verificata devine cont. Nimic din ce vede omul azi nu se schimba --
  // accesul platit si anunturile sunt legate de email, nu de user id.
  // Se schimba ce i se intampla pe al doilea telefon, unde inainte o lua
  // de la zero, cu un cod nou, desi platise.
  function stepPassword(tok, hasAccount) {
    var isNew = !hasAccount;
    box.innerHTML =
      '<h3>' + esc(t(isNew ? "pw_new_title" : "pw_have_title")) + '</h3>' +
      '<p>' + esc(t(isNew ? "pw_new_body" : "pw_have_body")) + '</p>' +
      '<p class="rv-err" id="rvErr"></p>' +
      '<input type="password" id="rvPw" autocomplete="' + (isNew ? "new-password" : "current-password") + '" placeholder="' + esc(t("pw_ph")) + '">' +
      '<button class="rv-btn solid" id="rvPwGo">' + esc(t("pw_btn")) + '</button>' +
      (isNew ? "" : '<p style="text-align:center;margin:0;"><a href="/account.html" style="color:#9b3fc0;font-size:.9rem;">' + esc(t("forgot")) + '</a></p>');
    var input = box.querySelector("#rvPw");
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") box.querySelector("#rvPwGo").click(); });
    box.querySelector("#rvPwGo").addEventListener("click", function () {
      var pw = input.value || "";
      if (pw.length < 8) { showErr(t("err_pw_short")); return; }
      var btn = this; btn.disabled = true;
      var work = isNew
        ? post({ action: "set_password", email: tok.email, token: tok.token, password: pw })
            .then(function () { return sb.auth.signInWithPassword({ email: tok.email, password: pw }); })
        : sb.auth.signInWithPassword({ email: tok.email, password: pw });
      // Un esec la creare sau la logare nu are voie sa coste omul accesul
      // pe care poate l-a si platit: fiecare drum de aici se termina tot
      // in stepAccessCheck, cu token-ul de email verificat in mana. Doar
      // parola gresita a cuiva cu cont deja se opreste si se anunta --
      // acolo mai departe nu are sens.
      work.then(function (res) {
        btn.disabled = false;
        if (!isNew && res && res.error) { showErr(t("err_pw_wrong")); return; }
        stepAccessCheck(tok);
      }).catch(function () { btn.disabled = false; stepAccessCheck(tok); });
    });
  }
  function stepAccessCheck(tok) {
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p>…</p>';
    // Access is per category now. With a category in hand, ask about that
    // one -- asking the global question would tell someone who bought
    // Drive that Care is already unlocked, and then show them an empty list.
    // Accesul e global din 23 august: o singura plata de 2 franci deschide
    // toate categoriile, un an. Intrebarea pe categorie nu mai distinge
    // nimic, asa ca nu se mai pune.
    var accessRpc = sb.rpc("viewer_has_access", { p_token: tok.token });
    accessRpc.then(function (r) {
      if (r && r.data === true) {
        // The webhook usually lands before the buyer gets back, and this
        // branch forgot to clear the "just paid" stamp -- so for the next
        // three minutes justPaid() stayed true and every browse.html load
        // repainted the locked card, prices and all, at someone who had
        // just paid, then flashed the modal over it.
        clearPaidStamp();
        // Access confirmed: mint the long session before showing success,
        // so the next visit needs no emailed code.
        startSession(tok).then(function () {
          stepSuccess();
          if (onUnlock) onUnlock();
        });
      } else if (r && r.error) {
        // A flaky network or a server hiccup is not "you have not paid".
        // This used to fall through to toPayment(), which wiped the
        // 30-day session and showed the Stripe tiers to someone who had
        // already bought access -- one bad request away from a double
        // charge. Keep the session and offer a retry instead.
        stepError(tok);
      } else toPayment();
    }).catch(function () { stepError(tok); });

    // No access (or it lapsed). Any session we hold is worthless now, and
    // the checkout's client_reference_id must carry a verified-email token
    // -- that is what the Stripe webhook looks up to know who paid. With a
    // session token there it would find nothing and fall back to whatever
    // address Stripe collected. So drop the session and, if there is no
    // fresh verified token, send them back through the emailed code.
    function toPayment() {
      // Just back from a viewer checkout? Stripe's webhook can land a few
      // seconds after the browser does, and in that window "no access"
      // is really "not yet". Showing the tiers again here is how someone
      // pays twice -- so poll for the access row first.
      var paidAt = 0;
      try { paidAt = parseInt(localStorage.getItem("rotabo_viewer_paid_at") || "0", 10); } catch (e) {}
      if (paidAt && Date.now() - paidAt < 3 * 60000) { stepConfirming(tok, 0); return; }
      clearSession();
      // getToken() answers from memory first now, so a browser that
      // refuses storage arrives here holding the token it just verified
      // instead of null -- which used to bounce the buyer back to the
      // email box on every attempt, with the Stripe buttons unreachable.
      // `tok` is the belt to that braces: it is the credential this
      // check was called with.
      var verified = getToken() || tok;
      if (!verified) { stepEmail(tok.email || ""); return; }
      // Since 2026-08-22 the list is only sold to people who are on it.
      // viewer_has_listing resolves the token to an email the same way
      // viewer_email_for_token does and answers whether that address has
      // a listing that is visible right now. A network failure must not
      // block a sale, so anything other than a clear false falls through
      // to the price -- the gate is there to steer, not to punish.
      sb.rpc("viewer_has_listing", { p_token: verified.token }).then(function (r) {
        if (r && !r.error && r.data === false) stepNeedListing(verified);
        else stepPay(verified);
      }).catch(function () { stepPay(verified); });
    }
    // A checkout that Stripe has taken the money for but whose webhook is
    // still in flight. Poll for the access row rather than quoting the
    // price again -- the one thing that must never happen here is showing
    // the tier buttons to somebody who has already paid, because
    // grant_viewer_access simply stacks the months and the second
    // payment buys nothing they wanted.
    var CONFIRM_TRIES = 60;   // ~3 minutes, matching the justPaid window
    function stepConfirming(tok, tries) {
      box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p>' + esc(t("confirming")) + '</p>';
      setTimeout(function () {
        var poll = activeCategory
          ? sb.rpc("viewer_has_access_for", { p_token: tok.token, p_category: activeCategory })
          : sb.rpc("viewer_has_access", { p_token: tok.token });
        poll.then(function (r) {
          if (r && r.data === true) {
            clearPaidStamp();
            startSession(tok).then(function () { stepSuccess(); if (onUnlock) onUnlock(); });
          } else if (tries < CONFIRM_TRIES) {
            stepConfirming(tok, tries + 1);
          } else {
            // Three minutes and still no access row. This used to fall
            // through to the tiers, inviting a second payment for a
            // checkout that had very likely succeeded; a retry button
            // costs the buyer a tap and cannot cost them a franc.
            stepError(tok);
          }
        }).catch(function () {
          if (tries < CONFIRM_TRIES) stepConfirming(tok, tries + 1); else stepError(tok);
        });
      }, tries === 0 ? 0 : 3000);
    }
  }
  // "1 CHF" is meaningless to someone who has never held a franc, so each
  // tier carries a rough local equivalent -- USD when the local currency
  // is unknown. Empty only for Swiss visitors; see fx.js.
  function withApprox(label, chf) {
    var a = window.RotaboFx ? window.RotaboFx.approx(chf) : "";
    return a ? label + "  " + a : label;
  }

  // The dead end that is not a dead end: no listing of their own, so
  // there is nothing to sell them yet. Sends them to the homepage forms,
  // which since 2026-08-22 publish for free, and leaves the modal behind.
  function stepNeedListing(tok) {
    box.innerHTML =
      '<h3>' + esc(t("need_title")) + '</h3>' +
      '<p>' + esc(t("need_body")) + '</p>' +
      // #categories, not #add: there is no #add anchor on the homepage,
      // so that link quietly landed people at the top of the page. The
      // category tiles are what open the listing forms.
      '<a class="rv-btn solid" href="/#categories">' + esc(t("need_btn")) + '</a>';
  }

  var lastPayTok = null;
  function stepPay(tok) {
    lastPayTok = tok;
    var q = "?client_reference_id=" + encodeURIComponent("viewer-" + tok.token) + "&prefilled_email=" + encodeURIComponent(tok.email);
    box.innerHTML =
      '<h3>' + esc(t("title")) + '</h3>' +
      '<p>' + esc(t("choose")) + '</p>' +
      // One tier since 2026-08-22. The 1 CHF month is still a live Stripe
      // Payment Link and TIER_LINKS still carries it, so putting the
      // second button back is one line.
      '<a class="rv-btn tier" data-chf="2" href="' + TIER_LINKS["12"] + q + '">' + esc(withApprox(t("tier12"), 2)) + '</a>' +
      // Prices are quoted in CHF, but Stripe's Adaptive Pricing is always
      // on for Payment Links, so a buyer abroad is billed in their own
      // currency. Saying so keeps the CHF figure honest without the site
      // having to carry live exchange rates.
      '<p style="font-size:.85rem;margin-top:6px;">' + esc(t("localcur")) + '</p>' +
      '<p style="font-size:.85rem;margin-top:6px;">' + esc(t("paynote")) + '</p>';
    // The token baked into these hrefs dies ~30 minutes after the email
    // was verified, and the webhook resolves the buyer through it. A
    // checkout opened from a dead link can end up credited to whatever
    // address Stripe collects instead of the verified one -- so re-check
    // at click time and route back through the emailed code instead.
    Array.prototype.forEach.call(box.querySelectorAll("a.rv-btn.tier"), function (a) {
      a.addEventListener("click", function (e) {
        // Same reason as toPayment: with storage denied getToken() used
        // to be null here too, so the tier link cancelled its own click
        // and the purchase could never start. tok is the credential the
        // pay step was rendered with, and it is what the href carries.
        if (!getToken() && !tok) { e.preventDefault(); stepEmail(""); return; }
        // Stripe returns every checkout to one fixed page (after-payment
        // .html), which forwards by rotabo_last_listing -- the page of a
        // listing this buyer may have created weeks ago. Leave a note so
        // a viewer purchase comes back HERE instead.
        // data-chf is what this tier costs; after-payment.html reports it
        // as the purchase value, since Stripe's return URL carries none.
        try { localStorage.setItem("rotabo_return_to", location.pathname + location.search); localStorage.setItem("rotabo_viewer_paid_at", String(Date.now())); localStorage.setItem("rotabo_paid_value", a.getAttribute("data-chf") || "1"); localStorage.setItem("rotabo_paid_id", "viewer-" + tok.token.slice(0, 24)); } catch (err) {}
        // Aici se scria, inainte de checkout, categoria pentru care se
        // plateste, si redirectul astepta scrierea. Nu mai are ce sa scrie:
        // plata deschide toate categoriile. Link-ul navigheaza direct, si
        // dispare si intarzierea de pana la 2,5 secunde dintre click si Stripe.
      });
    });
  }
  // The listing itself is gone -- expired or deleted after the page
  // rendered. Before this step existed, reveal() treated "access valid
  // but zero rows" as "locked" and re-opened the modal, whose access
  // check succeeded and called reveal() again: an infinite loop of RPCs
  // behind a modal flashing "unlocked". Now it lands here, once.
  function stepGone() {
    if (!overlay) build();
    onUnlock = null;
    overlay.classList.add("open");
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p>' + esc(t("gone")) + '</p>';
  }
  // Transient failure while checking access, or while fetching details:
  // keep every credential and let the viewer retry, instead of treating
  // the hiccup as "unpaid". reveal() can reach this with the modal never
  // built (a viewer with a live session taps "See contact" and the
  // request fails), so it opens the modal itself rather than writing
  // into a box that is not there.
  function stepError(tok) {
    if (!overlay) build();
    overlay.classList.add("open");
    box.innerHTML =
      '<h3>' + esc(t("title")) + '</h3>' +
      '<p>' + esc(t("err_generic")) + '</p>' +
      '<button class="rv-btn solid" id="rvRetry">' + esc(t("retry")) + '</button>';
    box.querySelector("#rvRetry").addEventListener("click", function () { stepAccessCheck(tok); });
  }
  function stepSuccess() {
    box.innerHTML = '<h3>' + esc(t("title")) + '</h3><p class="rv-ok">' + esc(t("unlocked")) + '</p>';
    setTimeout(close, 1400);
  }
  // Redraw an open payment step when fx.js changes the currency or the
  // day's rates arrive after the tiers were first drawn -- otherwise the
  // modal can disagree with the hint visible on the page behind it.
  if (window.RotaboFx && window.RotaboFx.onChange) {
    window.RotaboFx.onChange(function () {
      if (overlay && overlay.classList.contains("open") && lastPayTok && box.querySelector("a.rv-btn.tier")) {
        stepPay(lastPayTok);
      }
    });
  }
  function showErr(msg) { var e = box.querySelector("#rvErr"); if (e) { e.textContent = msg; e.classList.add("show"); } }

  function post(body) {
    return fetch(FUNCTIONS_URL + "/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (res) { return res.json().then(function (json) { return { ok: res.ok, status: res.status, json: json }; }); });
  }

  // ----- public API -----
  window.RotaboViewer = {
    hasToken: function () { return !!getCredential(); },
    // Does the credential on this device hold paid access right now?
    // A transient failure answers false: the caller shows its locked
    // state, whose button re-opens the modal, and stepAccessCheck there
    // is the one place that tells "has not paid" from "could not tell".
    // Pass the category the page is showing: access is sold one category
    // at a time, so the global question would unlock a page nothing was
    // bought for. Without one, it answers "has paid for anything".
    checkAccess: function (category) {
      var tok = getCredential();
      if (!tok) return Promise.resolve(false);
      var rpc = category
        ? sb.rpc("viewer_has_access_for", { p_token: tok.token, p_category: category })
        : sb.rpc("viewer_has_access", { p_token: tok.token });
      return rpc
        .then(function (r) { return !!(r && r.data === true); })
        .catch(function () { return false; });
    },
    // browse_public answers nothing without this -- the list of who is
    // here is part of what the payment buys, not just the phone number.
    token: function () { var tok = getCredential(); return tok ? tok.token : null; },
    // Just back from a viewer checkout? Stripe's webhook can land a few
    // seconds after the browser does, and in that window "no access" is
    // really "not yet" -- so a page finding no access should hand over
    // to the modal, which polls, rather than quoting the price again.
    justPaid: function () {
      var at = 0;
      try { at = parseInt(localStorage.getItem("rotabo_viewer_paid_at") || "0", 10); } catch (e) {}
      return !!at && Date.now() - at < 3 * 60000;
    },
    open: open,
    // Reveal a listing's details. opts: {id} or {number}, onDetails(rows), onLocked()
    reveal: function (opts) {
      var tok = getCredential();
      if (!tok) { open(function () { window.RotaboViewer.reveal(opts); }); return; }
      var call = opts.id
        ? sb.rpc("get_listing_details_by_id", { p_id: opts.id, p_token: tok.token })
        : sb.rpc("get_listing_details", { p_number: opts.number, p_token: tok.token });
      call.then(function (r) {
        // A failed request is neither "locked" nor "gone": supabase-js
        // resolves with {data:null, error} on network and 5xx failures,
        // and treating that as zero rows told paying viewers a live
        // listing was "no longer available". Callers may pass onLocked to
        // react, but browse.html does not, and reporting nothing at all
        // left the "See contact" button doing visibly nothing. Say so.
        if (r && r.error) { stepError(tok); if (opts.onLocked) opts.onLocked(); return; }
        var rows = (r && r.data) || [];
        if (rows.length) { if (opts.onDetails) opts.onDetails(rows); return; }
        // Zero rows means one of two very different things: the
        // credential lacks paid access, or the listing itself vanished
        // (expired or deleted) after the page rendered. Re-opening the
        // modal for the second case used to loop forever -- the access
        // check succeeded, onUnlock re-ran reveal, zero rows again. Ask
        // which case it is, once, and only re-open for the first.
        sb.rpc("viewer_has_access", { p_token: tok.token }).then(function (a) {
          if (a && a.data === true) stepGone();
          else open(function () { window.RotaboViewer.reveal(opts); });
          if (opts.onLocked) opts.onLocked();
        }).catch(function () { if (opts.onLocked) opts.onLocked(); });
      }).catch(function () { if (opts.onLocked) opts.onLocked(); });
    }
  };
})();
