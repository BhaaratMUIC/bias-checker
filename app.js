let posts = [];
let index = 0;
const liked = new Set();
const saved = new Set();

const $ = (id) => document.getElementById(id);

async function init() {
  const res = await fetch("posts.json");
  posts = await res.json();
  render();
}

function render() {
  const p = posts[index];
  $("videoCard").style.background = p.color;
  $("postHandle").textContent = p.handle;
  $("postTitle").textContent = p.title;
  $("postDesc").textContent = p.desc;
  $("avatarInitial").textContent = p.handle[1].toUpperCase();

  $("likeCount").textContent = p.likes + (liked.has(p.id) ? 1 : 0);
  $("likeBtn").classList.toggle("liked", liked.has(p.id));
  $("saveBtn").classList.toggle("saved", saved.has(p.id));
  $("commentCount").textContent = p.comments;
}

const step = (dir) => { index = (index + dir + posts.length) % posts.length; render(); };

$("prevBtn").onclick = () => step(-1);
$("nextBtn").onclick = () => step(1);
$("videoCard").onclick = () => $("videoCard").classList.toggle("paused");

$("likeBtn").onclick = () => {
  const id = posts[index].id;
  liked.has(id) ? liked.delete(id) : liked.add(id);
  render();
};

$("saveBtn").onclick = () => {
  const id = posts[index].id;
  saved.has(id) ? saved.delete(id) : saved.add(id);
  render();
};

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") step(-1);
  if (e.key === "ArrowDown") step(1);
});

init();