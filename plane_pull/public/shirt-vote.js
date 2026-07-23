const colors = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#000000" },
  { name: "Graphite", hex: "#77767c" },
  { name: "Navy", hex: "#3c4255" },
  { name: "Deep Royal", hex: "#3f4377" },
  { name: "Light Blue", hex: "#aac2de" },
  { name: "Wow Pink", hex: "#c24d78" },
  { name: "Deep Red", hex: "#c3153a" },
  { name: "Safety Orange", hex: "#e45e2a" },
  { name: "Safety Green", hex: "#eff73c" },
  { name: "Deep Forest", hex: "#2e4233" }
];

const colorByName = new Map(colors.map((color) => [color.name, color]));
const elements = {
  resultsGrid: document.querySelector("#resultsGrid"),
  resultsStatus: document.querySelector("#resultsStatus"),
  voteTotal: document.querySelector("#voteTotal"),
  viewButtons: [...document.querySelectorAll("[data-view]")],
  previewFigures: [...document.querySelectorAll("[data-side]")]
};

function setMobileView(side) {
  for (const button of elements.viewButtons) {
    const active = button.dataset.view === side;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const figure of elements.previewFigures) {
    figure.classList.toggle("active", figure.dataset.side === side);
  }
}

function renderResults(results, totalVotes) {
  const maxVotes = Math.max(1, ...results.map((item) => Number(item.votes)));
  const sorted = [...results].sort((a, b) => {
    const difference = Number(b.votes) - Number(a.votes);
    return difference || colors.findIndex((color) => color.name === a.color) - colors.findIndex((color) => color.name === b.color);
  });

  const rows = sorted.map((item) => {
    const color = colorByName.get(item.color);
    const votes = Number(item.votes) || 0;
    const percentage = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `
      <span class="result-label">
        <span class="result-swatch" style="--swatch:${color?.hex || "#d9dfda"}"></span>
        <span>${escapeHtml(item.color)}</span>
      </span>
      <span class="result-track" aria-hidden="true">
        <span class="result-fill" style="--result-width:${(votes / maxVotes) * 100}%;--result-min:${votes ? "5px" : "0"};--bar:${color?.hex || "#0b3d26"}"></span>
      </span>
      <span class="result-count">${votes} · ${percentage}%</span>
    `;
    return row;
  });

  elements.resultsGrid.replaceChildren(...rows);
  elements.voteTotal.textContent = `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}`;
  elements.resultsStatus.hidden = true;
}

async function loadResults() {
  try {
    const response = await fetch("/api/shirt-votes", { headers: { accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load final results");
    renderResults(payload.results || [], Number(payload.totalVotes) || 0);
  } catch (error) {
    elements.resultsStatus.textContent = error.message || "Could not load final results";
    elements.resultsStatus.classList.add("error");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

setMobileView("front");
elements.viewButtons.forEach((button) => {
  button.addEventListener("click", () => setMobileView(button.dataset.view));
});
loadResults();
