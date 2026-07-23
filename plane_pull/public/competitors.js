const elements = {
  status: document.querySelector("#competitorsStatus"),
  teamCount: document.querySelector("#teamCount"),
  totalRaised: document.querySelector("#totalRaised"),
  healthyRank: document.querySelector("#healthyRank"),
  summary: document.querySelector("#competitorsSummary"),
  body: document.querySelector("#competitorsBody"),
  sourceLink: document.querySelector("#sourceLink")
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
}

function money(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function memberLabel(count) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

function initials(name) {
  const parts = String(name)
    .replaceAll("&", " ")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (!parts.length) {
    return "T";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logoFallback(team) {
  const fallback = document.createElement("span");
  fallback.className = "team-initials";
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = initials(team.name);
  return fallback;
}

function fillLogoSlot(slot, team) {
  if (!team.logo) {
    slot.replaceChildren(logoFallback(team));
    return;
  }

  const image = new Image();
  image.className = "team-logo";
  image.src = team.logo;
  image.alt = `${team.name} logo`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    slot.replaceChildren(logoFallback(team));
  }, { once: true });
  slot.replaceChildren(image);
}

function rowForTeam(team) {
  const progress = Math.max(0, Number(team.percentToGoal) || 0);
  const visibleProgress = Math.min(progress, 100);
  const teamUrl = team.id === "832142" ? "/donation-warning.html" : team.url;
  const opensNewTab = team.id === "832142" ? "" : ' target="_blank" rel="noreferrer"';
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><span class="rank-badge">#${team.rank}</span></td>
    <td>
      <div class="team-cell">
        <span class="team-logo-slot"></span>
        <span>
          <strong>${escapeHtml(team.name)}</strong>
          <em>${escapeHtml(memberLabel(team.members))}</em>
        </span>
      </div>
    </td>
    <td class="amount">${money(team.raised)}</td>
    <td>
      <div class="progress-cell">
        <span>${money(team.raised)} of ${money(team.goal)}</span>
        <div class="progress-track" role="img" aria-label="${percentFormatter.format(progress)} percent to goal">
          <span class="progress-fill" style="width: ${visibleProgress}%"></span>
        </div>
        <em>${percentFormatter.format(progress)}%</em>
      </div>
    </td>
    <td class="amount">${team.members}</td>
    <td class="actions-col">
      <a class="small-link competitor-link" href="${escapeHtml(teamUrl)}"${opensNewTab}>View</a>
    </td>
  `;
  fillLogoSlot(row.querySelector(".team-logo-slot"), team);
  return row;
}

function render(payload) {
  const teams = payload.teams || [];
  const raisedTotal = teams.reduce((sum, team) => sum + (Number(team.raised) || 0), 0);
  const healthyHikers = teams.find((team) => team.id === "832142" || team.name === "Healthy Hikers");

  elements.teamCount.textContent = String(teams.length);
  elements.totalRaised.textContent = money(raisedTotal);
  elements.healthyRank.textContent = healthyHikers ? `#${healthyHikers.rank}` : "--";
  elements.summary.textContent = `${teams.length} ${teams.length === 1 ? "team" : "teams"}`;

  if (payload.source) {
    elements.sourceLink.href = payload.source;
  }

  elements.body.replaceChildren(...teams.map(rowForTeam));
}

async function loadCompetitors() {
  setLoading(true);
  try {
    const response = await fetch("/data/competitors.json");
    if (!response.ok) {
      throw new Error("Competitor list could not be loaded.");
    }
    const payload = await response.json();
    render(payload);
    setStatus("Competitor list loaded.");
  } catch (error) {
    elements.body.replaceChildren();
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

loadCompetitors();
