# Plank Check-in WeChat Mini Program

This is the native WeChat Mini Program client for the existing Plank Check-in
backend. It uses `wx.login` and WeChat `openid`; there is no password screen or
user picker. On a new account, WeChat may require the user to confirm a nickname
once because silent login does not expose profile data.

## Import

1. Open WeChat Developer Tools.
2. Import this `miniprogram` directory.
3. Replace `touristappid` in `project.config.json` with the Mini Program AppID.
4. In the WeChat Public Platform, add
   `https://plank-checkin.vercel.app` as a **request legal domain**.
5. Add `WECHAT_APP_ID` and `WECHAT_APP_SECRET` to the Vercel Production
   environment. Keep the AppSecret server-side; never add it to this directory.

The API origin can be changed in `config.js` if the backend moves.

For the complete import, test, review, and publishing checklist, see
[`DEPLOY.md`](DEPLOY.md).

## Account behavior

- Returning Mini Program users are signed in automatically.
- A new WeChat account confirms a name once, then receives a persistent session.
- If that name exactly matches an existing unlinked website member, the WeChat
  identity is linked to that member so existing check-ins and admin access carry
  over.
- The website's password login continues to work independently.
