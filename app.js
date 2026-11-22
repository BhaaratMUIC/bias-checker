const feed = document.getElementById("feed");
const drawer = document.getElementById("infoDrawer");
const screenSummary = document.getElementById("screenSummary");
const screenEdit = document.getElementById("screenEdit");
const screenSources = document.getElementById("screenSources");

const editBiasSummary = document.getElementById("editBiasSummary");
const editPosterNote = document.getElementById("editPosterNote");
const diffBiasSummary = document.getElementById("diffBiasSummary");
const diffPosterNote = document.getElementById("diffPosterNote");
const editPosterHandle = document.getElementById("editPosterHandle");
const editHeaderTitle = document.getElementById("editHeaderTitle");
const editConfirmNotice = document.getElementById("editConfirmNotice");
const editActions = document.getElementById("editActions");
const saveActions = document.getElementById("saveActions");

let posts = [];
let currentPost = null;

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildDiffHtml(oldText, newText) {
  const a = oldText.trim().split(/\s+/).filter(Boolean);
  const b = newText.trim().split(/\s+/).filter(Boolean);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push(escapeHtml(a[i]));
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`<del class="diff-del">${escapeHtml(a[i])}</del>`);
      i++;
    } else {
      out.push(`<ins class="diff-add">${escapeHtml(b[j])}</ins>`);
      j++;
    }
  }
  while (i < m) out.push(`<del class="diff-del">${escapeHtml(a[i++])}</del>`);
  while (j < n) out.push(`<ins class="diff-add">${escapeHtml(b[j++])}</ins>`);

  return out.join(" ");
}

function updateDiffPreviews(forceShow = false) {
  if (!currentPost) return;

  const biasChanged = editBiasSummary.value.trim() !== currentPost.biasSummary.trim();
  diffBiasSummary.innerHTML = buildDiffHtml(currentPost.biasSummary, editBiasSummary.value);
  diffBiasSummary.classList.toggle("hidden", !forceShow && !biasChanged);

  const posterChanged = editPosterNote.value.trim() !== currentPost.posterNote.trim();
  diffPosterNote.innerHTML = buildDiffHtml(currentPost.posterNote, editPosterNote.value);
  diffPosterNote.classList.toggle("hidden", !forceShow && !posterChanged);
}

async function init() {
  const res = await fetch("posts.json");
  posts = await res.json();

  feed.innerHTML = posts.map((p) => `
    <div class="slide">
      <div class="player-wrap">
        <section class="video-card" style="background:${p.color}">
          ${p.biased ? `
            <button class="bias-indicator" data-id="${p.id}" title="Potential bias detected" aria-label="Potential bias detected">
              <svg class="warn-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span class="bias-label">Bias Alert</span>
              <span class="bias-chevron">›</span>
            </button>
          ` : ""}
          <div class="play-status">▶</div>
          <div class="video-meta">
            <div class="handle">${p.handle}</div>
            <h2 class="title">${p.title}</h2>
            <p class="desc">${p.desc}</p>
          </div>
        </section>

        <aside class="actions">
          <div class="avatar-wrap">
            <div class="avatar">${p.handle[1].toUpperCase()}</div>
            <button class="follow-badge" title="Follow">+</button>
          </div>

          <div class="action-item">
            <button class="circle-btn like-btn" data-base="${p.likes}" aria-label="Like">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <span class="action-count like-count">${p.likes}</span>
          </div>

          <div class="action-item">
            <button class="circle-btn" aria-label="Comments">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
            <span class="action-count">${p.comments}</span>
          </div>

          <div class="action-item">
            <button class="circle-btn save-btn" aria-label="Save">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
            <span class="action-count">Save</span>
          </div>

          <div class="action-item">
            <button class="circle-btn" aria-label="Share">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/>
              </svg>
            </button>
            <span class="action-count">Share</span>
          </div>
        </aside>
      </div>
    </div>
  `).join("");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const badge = entry.target.querySelector(".bias-indicator");
      if (entry.isIntersecting) {
        if (badge) {
          badge.classList.remove("compact");
          badge.classList.add("attention");
          clearTimeout(badge._timer);
          badge._timer = setTimeout(() => badge.classList.add("compact"), 2800);
          if (document.body.classList.contains("drawer-open")) {
            openBiasInfo(badge.dataset.id);
          }
        } else if (document.body.classList.contains("drawer-open")) {
          closeDrawer();
        }
      } else if (badge) {
        badge.classList.remove("attention", "compact");
      }
    });
  }, { root: feed, threshold: 0.7 });

  document.querySelectorAll(".slide").forEach((slide) => observer.observe(slide));
}

function showScreen(target) {
  screenSummary.classList.add("hidden");
  screenEdit.classList.add("hidden");
  screenSources.classList.add("hidden");
  target.classList.remove("hidden");
}

function openBiasInfo(postId) {
  const post = posts.find((p) => p.id === Number(postId));
  if (!post) return;
  currentPost = post;

  document.getElementById("biasSummaryText").textContent = post.biasSummary;
  document.getElementById("posterHandle").textContent = post.handle;
  document.getElementById("posterNoteText").textContent = post.posterNote;

  document.getElementById("sourcesList").innerHTML = post.sources.map((s) => `
    <a class="source-btn" href="${s.url}" target="_blank" rel="noopener noreferrer">
      <div>
        <div class="source-title">${s.name}</div>
        <div class="source-desc">${s.desc}</div>
      </div>
      <span class="source-pill">Open ↗</span>
    </a>
  `).join("");

  drawer.classList.remove("editing");
  showScreen(screenSummary);
  document.body.classList.add("drawer-open");
  drawer.setAttribute("aria-hidden", "false");
}

function enterEditMode() {
  if (!currentPost) return;
  editBiasSummary.value = currentPost.biasSummary;
  editPosterNote.value = currentPost.posterNote;
  editPosterHandle.textContent = currentPost.handle;
  setEditState(false);
  drawer.classList.add("editing");
  showScreen(screenEdit);
}

function setEditState(confirming) {
  editBiasSummary.classList.toggle("hidden", confirming);
  editPosterNote.classList.toggle("hidden", confirming);
  diffBiasSummary.classList.toggle("confirm-mode", confirming);
  diffPosterNote.classList.toggle("confirm-mode", confirming);
  updateDiffPreviews(confirming);

  editHeaderTitle.textContent = confirming ? "Confirm Changes" : "Edit Information";
  editConfirmNotice.classList.toggle("hidden", !confirming);
  editActions.classList.toggle("hidden", confirming);
  saveActions.classList.toggle("hidden", !confirming);
}

function closeDrawer() {
  drawer.classList.remove("editing");
  document.body.classList.remove("drawer-open");
  drawer.setAttribute("aria-hidden", "true");
}

editBiasSummary.addEventListener("input", () => updateDiffPreviews(false));
editPosterNote.addEventListener("input", () => updateDiffPreviews(false));

document.getElementById("moreInfoBtn").onclick = () => showScreen(screenSources);
document.getElementById("backToSummary").onclick = () => showScreen(screenSummary);
document.getElementById("editBtn").onclick = enterEditMode;
document.getElementById("cancelEditBtn").onclick = () => {
  drawer.classList.remove("editing");
  showScreen(screenSummary);
};
document.getElementById("finishEditBtn").onclick = () => setEditState(true);
document.getElementById("keepEditingBtn").onclick = () => setEditState(false);
document.getElementById("saveChangesBtn").onclick = () => {
  if (!currentPost) return;
  currentPost.biasSummary = editBiasSummary.value.trim();
  currentPost.posterNote = editPosterNote.value.trim();
  openBiasInfo(currentPost.id);
};

document.getElementById("closeDrawer").onclick = closeDrawer;
document.getElementById("closeDrawer2").onclick = closeDrawer;
document.getElementById("closeDrawer3").onclick = closeDrawer;

feed.addEventListener("click", (e) => {
  const badge = e.target.closest(".bias-indicator");
  if (badge) {
    openBiasInfo(badge.dataset.id);
    return;
  }

  const card = e.target.closest(".video-card");
  if (card) card.classList.toggle("paused");

  const likeBtn = e.target.closest(".like-btn");
  if (likeBtn) {
    const active = likeBtn.classList.toggle("liked");
    const count = likeBtn.nextElementSibling;
    count.textContent = Number(likeBtn.dataset.base) + (active ? 1 : 0);
  }

  const saveBtn = e.target.closest(".save-btn");
  if (saveBtn) saveBtn.classList.toggle("saved");
});

const scrollPost = (dir) => feed.scrollBy({ top: dir * window.innerHeight, behavior: "smooth" });
document.getElementById("prevBtn").onclick = () => scrollPost(-1);
document.getElementById("nextBtn").onclick = () => scrollPost(1);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
  if (document.activeElement && document.activeElement.tagName === "TEXTAREA") return;
  if (e.key === "ArrowUp") { e.preventDefault(); scrollPost(-1); }
  if (e.key === "ArrowDown") { e.preventDefault(); scrollPost(1); }
});

init();