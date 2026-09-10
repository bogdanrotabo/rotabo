/*
 * selfies.lol, in the browser.
 *
 * Everything goes through /api on this domain. There is no Supabase client
 * here and no key of any kind: the Worker holds the only one there is.
 *
 * The picture is resized here rather than on the way in. Two reasons, and
 * the second is the important one: a phone photo is four megabytes of
 * detail nobody looking at a wall will ever see, and re-drawing it through
 * a canvas leaves the EXIF behind -- which is where the camera writes down
 * where you were standing.
 */

const MAX_EDGE = 1440;
const QUALITY = 0.85;

const $ = (id) => document.getElementById(id);

const state = {
  me: { signed_in: false, handle: null, mine: [], liked: [] },
  next: null,
  loading: false,
  file: null,
  dims: null,
};

/* ------------------------------------------------------------------ boot */

document.addEventListener("DOMContentLoaded", () => {
  wireComposer();
  wireHandle();

  $("moreBtn").addEventListener("click", () => loadFeed());

  loadMe();
  loadFeed(true);

  if (location.hash === "#post") openComposer();
});

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `http_${res.status}`), { code: body.error, status: res.status });
  return body;
}

async function loadMe() {
  try {
    state.me = await api("/api/me");
  } catch (err) {
    return;
  }
  const btn = $("whoBtn");
  if (state.me.signed_in) {
    btn.hidden = false;
    btn.textContent = state.me.handle ? "@" + state.me.handle : "Pick a name";
    btn.onclick = openHandle;
  }
  paintOwnership();
}

/* ------------------------------------------------------------------ wall */

async function loadFeed(first = false) {
  if (state.loading) return;
  state.loading = true;
  $("moreBtn").disabled = true;

  try {
    const q = state.next ? `?before=${encodeURIComponent(state.next)}` : "";
    const data = await api(`/api/feed${q}`);

    if (first) $("loading").remove();
    if (first && !data.selfies.length) {
      $("wall").insertAdjacentHTML(
        "beforeend",
        `<p class="center">Nothing on the wall yet. Be the first.</p>`
      );
    }

    for (const s of data.selfies) $("wall").insertAdjacentElement("beforeend", card(s));
    state.next = data.next;
    $("moreWrap").hidden = !data.next;
    paintOwnership();
  } catch (err) {
    const el = $("loading");
    if (el) el.textContent = "The wall would not load. Try again in a moment.";
  } finally {
    state.loading = false;
    $("moreBtn").disabled = false;
  }
}

function card(s) {
  const el = document.createElement("article");
  el.className = "card";
  el.dataset.id = s.id;

  const ratio = s.width && s.height ? ` width="${s.width}" height="${s.height}"` : "";
  const alt = s.caption ? escapeHtml(s.caption) : "A selfie posted on selfies.lol";

  el.innerHTML = `
    <a class="shot" href="/s/${s.id}">
      <img src="${s.src}" alt="${alt}" loading="lazy" decoding="async"${ratio}>
    </a>
    ${s.caption ? `<p class="cap">${escapeHtml(s.caption)}</p>` : ""}
    <div class="meta">
      <span class="who">${s.handle ? "@" + escapeHtml(s.handle) : "anonymous"}</span>
      <button class="icon-btn like" title="Like">♥ <span class="n">${s.likes}</span></button>
      <button class="icon-btn flag" title="Report">⚑</button>
      <button class="icon-btn mine" title="Take mine down" hidden>✕</button>
    </div>`;

  el.querySelector(".like").addEventListener("click", () => toggleLike(el, s.id));
  el.querySelector(".flag").addEventListener("click", () => flag(el, s.id));
  el.querySelector(".mine").addEventListener("click", () => takeDown(el, s.id));
  return el;
}

/* Which of the cards on screen are mine, and which I have already liked.
   Runs again after every page of the feed and after /api/me answers. */
function paintOwnership() {
  const mine = new Set(state.me.mine || []);
  const liked = new Set(state.me.liked || []);
  for (const el of document.querySelectorAll(".card")) {
    const id = el.dataset.id;
    el.querySelector(".mine").hidden = !mine.has(id);
    el.querySelector(".like").classList.toggle("on", liked.has(id));
  }
}

async function toggleLike(el, id) {
  const btn = el.querySelector(".like");
  const on = !btn.classList.contains("on");
  btn.classList.toggle("on", on); // answer the tap now, correct it if the server disagrees

  try {
    const out = await api("/api/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, on }),
    });
    btn.querySelector(".n").textContent = out.like_count;
    const liked = new Set(state.me.liked || []);
    on ? liked.add(id) : liked.delete(id);
    state.me.liked = [...liked];
  } catch (err) {
    btn.classList.toggle("on", !on);
  }
}

async function flag(el, id) {
  if (!confirm("Report this selfie? Three reports take it off the wall.")) return;
  try {
    await api("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    el.querySelector(".flag").classList.add("on");
    el.querySelector(".flag").title = "Reported";
  } catch (err) {
    /* Reporting twice is once; nothing to say. */
  }
}

async function takeDown(el, id) {
  if (!confirm("Take your selfie off the wall? This cannot be undone.")) return;
  try {
    await api("/api/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    el.remove();
    state.me.mine = (state.me.mine || []).filter((x) => x !== id);
  } catch (err) {
    alert("That did not work. Try again in a moment.");
  }
}

/* -------------------------------------------------------------- composer */

function wireComposer() {
  const dlg = $("composer");
  $("postBtn").addEventListener("click", openComposer);
  $("cancelBtn").addEventListener("click", () => dlg.close());
  $("photo").addEventListener("change", (e) => choose(e.target.files[0]));
  $("sendBtn").addEventListener("click", send);

  const drop = $("drop");
  drop.addEventListener("dragover", (e) => e.preventDefault());
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]);
  });
}

function openComposer() {
  $("composeErr").textContent = "";
  $("composer").showModal();
}

async function choose(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    $("composeErr").textContent = "That is not a picture.";
    return;
  }

  $("composeErr").textContent = "";
  $("dropText").textContent = "Working on it…";

  try {
    const { blob, width, height } = await shrink(file);
    state.file = blob;
    state.dims = { width, height };

    const preview = $("preview");
    preview.src = URL.createObjectURL(blob);
    preview.hidden = false;
    $("dropText").textContent = "";
    $("sendBtn").disabled = false;
  } catch (err) {
    $("dropText").textContent = "Tap to take one, or choose a picture";
    $("composeErr").textContent = "That picture could not be read.";
  }
}

/* Down to MAX_EDGE on the long side, as JPEG. The canvas round-trip is what
   drops the EXIF: nothing but pixels comes out the other side. */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, width, height }) : reject(new Error("no_blob"))),
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not_an_image"));
    };
    img.src = url;
  });
}

const SAYS = {
  slow_down: "That is a lot of selfies in one hour. Try again later.",
  too_big: "That picture is too large even after resizing.",
  wrong_type: "That kind of file cannot go on the wall.",
  blocked: "This browser cannot post here.",
  no_photo: "Choose a picture first.",
};

async function send() {
  if (!state.file) return;
  $("sendBtn").disabled = true;
  $("composeErr").textContent = "";
  $("composeErr").classList.remove("ok");

  const body = new FormData();
  body.append("photo", state.file, "selfie.jpg");
  body.append("caption", $("caption").value.trim());
  body.append("width", state.dims.width);
  body.append("height", state.dims.height);

  try {
    const out = await api("/api/post", { method: "POST", body });

    const wall = $("wall");
    const empty = wall.querySelector(".center");
    if (empty) empty.remove();
    wall.insertAdjacentElement("afterbegin", card(out.selfie));

    state.me.signed_in = true;
    state.me.mine = [out.selfie.id, ...(state.me.mine || [])];
    paintOwnership();
    if ($("whoBtn").hidden) {
      $("whoBtn").hidden = false;
      $("whoBtn").textContent = state.me.handle ? "@" + state.me.handle : "Pick a name";
      $("whoBtn").onclick = openHandle;
    }

    resetComposer();
    $("composer").close();
  } catch (err) {
    $("composeErr").textContent = SAYS[err.code] || "That did not go through. Try again.";
    $("sendBtn").disabled = false;
  }
}

function resetComposer() {
  state.file = null;
  state.dims = null;
  $("photo").value = "";
  $("caption").value = "";
  $("preview").hidden = true;
  $("preview").removeAttribute("src");
  $("dropText").textContent = "Tap to take one, or choose a picture";
  $("sendBtn").disabled = true;
}

/* ---------------------------------------------------------------- handle */

function wireHandle() {
  $("handleCancel").addEventListener("click", () => $("handleSheet").close());
  $("handleSave").addEventListener("click", saveHandle);
}

function openHandle() {
  $("handleErr").textContent = "";
  $("handleInput").value = state.me.handle || "";
  $("handleSheet").showModal();
}

async function saveHandle() {
  const wanted = $("handleInput").value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(wanted)) {
    $("handleErr").textContent = "Letters, digits and underscores, 3 to 20.";
    return;
  }

  try {
    const out = await api("/api/handle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: wanted }),
    });
    state.me.handle = out.handle;
    $("whoBtn").textContent = "@" + out.handle;
    $("whoBtn").hidden = false;
    $("handleSheet").close();
  } catch (err) {
    $("handleErr").textContent = err.code === "taken" ? "Somebody has that one." : "That name will not do.";
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
