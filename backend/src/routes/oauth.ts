import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { encrypt } from "../utils/crypto";
import { supabase } from "../config/db";

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

  // Generate 15-minute expiration state token
  const state = jwt.sign({ user_id: userId }, env.JWT_SECRET, { expiresIn: "15m" });
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
router.get("/callback", async (req, res, next) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).json({ error: "OAuth authorization failed", description: error_description });
  }

  if (!code || !state) {
    return res.status(400).json({ error: "Missing authorization code or state parameter" });
  }

  try {
    // 1. Verify state parameter to prevent CSRF
    const decoded = jwt.verify(state as string, env.JWT_SECRET) as { user_id: string };
    const userId = decoded.user_id;

    let accessToken = "";
    let pagesData: any[] = [];

    // Mock Mode: Runs locally without Meta sandbox requirements if using our mock app_id
    if (env.META_APP_ID === "123456789") {
      console.log("[OAuth Mock] Simulating Graph API OAuth exchanges...");
      accessToken = "mock_long_lived_user_access_token_98765";
      pagesData = [
        {
          id: "page_12345",
          name: "Mock Shop Page",
          access_token: "mock_page_access_token_12345",
          instagram_business_account: {
            id: "ig_54321",
            username: "mock_instagram_bot",
            profile_picture: "https://example.com/pic.png",
          },
        },
      ];
    } else {
      // Real Flow: Exchange code for short-lived user token
      const redirectUri = getRedirectUri(req);
      const tokenExchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
        env.META_APP_ID
      }&client_secret=${env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;

      const tokenRes = await fetch(tokenExchangeUrl);
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return res.status(500).json({ error: "Failed to exchange authorization code", details: errText });
      }
      const tokenData = await tokenRes.json();
      const shortLivedToken = tokenData.access_token;

      // Exchange short-lived token for long-lived user token (expires in ~60 days)
      const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
      
      const longLivedRes = await fetch(longLivedUrl);
      if (!longLivedRes.ok) {
        const errText = await longLivedRes.text();
        return res.status(500).json({ error: "Failed to obtain long-lived token", details: errText });
      }
      const longLivedData = await longLivedRes.json();
      accessToken = longLivedData.access_token;

      // Fetch Facebook Pages managed by the authenticated user
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`;
      const pagesRes = await fetch(pagesUrl);
      if (!pagesRes.ok) {
        const errText = await pagesRes.text();
        return res.status(500).json({ error: "Failed to fetch Facebook pages", details: errText });
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
    }

    if (pagesData.length === 0) {
      return res.status(400).json({ error: "No Instagram Business accounts found connected to your Facebook Pages." });
    }

    const connectedAccounts = [];

    // Store accounts and perform webhook subscriptions
    for (const page of pagesData) {
      const encryptedToken = encrypt(page.access_token);
      const igDetails = page.instagram_business_account;

      // Check if account already exists in database
      const { data: existingAcct } = await supabase
        .from("instagram_accounts")
        .select("id")
        .eq("instagram_page_id", page.id)
        .maybeSingle();

      let acctId = "";

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

      // Real Flow: Subscribe page to webhook events
      if (env.META_APP_ID !== "123456789") {
        const subUrl = `https://graph.facebook.com/v18.0/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mention,story_insights&access_token=${page.access_token}`;
        const subRes = await fetch(subUrl, { method: "POST" });
        if (!subRes.ok) {
          console.error(`Failed to subscribe Page ${page.id} to webhooks:`, await subRes.text());
        }
      } else {
        console.log(`[OAuth Mock] Subscribed page ${page.id} to webhook changes.`);
      }

      connectedAccounts.push({
        id: acctId,
        page_id: page.id,
        username: igDetails.username,
      });
    }

    return res.json({
      success: true,
      message: "Instagram account(s) connected and subscribed successfully.",
      accounts: connectedAccounts,
    });
  } catch (err: any) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: "Invalid or expired state security token." });
    }
    return next(err);
  }
});

export default router;
