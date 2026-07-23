const TEAM_ID = "832142";
const CAMPAIGN_ID = "777136";
const FEED_URL = `https://impact.specialolympicsva.org/frs-api/fundraising-teams/${TEAM_ID}/feed-items`;
const DONATION_TYPES = ["donation", "offline_donation"];

function sendJson(response, status, payload) {
  response.status(status).setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

function parseDonationValue(value) {
  const [amountText = "0", currency = "USD"] = String(value || "").trim().split(/\s+/);
  const amount = Number(amountText);
  return {
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0,
    currency
  };
}

function donorName(item) {
  return String(item.member_name || item.agent_name || "").trim() || "Anonymous";
}

function normalizeDonation(item) {
  const { amount, currency } = parseDonationValue(item.linkable_value);
  return {
    id: String(item.linkable_id || item.id),
    feedItemId: item.id,
    donor: donorName(item),
    amount,
    currency,
    type: item.linkable_type,
    date: item.linkable_effective_at || item.created_at || null,
    creditedTo: item.feedable_value || "",
    comment: String(item.comment || "").replace(/\s+/g, " ").trim()
  };
}

async function fetchDonationType(type) {
  const donations = [];
  let page = 1;
  let lastPage = 1;

  do {
    const params = new URLSearchParams({
      campaignId: CAMPAIGN_ID,
      page: String(page),
      per_page: "100",
      filter: `linkable_type=${type}`
    });
    const response = await fetch(`${FEED_URL}?${params}`, {
      headers: {
        accept: "application/json, text/plain, */*",
        referer: `https://impact.specialolympicsva.org/team/${TEAM_ID}`
      }
    });

    if (!response.ok) {
      throw new Error(`Donor feed request failed with ${response.status}`);
    }

    const payload = await response.json();
    donations.push(...(Array.isArray(payload.data) ? payload.data : []));
    lastPage = Number(payload.last_page || payload.total_pages || 1);
    page += 1;
  } while (page <= lastPage);

  return donations;
}

async function fetchDonors() {
  const items = (await Promise.all(DONATION_TYPES.map(fetchDonationType))).flat();
  const donors = items
    .map(normalizeDonation)
    .sort((left, right) => {
      const dateCompare = String(left.date || "").localeCompare(String(right.date || ""));
      return dateCompare || Number(left.feedItemId) - Number(right.feedItemId);
    });
  const totalAmount = donors.reduce((sum, donor) => sum + donor.amount, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: `https://impact.specialolympicsva.org/team/${TEAM_ID}`,
    teamId: TEAM_ID,
    campaignId: CAMPAIGN_ID,
    summary: {
      count: donors.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: "USD"
    },
    donors
  };
}

export default async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("allow", "GET");
      return sendJson(response, 405, { error: "Method not allowed" });
    }

    return sendJson(response, 200, await fetchDonors());
  } catch (error) {
    console.error(error);
    return sendJson(response, 502, {
      error: error.message || "Donor list could not be loaded"
    });
  }
}
