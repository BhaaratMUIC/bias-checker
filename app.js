const feed = document.getElementById("feed");
const infoDrawer = document.getElementById("infoDrawer");
const rateDrawer = document.getElementById("rateDrawer");
const screenSummary = document.getElementById("screenSummary");
const screenEdit = document.getElementById("screenEdit");
const screenSources = document.getElementById("screenSources");
const screenRate = document.getElementById("screenRate");
const settingsOverlay = document.getElementById("settingsOverlay");

const editBiasSummary = document.getElementById("editBiasSummary");
const editPosterNote = document.getElementById("editPosterNote");
const diffBiasSummary = document.getElementById("diffBiasSummary");
const diffPosterNote = document.getElementById("diffPosterNote");
const editPosterHandle = document.getElementById("editPosterHandle");
const editHeaderTitle = document.getElementById("editHeaderTitle");
const editConfirmNotice = document.getElementById("editConfirmNotice");
const editActions = document.getElementById("editActions");
const saveActions = document.getElementById("saveActions");

const rateBiasedBtn = document.getElementById("rateBiasedBtn");
const rateUnbiasedBtn = document.getElementById("rateUnbiasedBtn");
const reasonSection = document.getElementById("reasonSection");
const reasonTags = document.getElementById("reasonTags");
const evidenceSection = document.getElementById("evidenceSection");
const rateNoteInput = document.getElementById("rateNoteInput");
const rateSourceInput = document.getElementById("rateSourceInput");
const rateFeedback = document.getElementById("rateFeedback");
const submitRateBtn = document.getElementById("submitRateBtn");

const toggleVerified = document.getElementById("toggleVerified");
const toggleCitedOnly = document.getElementById("toggleCitedOnly");

const REASONS = {
  biased: ["Missing Context", "One-Sided Framing", "Unverified Claim", "Emotional Language"],
  unbiased: ["Cites Credible Sources", "Balanced Perspective", "Factual Overview", "Clear Context"]
};

let posts = [];
let currentPost = null;
let currentSlideId = null;
let selectedVerdict = null;
let selectedReason = null;

const settings = {
  sensitivity: 50,
  showVerified: true,
  citedOnly: false
};

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getPostStatus(post) {
  if (post.userVerdict === "unbiased") {
    return { showBias: false, showVerified: settings.showVerified };
  }
  if (post.userVerdict === "biased") {
    const hasSources = post.sources.length > 0;
    return { showBias: !settings.citedOnly || hasSources, showVerified: false };
  }
  const meetsScore = post.biasScore >= settings.sensitivity;
  const meetsSourceRule = !settings.citedOnly || post.sources.length > 0;
  const showBias = meetsScore && meetsSourceRule;
  const showVerified = !showBias && post.verifiedUnbiased && settings.showVerified;
  return { showBias, showVerified };
}

function buildBadgeHtml(post) {
  const { showBias, showVerified } = getPostStatus(post);
  if (showBias) {
    return `
      <button class="bias-indicator" data-id="${post.id}" title="Potential bias detected" aria-label="Potential bias detected">
        <svg class="warn-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span class="bias-label">Bias Alert</span>
        <span class="bias-chevron">›</span>
      </button>
    `;
  }
  if (showVerified) {
    return `
      <button class="verified-indicator" data-id="${post.id}" title="Verified unbiased post" aria-label="Verified unbiased post">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>Verified Unbiased</span>
      </button>
    `;
  }
  return "";
}

function updateAllBadges() {
  posts.forEach((p) => {
    const slot = document.querySelector(`.badge-slot[data-id="${p.id}"]`);
    if (slot) slot.innerHTML = buildBadgeHtml(p);

    const rateBtn = document.querySelector(`.rate-btn[data-id="${p.id}"]`);
    if (rateBtn) {
      rateBtn.classList.toggle("rated-biased", p.userVerdict === "biased");
      rateBtn.classList.toggle("rated-unbiased", p.userVerdict === "unbiased");
    }
  });
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
    <div class="slide" data-id="${p.id}">
      <div class="player-wrap">
        <section class="video-card" style="background:${p.color}">
          <div class="badge-slot" data-id="${p.id}">${buildBadgeHtml(p)}</div>
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
            <button class="circle-btn rate-btn" data-id="${p.id}" title="Rate post credibility" aria-label="Rate post credibility">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </button>
            <span class="action-count">Rate</span>
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
      const slideId = Number(entry.target.dataset.id);
      const badge = entry.target.querySelector(".bias-indicator");
      if (entry.isIntersecting) {
        currentSlideId = slideId;
        if (badge) {
          badge.classList.remove("compact");
          badge.classList.add("attention");
          clearTimeout(badge._timer);
          badge._timer = setTimeout(() => badge.classList.add("compact"), 2800);
        }
        if (document.body.classList.contains("rate-open")) {
          openRateScreen(slideId);
        } else if (document.body.classList.contains("info-open")) {
          if (badge) {
            openBiasInfo(slideId);
          } else {
            closeDrawers();
          }
        }
      } else if (badge) {
        badge.classList.remove("attention", "compact");
      }
    });
  }, { root: feed, threshold: 0.7 });

  document.querySelectorAll(".slide").forEach((slide) => observer.observe(slide));
}

function animateScreen(target) {
  target.classList.remove("screen-animate");
  void target.offsetWidth;
  target.classList.add("screen-animate");
}

function showInfoScreen(target) {
  [screenSummary, screenEdit, screenSources].forEach((s) => {
    s.classList.add("hidden");
    s.classList.remove("screen-animate");
  });
  target.classList.remove("hidden");
  animateScreen(target);
}

function closeDrawers() {
  infoDrawer.classList.remove("editing");
  document.body.classList.remove("info-open", "rate-open");
  infoDrawer.setAttribute("aria-hidden", "true");
  rateDrawer.setAttribute("aria-hidden", "true");
}

function openBiasInfo(postId) {
  const post = posts.find((p) => p.id === Number(postId));
  if (!post) return;
  currentPost = post;

  document.getElementById("biasSummaryText").textContent = post.biasSummary || "No bias summary added yet.";
  document.getElementById("posterHandle").textContent = post.handle;
  document.getElementById("posterNoteText").textContent = post.posterNote || "No poster background available yet.";

  const sourcesList = document.getElementById("sourcesList");
  if (post.sources.length) {
    sourcesList.innerHTML = post.sources.map((s) => `
      <a class="source-btn" href="${s.url}" target="_blank" rel="noopener noreferrer">
        <div class="source-info">
          <div class="source-title">${escapeHtml(s.name)}</div>
          <div class="source-desc">${escapeHtml(s.desc)}</div>
          <div class="source-domain">${escapeHtml(getDomain(s.url))}</div>
        </div>
        <span class="source-pill">
          Open
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </span>
      </a>
    `).join("");
  } else {
    sourcesList.innerHTML = `<p class="sources-intro">No independent sources linked yet. Use the Rate menu to add a supporting source.</p>`;
  }

  infoDrawer.classList.remove("editing");
  document.body.classList.remove("rate-open");
  rateDrawer.setAttribute("aria-hidden", "true");
  showInfoScreen(screenSummary);
  document.body.classList.add("info-open");
  infoDrawer.setAttribute("aria-hidden", "false");
}

function enterEditMode() {
  if (!currentPost) return;
  editBiasSummary.value = currentPost.biasSummary;
  editPosterNote.value = currentPost.posterNote;
  editPosterHandle.textContent = currentPost.handle;
  setEditState(false);
  infoDrawer.classList.add("editing");
  showInfoScreen(screenEdit);
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

function renderReasonTags(verdict) {
  reasonTags.innerHTML = REASONS[verdict].map((tag) => `
    <button type="button" class="tag-btn${selectedReason === tag ? " selected" : ""}" data-tag="${tag}">${tag}</button>
  `).join("");
}

function selectRateVerdict(verdict) {
  selectedVerdict = verdict;
  selectedReason = null;
  rateBiasedBtn.classList.toggle("selected", verdict === "biased");
  rateUnbiasedBtn.classList.toggle("selected", verdict === "unbiased");
  reasonSection.classList.remove("hidden");
  evidenceSection.classList.remove("hidden");
  renderReasonTags(verdict);
  submitRateBtn.disabled = false;
}

function openRateScreen(postId) {
  const post = posts.find((p) => p.id === Number(postId));
  if (!post) return;
  currentPost = post;

  document.getElementById("ratePostMeta").textContent = `Evaluate "${post.title}" by ${post.handle}. Ratings help others identify reliable information.`;
  selectedVerdict = post.userVerdict || null;
  selectedReason = post.userReason || null;
  rateNoteInput.value = "";
  rateSourceInput.value = "";
  rateFeedback.classList.add("hidden");

  rateBiasedBtn.classList.toggle("selected", selectedVerdict === "biased");
  rateUnbiasedBtn.classList.toggle("selected", selectedVerdict === "unbiased");

  if (selectedVerdict) {
    reasonSection.classList.remove("hidden");
    evidenceSection.classList.remove("hidden");
    renderReasonTags(selectedVerdict);
    submitRateBtn.disabled = false;
  } else {
    reasonSection.classList.add("hidden");
    evidenceSection.classList.add("hidden");
    submitRateBtn.disabled = true;
  }

  infoDrawer.classList.remove("editing");
  document.body.classList.remove("info-open");
  infoDrawer.setAttribute("aria-hidden", "true");
  animateScreen(screenRate);
  document.body.classList.add("rate-open");
  rateDrawer.setAttribute("aria-hidden", "false");
}

function openSettingsModal() {
  const radio = document.querySelector(`input[name="sensitivity"][value="${settings.sensitivity}"]`);
  if (radio) radio.checked = true;
  toggleVerified.checked = settings.showVerified;
  toggleCitedOnly.checked = settings.citedOnly;

  settingsOverlay.classList.remove("hidden");
  settingsOverlay.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  settingsOverlay.classList.add("hidden");
  settingsOverlay.setAttribute("aria-hidden", "true");
}

editBiasSummary.addEventListener("input", () => updateDiffPreviews(false));
editPosterNote.addEventListener("input", () => updateDiffPreviews(false));

document.getElementById("moreInfoBtn").onclick = () => showInfoScreen(screenSources);
document.getElementById("backToSummary").onclick = () => showInfoScreen(screenSummary);
document.getElementById("editBtn").onclick = enterEditMode;
document.getElementById("cancelEditBtn").onclick = () => {
  infoDrawer.classList.remove("editing");
  showInfoScreen(screenSummary);
};
document.getElementById("finishEditBtn").onclick = () => setEditState(true);
document.getElementById("keepEditingBtn").onclick = () => setEditState(false);
document.getElementById("saveChangesBtn").onclick = () => {
  if (!currentPost) return;
  currentPost.biasSummary = editBiasSummary.value.trim();
  currentPost.posterNote = editPosterNote.value.trim();
  openBiasInfo(currentPost.id);
};

rateBiasedBtn.onclick = () => selectRateVerdict("biased");
rateUnbiasedBtn.onclick = () => selectRateVerdict("unbiased");
reasonTags.addEventListener("click", (e) => {
  const btn = e.target.closest(".tag-btn");
  if (!btn) return;
  selectedReason = btn.dataset.tag;
  renderReasonTags(selectedVerdict);
});

document.getElementById("cancelRateBtn").onclick = closeDrawers;
submitRateBtn.onclick = () => {
  if (!currentPost || !selectedVerdict) return;

  currentPost.userVerdict = selectedVerdict;
  currentPost.userReason = selectedReason;

  const note = rateNoteInput.value.trim();
  const sourceUrl = rateSourceInput.value.trim();

  if (selectedVerdict === "biased") {
    currentPost.verifiedUnbiased = false;
    if (note) {
      currentPost.biasSummary = note;
    } else if (selectedReason && !currentPost.biasSummary) {
      currentPost.biasSummary = `Community flagged for: ${selectedReason}.`;
    }
  } else {
    currentPost.verifiedUnbiased = true;
  }

  if (sourceUrl) {
    currentPost.sources.push({
      name: "Community Submitted Source",
      desc: selectedReason ? `Submitted for: ${selectedReason}` : "User-provided reference",
      url: sourceUrl
    });
  }

  updateAllBadges();
  rateFeedback.textContent = selectedVerdict === "biased"
    ? "Rating recorded — post marked as potentially biased."
    : "Rating recorded — post marked as factual and unbiased.";
  rateFeedback.classList.remove("hidden");
};

document.getElementById("settingsBtn").onclick = openSettingsModal;
document.getElementById("closeSettingsBtn").onclick = closeSettingsModal;
document.getElementById("cancelSettingsBtn").onclick = closeSettingsModal;
settingsOverlay.onclick = (e) => {
  if (e.target === settingsOverlay) closeSettingsModal();
};
document.getElementById("saveSettingsBtn").onclick = () => {
  const checked = document.querySelector('input[name="sensitivity"]:checked');
  if (checked) settings.sensitivity = Number(checked.value);
  settings.showVerified = toggleVerified.checked;
  settings.citedOnly = toggleCitedOnly.checked;
  updateAllBadges();
  closeSettingsModal();
};

["closeDrawer", "closeDrawer2", "closeDrawer3", "closeRateDrawer"].forEach((id) => {
  document.getElementById(id).onclick = closeDrawers;
});

feed.addEventListener("click", (e) => {
  const badge = e.target.closest(".bias-indicator");
  if (badge) {
    openBiasInfo(badge.dataset.id);
    return;
  }

  const verified = e.target.closest(".verified-indicator");
  if (verified) {
    openRateScreen(verified.dataset.id);
    return;
  }

  const rateBtn = e.target.closest(".rate-btn");
  if (rateBtn) {
    openRateScreen(rateBtn.dataset.id);
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
  if (e.key === "Escape") {
    if (!settingsOverlay.classList.contains("hidden")) {
      closeSettingsModal();
    } else {
      closeDrawers();
    }
    return;
  }
  if (!settingsOverlay.classList.contains("hidden")) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT") return;
  if (e.key === "ArrowUp") { e.preventDefault(); scrollPost(-1); }
  if (e.key === "ArrowDown") { e.preventDefault(); scrollPost(1); }
});

let touchStartX = 0;
let touchStartY = 0;

function onTouchStart(e) {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}

function getHorizontalSwipe(e) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return null;
  return dx > 0 ? "right" : "left";
}

feed.addEventListener("touchstart", onTouchStart, { passive: true });
feed.addEventListener("touchend", (e) => {
  if (!settingsOverlay.classList.contains("hidden") || !currentSlideId) return;
  const dir = getHorizontalSwipe(e);
  if (!dir) return;

  if (dir === "left") {
    const activeSlide = feed.querySelector(`.slide[data-id="${currentSlideId}"]`);
    if (activeSlide && activeSlide.querySelector(".bias-indicator")) {
      openBiasInfo(currentSlideId);
    }
  } else if (dir === "right") {
    openRateScreen(currentSlideId);
  }
}, { passive: true });

infoDrawer.addEventListener("touchstart", onTouchStart, { passive: true });
infoDrawer.addEventListener("touchend", (e) => {
  if (getHorizontalSwipe(e) === "right") closeDrawers();
}, { passive: true });

rateDrawer.addEventListener("touchstart", onTouchStart, { passive: true });
rateDrawer.addEventListener("touchend", (e) => {
  if (getHorizontalSwipe(e) === "left") closeDrawers();
}, { passive: true });

init();