# Deploy Plank Check-in as a WeChat Mini Program

This package contains the complete native Mini Program client. It does not
contain the Mini Program AppSecret, database credentials, or Vercel secrets.

## What you need

- A registered WeChat Mini Program and its AppID
- Administrator or developer access to that Mini Program
- WeChat Developer Tools installed on the deployment computer
- Access to the `healthy-hikers/plank-checkin` project in Vercel

Official resources:

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- [Mini Program release workflow](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)
- [Mini Program network configuration](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

## 1. Configure the backend once

Open the Vercel dashboard and select `healthy-hikers/plank-checkin`.

Under **Settings → Environment Variables**, add these Production variables:

- `WECHAT_APP_ID`: the Mini Program AppID, beginning with `wx`
- `WECHAT_APP_SECRET`: the Mini Program AppSecret from WeChat Public Platform

Keep the AppSecret in Vercel only. Never put it in `project.config.json`,
`config.js`, Git, screenshots, or chat.

Redeploy the latest Production deployment after adding the variables.

## 2. Configure the WeChat request domain

Sign in to [WeChat Public Platform](https://mp.weixin.qq.com/) with the Mini
Program administrator account.

Open **Development / 开发管理 → Development Settings / 开发设置 → Server Domain /
服务器域名** and add:

```text
https://plank-checkin.vercel.app
```

Add it as a `request` legal domain. Do not include `/api/app` or a trailing
path. If WeChat refuses the shared `vercel.app` hostname, connect an owned
custom HTTPS domain to the Vercel project and use that domain in both
`config.js` and the WeChat settings.

## 3. Import on the other computer

1. Unzip `plank-checkin-miniprogram.zip`.
2. Open WeChat Developer Tools.
3. Choose **Import Project / 导入项目**.
4. Select the unzipped folder that contains `project.config.json`.
5. Enter the real Mini Program AppID when prompted.
6. If Developer Tools does not update the file automatically, replace
   `touristappid` in `project.config.json` with the AppID.
7. Keep **Mini Program / 小程序** as the project type and complete the import.

The AppID is not secret. The AppSecret is secret and is not needed in Developer
Tools.

## 4. Test before uploading

1. Click **Compile / 编译** and confirm there are no errors.
2. Confirm the app connects automatically through WeChat without a password.
3. On a new WeChat account, confirm the one-time display-name screen.
4. Test Today, Ranking, Report, check-in, and leave request.
5. With an administrator account, test Admin and password reset.
6. Click **Preview / 预览** and scan the QR code on a physical phone.

If requests are blocked only in Developer Tools, verify the request legal
domain first. The temporary “Do not verify legal domains” development option
must not be relied on for Preview, review, or release.

## 5. Upload, review, and publish

1. In Developer Tools, click **Upload / 上传**.
2. Enter a version such as `1.0.0` and a short release note.
3. Return to WeChat Public Platform.
4. Open **Management / 管理 → Version Management / 版本管理**.
5. Find the uploaded development version and choose **Submit for Review /
   提交审核**.
6. Complete the service category, privacy disclosures, screenshots, and review
   instructions requested by WeChat.
7. After approval, choose **Publish / 发布**.

The package can be uploaded repeatedly with increasing version numbers.
