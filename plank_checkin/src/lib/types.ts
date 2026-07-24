export type PublicUser = {
  id: number;
  name: string;
  isAdmin: boolean;
  hasPassword: boolean;
};

export type RankingRow = {
  id: number;
  name: string;
  seconds: number | null;
};

export type TrendPoint = {
  date: string;
  participants: number;
  averageSeconds: number;
};

export type CheckinRow = {
  date: string;
  seconds: number;
  createdAt: string;
};

export type LeaveRequest = {
  id: number;
  userName: string;
  startDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "declined";
};

export type AdminUser = PublicUser & {
  dueCents: number;
};

export type Dashboard = {
  exerciseDate: string;
  totalPoolCents: number;
  myDueCents: number;
  yesterday: {
    champion: string | null;
    championSeconds: number;
    averageSeconds: number;
    medianSeconds: number;
  };
  ranking: RankingRow[];
  trend: TrendPoint[];
  report: {
    totalCheckins: number;
    averageSeconds: number;
    medianSeconds: number;
    bestSeconds: number;
    history: CheckinRow[];
  };
  pendingLeaves: LeaveRequest[];
  adminUsers: AdminUser[];
};

export type Bootstrap = {
  configured: boolean;
  users: PublicUser[];
  currentUser: PublicUser | null;
  dashboard: Dashboard | null;
  error?: string;
};
