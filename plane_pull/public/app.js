const state = {
  members: [],
  donors: [],
  donorTotal: null,
  adminPassword: "",
  unlocked: false
};

const elements = {
  status: document.querySelector("#status"),
  pullerCount: document.querySelector("#pullerCount"),
  donationTotal: document.querySelector("#donationTotal"),
  pullersSummary: document.querySelector("#pullersSummary"),
  backupSummary: document.querySelector("#backupSummary"),
  donorsSummary: document.querySelector("#donorsSummary"),
  donorsStatus: document.querySelector("#donorsStatus"),
  donorsBody: document.querySelector("#donorsBody"),
  donorsUpdated: document.querySelector("#donorsUpdated"),
  donorsSource: document.querySelector("#donorsSource"),
  refreshDonors: document.querySelector("#refreshDonors"),
  pullersBody: document.querySelector("#pullersBody"),
  backupBody: document.querySelector("#backupBody"),
  adminBody: document.querySelector("#adminBody"),
  adminToggle: document.querySelector("#adminToggle"),
  adminPanel: document.querySelector("#adminPanel"),
  passwordForm: document.querySelector("#passwordForm"),
  adminPassword: document.querySelector("#adminPassword"),
  editor: document.querySelector("#editor"),
  memberForm: document.querySelector("#memberForm"),
  memberId: document.querySelector("#memberId"),
  memberName: document.querySelector("#memberName"),
  memberRole: document.querySelector("#memberRole"),
  memberDonation: document.querySelector("#memberDonation"),
  memberComment: document.querySelector("#memberComment"),
  resetForm: document.querySelector("#resetForm")
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value || 0);
}

function exactMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function displayDate(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setDonorsStatus(message, isError = false) {
  elements.donorsStatus.textContent = message;
  elements.donorsStatus.classList.toggle("error", isError);
}

function byRole(role) {
  return state.members.filter((member) => member.role === role);
}

function summarizeLabel(count) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

function publicRow(member) {
  const row = document.createElement("tr");
  row.innerHTML = `<td>${escapeHtml(member.name)}</td>`;
  return row;
}

function emptyRow(message, colspan = 1) {
  const row = document.createElement("tr");
  row.className = "empty-row";
  row.innerHTML = `<td colspan="${colspan}">${message}</td>`;
  return row;
}

function donorRow(donor) {
  const row = document.createElement("tr");
  const creditName = escapeHtml(donor.creditedTo || "Healthy Hikers");
  const credit = donor.type === "offline_donation"
    ? `${creditName} <span class="donor-type">offline</span>`
    : creditName;
  const comment = donor.comment ? `<em>${escapeHtml(donor.comment)}</em>` : "";
  row.innerHTML = `
    <td>
      <strong>${escapeHtml(donor.donor)}</strong>
      ${comment}
    </td>
    <td class="amount">${exactMoney(donor.amount)}</td>
    <td>${escapeHtml(displayDate(donor.date))}</td>
    <td>${credit}</td>
  `;
  return row;
}

function renderPublicTables() {
  const pullers = byRole("puller");
  const backup = byRole("backup");
  const rosterTotal = state.members.reduce((sum, member) => sum + Number(member.donation || 0), 0);
  const total = state.donorTotal ?? rosterTotal;

  elements.pullerCount.textContent = String(pullers.length);
  elements.donationTotal.textContent = money(total);
  elements.pullersSummary.textContent = summarizeLabel(pullers.length);
  elements.backupSummary.textContent = summarizeLabel(backup.length);

  elements.pullersBody.replaceChildren(
    ...(pullers.length ? pullers.map(publicRow) : [emptyRow("No pullers listed yet.")])
  );
  elements.backupBody.replaceChildren(
    ...(backup.length ? backup.map(publicRow) : [emptyRow("No backup members listed yet.")])
  );
}

function renderDonors(payload = {}) {
  const donors = payload.donors || state.donors;
  const summary = payload.summary || {};
  const totalAmount = Number(summary.totalAmount ?? donors.reduce((sum, donor) => sum + Number(donor.amount || 0), 0));

  state.donors = donors;
  state.donorTotal = totalAmount;
  elements.donorsSummary.textContent = `${donors.length} ${donors.length === 1 ? "gift" : "gifts"} | ${exactMoney(totalAmount)}`;
  elements.donationTotal.textContent = exactMoney(totalAmount);
  elements.donorsBody.replaceChildren(
    ...(donors.length ? donors.map(donorRow) : [emptyRow("No donations listed yet.", 4)])
  );

  if (payload.generatedAt) {
    elements.donorsUpdated.textContent = `Updated ${displayDate(payload.generatedAt)}`;
  }
  if (payload.source) {
    elements.donorsSource.href = payload.source;
  }
}

function renderAdminTable() {
  if (!state.unlocked) {
    return;
  }
  elements.adminBody.replaceChildren(
    ...state.members.map((member) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(member.name)}</td>
        <td>${member.role === "puller" ? "Puller" : "Backup"}</td>
        <td class="amount">${money(member.donation)}</td>
        <td>${escapeHtml(member.comment || "")}</td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="ghost-button" type="button" data-edit="${member.id}">Edit</button>
            <button class="danger-button" type="button" data-delete="${member.id}">Delete</button>
          </div>
        </td>
      `;
      return row;
    })
  );
}

function render() {
  renderPublicTables();
  renderAdminTable();
}

function resetForm() {
  elements.memberId.value = "";
  elements.memberName.value = "";
  elements.memberRole.value = "puller";
  elements.memberDonation.value = "0";
  elements.memberComment.value = "";
  elements.memberName.focus();
}

function fillForm(member) {
  elements.memberId.value = member.id;
  elements.memberName.value = member.name;
  elements.memberRole.value = member.role;
  elements.memberDonation.value = member.donation ?? 0;
  elements.memberComment.value = member.comment ?? "";
  elements.memberName.focus();
}

async function requestJson(url, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

async function loadMembers() {
  setLoading(true);
  try {
    const payload = await requestJson("/api/members");
    state.members = payload.members || [];
    render();
    setStatus("Roster loaded.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function loadDonors({ silent = false } = {}) {
  elements.refreshDonors.disabled = true;
  if (!silent) {
    setDonorsStatus("Loading donor list...");
  }

  try {
    const payload = await requestJson("/api/donors");
    renderDonors(payload);
    setDonorsStatus("Donor list loaded.");
  } catch (error) {
    elements.donorsBody.replaceChildren(emptyRow(error.message, 4));
    setDonorsStatus(error.message, true);
  } finally {
    elements.refreshDonors.disabled = false;
  }
}

async function saveMember(event) {
  event.preventDefault();
  setLoading(true);
  const id = elements.memberId.value;
  const action = id ? "update" : "create";
  try {
    await requestJson("/api/members", {
      method: "POST",
      headers: { "x-admin-password": state.adminPassword },
      body: JSON.stringify({
        action,
        id,
        name: elements.memberName.value,
        role: elements.memberRole.value,
        donation: elements.memberDonation.value,
        comment: elements.memberComment.value
      })
    });
    resetForm();
    await loadMembers();
    setStatus(action === "create" ? "Member added." : "Member updated.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function deleteMember(id) {
  setLoading(true);
  try {
    await requestJson("/api/members", {
      method: "POST",
      headers: { "x-admin-password": state.adminPassword },
      body: JSON.stringify({ action: "delete", id })
    });
    await loadMembers();
    setStatus("Member deleted.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
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

elements.adminToggle.addEventListener("click", () => {
  elements.adminPanel.hidden = !elements.adminPanel.hidden;
  if (!elements.adminPanel.hidden) {
    elements.adminPassword.focus();
  }
});

elements.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.adminPassword = elements.adminPassword.value;
  state.unlocked = true;
  elements.editor.hidden = false;
  renderAdminTable();
  setStatus("Admin editor unlocked.");
  resetForm();
});

elements.memberForm.addEventListener("submit", saveMember);
elements.resetForm.addEventListener("click", resetForm);
elements.refreshDonors.addEventListener("click", () => loadDonors());

elements.adminBody.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const member = state.members.find((item) => String(item.id) === editButton.dataset.edit);
    if (member) {
      fillForm(member);
    }
  }
  if (deleteButton) {
    const member = state.members.find((item) => String(item.id) === deleteButton.dataset.delete);
    if (member && window.confirm(`Delete ${member.name}?`)) {
      deleteMember(member.id);
    }
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadDonors({ silent: true });
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadDonors({ silent: true });
  }
});

loadMembers();
loadDonors();
