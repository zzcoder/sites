/* eslint-disable @typescript-eslint/no-require-imports */
const {
  authenticateWithWeChat,
  clearSessionToken,
  getBootstrap,
  mutate,
  sessionToken,
} = require("../../utils/api");

function titleName(name) {
  if (!name) return "";
  return /^[a-z]/.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function money(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function shortDate(value) {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : value;
}

function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Welcome back";
}

Page({
  data: {
    status: "loading",
    errorMessage: "",
    profileName: "",
    busy: false,
    activeTab: "today",
    showLeave: false,
    greeting: "Welcome back",
    seconds: "",
    leaveDays: "1",
    leaveReason: "",
    newUserName: "",
    newUserIsAdmin: false,
    currentUser: null,
    dashboard: null,
    totalPool: "$0.00",
    myDue: "$0.00",
    championName: "—",
    championSeconds: "0s",
    ranking: [],
    reportHistory: [],
    trend: [],
    adminUsers: [],
    pendingLeaves: [],
    tabs: [],
  },

  onLoad() {
    this.updateGreeting();
    this.clock = setInterval(() => this.updateGreeting(), 60000);
    this.start();
  },

  onUnload() {
    if (this.clock) clearInterval(this.clock);
  },

  onPullDownRefresh() {
    if (this.data.status !== "ready") {
      wx.stopPullDownRefresh();
      return;
    }
    this.refresh()
      .finally(() => wx.stopPullDownRefresh());
  },

  updateGreeting() {
    this.setData({ greeting: greetingForHour(new Date().getHours()) });
  },

  async start() {
    this.setData({ status: "loading", errorMessage: "" });
    try {
      if (sessionToken()) {
        const bootstrap = await getBootstrap();
        if (bootstrap.currentUser && bootstrap.dashboard) {
          this.applyBootstrap(bootstrap);
          return;
        }
        clearSessionToken();
      }
      await this.connectWithWeChat();
    } catch (error) {
      this.showStartupError(error);
    }
  },

  async connectWithWeChat(displayName) {
    const result = await authenticateWithWeChat(displayName);
    if (result.needsProfile) {
      this.setData({ status: "profile", busy: false });
      return;
    }
    const bootstrap = await getBootstrap();
    if (!bootstrap.currentUser || !bootstrap.dashboard) {
      throw new Error("WeChat connected, but the account could not be loaded.");
    }
    this.applyBootstrap(bootstrap);
  },

  async refresh() {
    try {
      const bootstrap = await getBootstrap();
      if (!bootstrap.currentUser || !bootstrap.dashboard) {
        clearSessionToken();
        await this.connectWithWeChat();
        return;
      }
      this.applyBootstrap(bootstrap, true);
    } catch (error) {
      if (error.statusCode === 401) {
        clearSessionToken();
        await this.start();
        return;
      }
      wx.showToast({ title: error.message || "Refresh failed", icon: "none" });
    }
  },

  applyBootstrap(bootstrap, preserveTab) {
    const user = bootstrap.currentUser;
    const dashboard = bootstrap.dashboard;
    const ranking = dashboard.ranking.map((row, index) => ({
      ...row,
      displayName: titleName(row.name),
      initials: String(row.name || "?").charAt(0).toUpperCase(),
      rank: index + 1,
      rankClass: index < 3 ? `rank-${index + 1}` : "",
      secondsText: row.seconds == null ? "Not yet / 未打卡" : `${row.seconds}s`,
      checked: row.seconds != null,
    }));
    const best = Math.max(1, dashboard.report.bestSeconds || 1);
    const reportHistory = dashboard.report.history.map((row) => ({
      ...row,
      shortDate: shortDate(row.date),
      width: Math.max(10, Math.round((row.seconds / best) * 100)),
    }));
    const maxParticipants = Math.max(
      1,
      ...dashboard.trend.map((point) => point.participants),
    );
    const trend = dashboard.trend.map((point) => ({
      ...point,
      shortDate: shortDate(point.date),
      barHeight: Math.max(18, Math.round((point.participants / maxParticipants) * 126)),
    }));
    const adminUsers = dashboard.adminUsers.map((member) => ({
      ...member,
      displayName: titleName(member.name),
      initials: String(member.name || "?").charAt(0).toUpperCase(),
      dueText: money(member.dueCents),
      roleText: member.isAdmin ? "Admin / 管理员" : "Member / 成员",
      passwordText: member.hasPassword ? "Password set / 已设密码" : "No password / 无密码",
    }));
    const pendingLeaves = dashboard.pendingLeaves.map((request) => ({
      ...request,
      displayName: titleName(request.userName),
      dateText: `${shortDate(request.startDate)} · ${request.days} day${request.days === 1 ? "" : "s"}`,
    }));
    const tabs = [
      { id: "today", label: "Today", zh: "今日", icon: "/assets/icons/home.png" },
      { id: "ranking", label: "Ranking", zh: "排名", icon: "/assets/icons/ranking.png" },
      { id: "report", label: "Report", zh: "报告", icon: "/assets/icons/report.png" },
      ...(user.isAdmin
        ? [{ id: "admin", label: "Admin", zh: "管理", icon: "/assets/icons/admin.png" }]
        : []),
    ];

    this.setData({
      status: "ready",
      busy: false,
      errorMessage: "",
      activeTab: preserveTab ? this.data.activeTab : "today",
      currentUser: {
        ...user,
        displayName: titleName(user.name),
        initials: String(user.name || "?").charAt(0).toUpperCase(),
      },
      dashboard,
      totalPool: money(dashboard.totalPoolCents),
      myDue: money(dashboard.myDueCents),
      championName: titleName(dashboard.yesterday.champion) || "—",
      championSeconds: `${dashboard.yesterday.championSeconds || 0}s`,
      ranking,
      reportHistory,
      trend,
      adminUsers,
      pendingLeaves,
      tabs,
    });
  },

  showStartupError(error) {
    const message = error && error.message
      ? error.message
      : "Unable to start Plank Check-in.";
    this.setData({
      status: "error",
      busy: false,
      errorMessage: message,
    });
  },

  retry() {
    this.start();
  },

  onProfileName(event) {
    this.setData({ profileName: event.detail.value });
  },

  async confirmProfile() {
    const name = this.data.profileName.trim();
    if (!name) {
      wx.showToast({ title: "Please confirm your name / 请确认名字", icon: "none" });
      return;
    }
    this.setData({ busy: true });
    try {
      await this.connectWithWeChat(name);
    } catch (error) {
      this.setData({ busy: false });
      wx.showToast({ title: error.message || "Unable to connect", icon: "none" });
    }
  },

  selectTab(event) {
    const nextTab = event.currentTarget.dataset.tab;
    if (!nextTab || nextTab === this.data.activeTab) return;
    this.setData({ activeTab: nextTab, showLeave: false });
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  onSeconds(event) {
    this.setData({ seconds: event.detail.value.replace(/\D/g, "").slice(0, 4) });
  },

  async submitCheckin() {
    const seconds = Number(this.data.seconds);
    if (!seconds || seconds < 1 || seconds > 7200) {
      wx.showToast({ title: "Enter 1–7200 seconds", icon: "none" });
      return;
    }
    const ok = await this.runMutation(
      { action: "checkin", seconds },
      "Checked in! / 打卡成功",
    );
    if (ok) this.setData({ seconds: "" });
  },

  openLeave() {
    this.setData({ showLeave: true });
  },

  closeLeave() {
    if (!this.data.busy) this.setData({ showLeave: false });
  },

  stopBubble() {},

  onLeaveDays(event) {
    this.setData({ leaveDays: event.detail.value.replace(/\D/g, "").slice(0, 2) });
  },

  onLeaveReason(event) {
    this.setData({ leaveReason: event.detail.value.slice(0, 240) });
  },

  async submitLeave() {
    const days = Number(this.data.leaveDays);
    if (!days || days < 1 || days > 30) {
      wx.showToast({ title: "Choose 1–30 days", icon: "none" });
      return;
    }
    const ok = await this.runMutation(
      {
        action: "requestLeave",
        days,
        reason: this.data.leaveReason.trim(),
      },
      "Request sent / 请假申请已提交",
    );
    if (ok) {
      this.setData({
        showLeave: false,
        leaveDays: "1",
        leaveReason: "",
      });
    }
  },

  onNewUserName(event) {
    this.setData({ newUserName: event.detail.value.slice(0, 50) });
  },

  onNewUserRole(event) {
    this.setData({ newUserIsAdmin: event.detail.value });
  },

  async addUser() {
    const name = this.data.newUserName.trim();
    if (!name) {
      wx.showToast({ title: "Enter a name / 请输入名字", icon: "none" });
      return;
    }
    const ok = await this.runMutation(
      {
        action: "addUser",
        name,
        isAdmin: this.data.newUserIsAdmin,
      },
      "Member added / 成员已添加",
    );
    if (ok) this.setData({ newUserName: "", newUserIsAdmin: false });
  },

  reviewLeave(event) {
    const requestId = Number(event.currentTarget.dataset.id);
    const decision = event.currentTarget.dataset.decision;
    const label = decision === "approved"
      ? "Leave approved / 已批准"
      : "Leave declined / 已拒绝";
    this.runMutation({ action: "reviewLeave", requestId, decision }, label);
  },

  clearDue(event) {
    const userId = Number(event.currentTarget.dataset.id);
    const name = event.currentTarget.dataset.name;
    wx.showModal({
      title: "Record payment?",
      content: `Clear ${name}'s full amount due? / 确认已缴清？`,
      confirmText: "Clear",
      success: (result) => {
        if (result.confirm) {
          this.runMutation(
            { action: "clearDue", userId },
            "Payment recorded / 已记录缴款",
          );
        }
      },
    });
  },

  clearPassword(event) {
    const userId = Number(event.currentTarget.dataset.id);
    const name = event.currentTarget.dataset.name;
    wx.showModal({
      title: "Reset password?",
      content: `${name} will set a new password on the website. Mini Program access is unaffected.`,
      confirmText: "Reset",
      confirmColor: "#c24137",
      success: (result) => {
        if (result.confirm) {
          this.runMutation(
            { action: "clearPassword", userId },
            "Password cleared / 密码已清除",
          );
        }
      },
    });
  },

  async runMutation(payload, successMessage) {
    if (this.data.busy) return false;
    this.setData({ busy: true });
    try {
      await mutate(payload);
      await this.refresh();
      wx.showToast({ title: successMessage, icon: "none", duration: 1800 });
      return true;
    } catch (error) {
      if (error.statusCode === 401) {
        clearSessionToken();
        await this.start();
      } else {
        wx.showToast({ title: error.message || "Please try again", icon: "none" });
      }
      return false;
    } finally {
      this.setData({ busy: false });
    }
  },
});
