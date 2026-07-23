const designs = [
  {
    option: "A",
    front: "/assets/design-vote/design-a-front.webp",
    back: "/assets/design-vote/design-a-back.webp",
    source: "https://www.customink.com/designs/plane-pull-vote-a/kcd0-00d2-x7yr/share"
  },
  {
    option: "B",
    front: "/assets/design-vote/design-b-front.webp",
    back: "/assets/design-vote/design-b-back.webp",
    source: "https://www.customink.com/designs/plane-pull-vote-b/kcd0-00d2-x884/share"
  },
  {
    option: "C",
    front: "/assets/design-vote/design-c-front.webp",
    back: "/assets/design-vote/design-c-back.webp",
    source: "https://www.customink.com/designs/plane-pull-vote-c/kcd0-00d2-x87u/share"
  },
  {
    option: "D",
    front: "/assets/design-vote/design-d-front.webp",
    back: "/assets/design-vote/design-d-back.webp",
    source: "https://www.customink.com/designs/plane-pull-vote-d/kcd0-00d2-x88t/share"
  }
];

const designOptions = designs.map((design) => design.option);
const elements = {
  designGrid: document.querySelector("#designGrid"),
  resultsGrid: document.querySelector("#resultsGrid"),
  resultsStatus: document.querySelector("#resultsStatus"),
  voteTotal: document.querySelector("#voteTotal")
};

function renderDesigns() {
  const cards = designs.map((design) => {
    const article = document.createElement("article");
    article.className = "design-card";
    article.dataset.option = design.option;
    article.innerHTML = `
      <div class="option-header">
        <span class="option-letter" aria-hidden="true">${design.option}</span>
        <span>
          <strong>Option ${design.option}</strong>
          <small>Front and back</small>
        </span>
      </div>
      <div class="design-views">
        <div class="design-view">
          <span class="view-label">Front</span>
          <img src="${design.front}" alt="Option ${design.option} shirt, front view" width="513" height="490">
        </div>
        <div class="design-view">
          <span class="view-label">Back</span>
          <img src="${design.back}" alt="Option ${design.option} shirt, back view" width="513" height="490">
        </div>
      </div>
      <a class="source-link" href="${design.source}" target="_blank" rel="noreferrer">Open Option ${design.option} in Custom Ink</a>
    `;
    return article;
  });

  elements.designGrid.replaceChildren(...cards);
}

function renderResults(results, totalVotes) {
  const normalized = designOptions.map((option) => {
    const result = results.find((item) => item.option === option);
    return { option, votes: Number(result?.votes) || 0 };
  });
  const maxVotes = Math.max(1, ...normalized.map((item) => item.votes));

  const rows = normalized.map((item) => {
    const percentage = totalVotes ? Math.round((item.votes / totalVotes) * 100) : 0;
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `
      <span class="result-option">${item.option}</span>
      <span class="result-name">Option ${item.option}</span>
      <span class="result-track" aria-hidden="true">
        <span class="result-fill" style="--result-width:${(item.votes / maxVotes) * 100}%;--result-min:${item.votes ? "6px" : "0px"}"></span>
      </span>
      <span class="result-count">${item.votes} · ${percentage}%</span>
    `;
    return row;
  });

  elements.resultsGrid.replaceChildren(...rows);
  elements.voteTotal.textContent = `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}`;
  elements.resultsStatus.hidden = true;
}

async function loadResults() {
  try {
    const response = await fetch("/api/design-votes", { headers: { accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load final results");
    renderResults(payload.results || [], Number(payload.totalVotes) || 0);
  } catch (error) {
    elements.resultsStatus.textContent = error.message || "Could not load final results";
    elements.resultsStatus.classList.add("error");
  }
}

renderDesigns();
loadResults();
