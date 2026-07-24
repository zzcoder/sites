/* eslint-disable @typescript-eslint/no-require-imports */
const { API_BASE_URL } = require("../config");

const SESSION_TOKEN_KEY = "plank_session_token";

function sessionToken() {
  return getApp().globalData.sessionToken || wx.getStorageSync(SESSION_TOKEN_KEY) || "";
}

function saveSessionToken(token) {
  getApp().globalData.sessionToken = token;
  wx.setStorageSync(SESSION_TOKEN_KEY, token);
}

function clearSessionToken() {
  getApp().globalData.sessionToken = "";
  wx.removeStorageSync(SESSION_TOKEN_KEY);
}

function request(options) {
  const token = options.auth === false ? "" : sessionToken();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api/app`,
      method: options.method || "GET",
      data: options.data,
      timeout: 20000,
      header: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        const error = new Error(response.data && response.data.error
          ? response.data.error
          : "Unable to reach the check-in board.");
        error.statusCode = response.statusCode;
        reject(error);
      },
      fail(error) {
        reject(new Error(error.errMsg || "Network request failed."));
      },
    });
  });
}

function wechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      timeout: 15000,
      success(result) {
        if (result.code) resolve(result.code);
        else reject(new Error("WeChat did not return a login code."));
      },
      fail(error) {
        reject(new Error(error.errMsg || "WeChat login is unavailable."));
      },
    });
  });
}

async function authenticateWithWeChat(displayName) {
  const code = await wechatCode();
  const result = await request({
    method: "POST",
    auth: false,
    data: {
      action: "wechatAuthenticate",
      code,
      ...(displayName ? { displayName } : {}),
    },
  });
  if (result.sessionToken) saveSessionToken(result.sessionToken);
  return result;
}

function getBootstrap() {
  return request({ method: "GET" });
}

function mutate(payload) {
  return request({ method: "POST", data: payload });
}

module.exports = {
  SESSION_TOKEN_KEY,
  authenticateWithWeChat,
  clearSessionToken,
  getBootstrap,
  mutate,
  sessionToken,
};
