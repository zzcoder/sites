const state = {
  members: [],
  adminPassword: "",
  unlocked: false
};

const elements = {
  status: document.querySelector("#status"),
  pullerCount: document.querySelector("#pullerCount"),
  donationTotal: document.querySelector("#donationTotal"),
  pullersSummary: document.querySelector("#pullersSummary"),
  backupSummary: document.querySelector("#backupSummary"),
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

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
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

function emptyRow(message) {
  const row = document.createElement("tr");
  row.className = "empty-row";
  row.innerHTML = `<td>${message}</td>`;
  return row;
}

function renderPublicTables() {
  const pullers = byRole("puller");
  const backup = byRole("backup");
  const total = state.members.reduce((sum, member) => sum + Number(member.donation || 0), 0);

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

loadMembers();
