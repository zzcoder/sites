export type PledgeRecord = {
  id: number;
  name: string;
  amountCents: number;
  createdAt: string;
};

export const pledgeSchema = {
  table: "pledges",
  columns: {
    id: "INTEGER PRIMARY KEY AUTOINCREMENT",
    name: "TEXT NOT NULL",
    amount_cents: "INTEGER NOT NULL",
    created_at: "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  },
  indexes: {
    pledges_created_at_idx: ["created_at DESC", "id DESC"],
  },
} as const;
