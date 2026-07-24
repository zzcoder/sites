/* eslint-disable @typescript-eslint/no-require-imports */
const { SESSION_TOKEN_KEY } = require("./utils/api");

App({
  globalData: {
    sessionToken: "",
  },

  onLaunch() {
    this.globalData.sessionToken = wx.getStorageSync(SESSION_TOKEN_KEY) || "";
  },
});
