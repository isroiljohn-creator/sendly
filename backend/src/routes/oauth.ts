import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { encrypt } from "../utils/crypto";
import { supabase } from "../config/db";

const usedStateJtis = new Set<string>();

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const router = Router();

// Resolve application callback URL dynamically
const getRedirectUri = (req: any) => {
  return `${req.protocol}://${req.get("host")}/oauth/instagram/callback`;
};

/**
 * GET /oauth/instagram/start
 * Initiates Meta OAuth flow. Encodes user_id into a JWT-signed CSRF state parameter.
 */
router.get("/start", authMiddleware, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(400).json({ error: "User ID not found in token payload." });
  }

  // Generate 15-minute expiration state token with a secure random JTI
  const stateJti = crypto.randomUUID();
  const state = jwt.sign({ user_id: userId, jti: stateJti }, env.JWT_SECRET, { expiresIn: "15m" });
  const redirectUri = getRedirectUri(req);

  const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${
    env.META_APP_ID
  }&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_messaging,pages_read_engagement,pages_show_list&response_type=code&state=${state}`;

  return res.redirect(fbAuthUrl);
});

/**
 * GET /oauth/instagram/callback
 * Exchanges Meta authorization code for Page tokens, resolves Instagram handles, and saves them.
 */
// Helper function to send HTML error page in popup
const sendErrorHtml = (res: any, title: string, message: string) => {
  const cleanTitle = escapeHtml(title);
  const cleanMessage = escapeHtml(message);
  res.setHeader("Content-Type", "text/html");
  return res.status(400).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ulanishda xatolik</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #FAFAFA;
            color: #262626;
            text-align: center;
            padding: 20px;
          }
          .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 { font-size: 20px; margin-bottom: 8px; color: #DC2626; }
          p { font-size: 14px; color: #707070; margin-bottom: 24px; max-width: 360px; line-height: 1.5; }
          button {
            background-color: #0095f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          button:hover { background-color: #1877f2; }
        </style>
      </head>
      <body>
        <div class="error-icon">⚠️</div>
        <h1>${cleanTitle}</h1>
        <p>${cleanMessage}</p>
        <button onclick="window.close()">Oynani yopish</button>
      </body>
    </html>
  `);
};

/**
 * GET /oauth/instagram/callback
 * Exchanges Meta authorization code for Page tokens, resolves Instagram handles, and saves them.
 */
router.get("/callback", async (req, res, next) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return sendErrorHtml(res, "Ruxsat berilmadi", error_description as string || "Meta OAuth tizimi orqali ulanish rad etildi.");
  }

  if (!code || !state) {
    return sendErrorHtml(res, "Nomalum so'rov", "Authorization kodi yoki xavfsizlik parametri (state) topilmadi.");
  }

  try {
    // 1. Verify state parameter to prevent CSRF
    let userId = "";
    try {
      const decoded = jwt.verify(state as string, env.JWT_SECRET) as { user_id: string; jti?: string };
      userId = decoded.user_id;
      if (decoded.jti) {
        if (usedStateJtis.has(decoded.jti)) {
          return sendErrorHtml(res, "Xavfsizlik xatosi", "Xavfsizlik tokeni allaqachon ishlatilgan. Qaytadan urinib ko'ring.");
        }
        usedStateJtis.add(decoded.jti);
        // Expire state token from tracking after 15 minutes
        setTimeout(() => {
          usedStateJtis.delete(decoded.jti!);
        }, 15 * 60 * 1000);
      }
    } catch (jwtErr) {
      return sendErrorHtml(res, "Xavfsizlik xatosi", "Xavfsizlik tokeni eskirgan yoki haqiqiy emas. Iltimos, qaytadan urinib ko'ring.");
    }

    let accessToken = "";
    let pagesData: any[] = [];

    // Real Flow: Exchange code for short-lived user token
    const redirectUri = getRedirectUri(req);
    const tokenExchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
      env.META_APP_ID
    }&client_secret=${env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;

    const tokenRes = await fetch(tokenExchangeUrl);
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return sendErrorHtml(res, "Token olishda xatolik", `Meta-dan token olish amalga oshmadi: ${errText}`);
    }
    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange short-lived token for long-lived user token (expires in ~60 days)
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    
    const longLivedRes = await fetch(longLivedUrl);
    if (!longLivedRes.ok) {
      const errText = await longLivedRes.text();
      return sendErrorHtml(res, "Token olishda xatolik", `Meta long-lived token olishda xatolik: ${errText}`);
    }
    const longLivedData = await longLivedRes.json();
    accessToken = longLivedData.access_token;

    // Fetch Facebook Pages managed by the authenticated user
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
    const pagesRes = await fetch(pagesUrl);
    if (!pagesRes.ok) {
      const errText = await pagesRes.text();
      return sendErrorHtml(res, "Sahifalarni yuklashda xatolik", `Meta sahifalar ro'yxatini ololmadi: ${errText}`);
    }
    const pagesRaw = await pagesRes.json();
    const pagesList = pagesRaw.data || [];

    // Query connected Instagram Business Account for each page
    for (const page of pagesList) {
      const pageDetailUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account,access_token&access_token=${accessToken}`;
      const pageDetailRes = await fetch(pageDetailUrl);
      if (!pageDetailRes.ok) continue;

      const pageDetail = await pageDetailRes.json();
      const igBusinessAccount = pageDetail.instagram_business_account;

      if (igBusinessAccount && igBusinessAccount.id) {
        // Retrieve Instagram profile information
        const igUrl = `https://graph.facebook.com/v18.0/${igBusinessAccount.id}?fields=username,profile_picture_url&access_token=${accessToken}`;
        const igRes = await fetch(igUrl);
        
        let username = "instagram_bot";
        let profilePic = "";
        
        if (igRes.ok) {
          const igData = await igRes.json();
          username = igData.username || username;
          profilePic = igData.profile_picture_url || profilePic;
        }

        pagesData.push({
          id: page.id,
          name: page.name,
          access_token: pageDetail.access_token,
          instagram_business_account: {
            id: igBusinessAccount.id,
            username,
            profile_picture: profilePic,
          },
        });
      }
    }

    if (pagesData.length === 0) {
      return sendErrorHtml(res, "Instagram hisobi topilmadi", "Sizning Facebook sahifalaringizga ulangan Instagram Professional (Business yoki Creator) hisobi topilmadi.");
    }

    const connectedAccounts = [];

    // Store accounts and perform webhook subscriptions
    for (const page of pagesData) {
      const encryptedToken = encrypt(page.access_token);
      const igDetails = page.instagram_business_account;
      let acctId = "";

      // Handle Database persistence gracefully
      try {
        // Check if account already exists in database
        const { data: existingAcct } = await supabase
          .from("instagram_accounts")
          .select("id")
          .eq("instagram_page_id", page.id)
          .maybeSingle();

        if (existingAcct) {
          acctId = existingAcct.id;
          const { error: updateErr } = await supabase
            .from("instagram_accounts")
            .update({
              user_id: userId,
              username: igDetails.username,
              access_token: encryptedToken,
              is_active: true,
            })
            .eq("id", acctId);

          if (updateErr) throw updateErr;
        } else {
          const { data: newAcct, error: insertErr } = await supabase
            .from("instagram_accounts")
            .insert({
              user_id: userId,
              instagram_page_id: page.id,
              username: igDetails.username,
              access_token: encryptedToken,
              is_active: true,
            })
            .select("id")
            .single();

          if (insertErr) throw insertErr;
          acctId = newAcct.id;
        }
      } catch (dbErr) {
        console.error("[OAuth] Supabase DB write failed, proceeding with generation:", dbErr);
      }

      // Subscribe page to webhook events
      const subUrl = `https://graph.facebook.com/v18.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mention,story_insights&access_token=${page.access_token}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const subRes = await fetch(subUrl, { 
          method: "POST",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!subRes.ok) {
          console.error(`Failed to subscribe Page ${page.id} to webhooks:`, await subRes.text());
        }
      } catch (subErr: any) {
        console.error(`Timeout or error subscribing Page ${page.id} to webhooks:`, subErr.message);
      }

      connectedAccounts.push({
        id: acctId,
        page_id: page.id,
        username: igDetails.username,
      });
    }

    // Return HTML page to close popup and send message back to frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.setHeader("Content-Type", "text/html");
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Muvaffaqiyatli ulandi</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #FAFAFA;
              color: #262626;
              text-align: center;
              padding: 20px;
            }
            .spinner {
              border: 3.5px solid rgba(0, 0, 0, 0.08);
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border-left-color: #0095f6;
              animation: spin 0.85s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h1 { font-size: 20px; margin-bottom: 8px; font-weight: 700; }
            p { font-size: 13.5px; color: #8E8E8E; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h1>Muvaffaqiyatli ulandi!</h1>
          <p>Instagram hisobingiz ulandi. Oyna yopilmoqda...</p>
          <script>
            if (window.opener) {
              const accounts = ${JSON.stringify(connectedAccounts)};
              accounts.forEach(function(acc) {
                window.opener.postMessage({
                  type: "INSTAGRAM_CONNECTED",
                  username: acc.username.startsWith('@') ? acc.username : '@' + acc.username,
                  name: acc.username,
                  followers: "0"
                }, "${frontendUrl}");
              });
            }
            setTimeout(function() {
              window.close();
            }, 1200);
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[OAuth] Unexpected callback error:", err);
    return sendErrorHtml(res, "Kutilmagan xatolik", `OAuth qayta ishlashda kutilmagan xatolik yuz berdi: ${err.message || err}`);
  }
});

/**
 * POST /oauth/instagram/custom
 * Links a custom Meta B2B App configuration to the user's account.
 */
router.post("/custom", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    instagramPageId,
    username,
    customMetaAppId,
    customMetaAppSecret,
    customMetaAccessToken,
  } = req.body;

  if (!instagramPageId || !username || !customMetaAppId || !customMetaAppSecret || !customMetaAccessToken) {
    return res.status(400).json({ error: "Barcha majburiy maydonlarni to'ldiring." });
  }

  try {
    // Encrypt the custom Meta access token to store it securely
    const encryptedToken = encrypt(customMetaAccessToken);

    // 1. Try to subscribe the page to the custom Meta App automatically
    try {
      const subUrl = `https://graph.facebook.com/v18.0/${instagramPageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mention,story_insights&access_token=${customMetaAccessToken}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const subRes = await fetch(subUrl, { 
        method: "POST",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (subRes.ok) {
        console.log(`[Oauth Custom] Page ${instagramPageId} successfully subscribed to custom Meta App.`);
      } else {
        const errText = await subRes.text();
        console.warn(`[Oauth Custom] Webhook subscription warning for Page ${instagramPageId}:`, errText);
      }
    } catch (subErr: any) {
      console.error("[Oauth Custom] Webhook subscription API call failed:", subErr.message);
    }

    // 2. Check if page already linked
    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("id, user_id")
      .eq("instagram_page_id", instagramPageId)
      .maybeSingle();

    if (existing) {
      if (existing.user_id !== userId) {
        return res.status(400).json({ error: "Ushbu Instagram sahifasi allaqachon boshqa foydalanuvchiga ulangan!" });
      }

      // Update existing account
      const { error: updateErr } = await supabase
        .from("instagram_accounts")
        .update({
          username,
          access_token: encryptedToken,
          is_custom_meta: true,
          custom_meta_app_id: customMetaAppId,
          custom_meta_app_secret: customMetaAppSecret,
          is_active: true
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;

      return res.json({ 
        success: true, 
        message: "Custom Meta akkaunti muvaffaqiyatli yangilandi.", 
        accountId: existing.id 
      });
    } else {
      // Create new account
      const { error: insertErr } = await supabase
        .from("instagram_accounts")
        .insert({
          user_id: userId,
          instagram_page_id: instagramPageId,
          username,
          access_token: encryptedToken,
          is_custom_meta: true,
          custom_meta_app_id: customMetaAppId,
          custom_meta_app_secret: customMetaAppSecret,
          is_active: true
        });

      if (insertErr) throw insertErr;

      return res.json({ 
        success: true, 
        message: "Custom Meta akkaunti muvaffaqiyatli ulandi." 
      });
    }
  } catch (err: any) {
    console.error("[Oauth Custom] Failed to link custom Meta account:", err.message);
    return res.status(500).json({ error: "Tizim xatoligi: " + err.message });
  }
});

export default router;
