import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../worker/index.js";

class D1StatementMock {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values);
  }

  async all() {
    return {
      results: this.database.prepare(this.sql).all(...this.values),
    };
  }

  async run() {
    return this.database.prepare(this.sql).run(...this.values);
  }
}

function createEnvironment() {
  const database = new DatabaseSync(":memory:");
  const DB = {
    prepare(sql) {
      return new D1StatementMock(database, sql);
    },
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };

  return {
    DB,
    ASSETS: {
      fetch() {
        return new Response("static asset");
      },
    },
  };
}

test("pledge API starts with an empty tally", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/pledges"),
    createEnvironment(),
  );
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.totalCents, 0);
  assert.equal(data.pledgeCount, 0);
  assert.deepEqual(data.recentPledges, []);
});

test("pledge API validates amounts", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/pledges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Patriot",
        amount: "0.50",
      }),
    }),
    createEnvironment(),
  );
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.error, /\$1/);
});

test("pledge API saves a pledge and updates the tally", async () => {
  const env = createEnvironment();
  const postResponse = await worker.fetch(
    new Request("https://example.com/api/pledges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "  Baltimore   Supporter  ",
        amount: "25.50",
      }),
    }),
    env,
  );
  const postData = await postResponse.json();

  assert.equal(postResponse.status, 201);
  assert.equal(postData.pledge.name, "Baltimore Supporter");
  assert.equal(postData.pledge.amountCents, 2550);
  assert.equal(postData.totalCents, 2550);
  assert.equal(postData.pledgeCount, 1);

  const getResponse = await worker.fetch(
    new Request("https://example.com/api/pledges"),
    env,
  );
  const getData = await getResponse.json();

  assert.equal(getResponse.status, 200);
  assert.equal(getData.totalCents, 2550);
  assert.equal(getData.pledgeCount, 1);
  assert.equal(getData.recentPledges[0].name, "Baltimore Supporter");
});
