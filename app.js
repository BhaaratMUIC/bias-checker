const feed = document.getElementById("feed");

async function init() {
  const res = await fetch("posts.json");
  const posts = await res.json();

  feed.innerHTML = posts.map((p) => `
    <div class="slide">
      <div class="player-wrap">
        <section class="video-card" style="background:${p.color}">
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
}

// Click handling for pause/play, like, and save
feed.addEventListener("click", (e) => {
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

// Smooth scroll via buttons and keyboard arrows
const scrollPost = (dir) => feed.scrollBy({ top: dir * window.innerHeight, behavior: "smooth" });
document.getElementById("prevBtn").onclick = () => scrollPost(-1);
document.getElementById("nextBtn").onclick = () => scrollPost(1);

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); scrollPost(-1); }
  if (e.key === "ArrowDown") { e.preventDefault(); scrollPost(1); }
});

init();