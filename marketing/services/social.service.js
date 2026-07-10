// services/social.service.js
// Fetches real data from Meta Graph API (Facebook )

const BASE = "https://graph.facebook.com/v19.0";

// ── helper ────────────────────────────────────────────────────────────────────
async function metaFetch(url) {
  const res  = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Meta API error ${res.status}`);
  }
  return json;
}

function getEnv() {
  const token  = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token)  throw new Error("META_PAGE_ACCESS_TOKEN not set in .env");
  if (!pageId) throw new Error("META_PAGE_ID not set in .env");
  return { token, pageId};
}

// ── Facebook ──────────────────────────────────────────────────────────────────

/** Get page stats + engagement in parallel */
async function getFacebookInsights() {
  const { token, pageId } = getEnv();

  // Fire both requests in parallel
  const [pageData, postsData] = await Promise.all([
    metaFetch(`${BASE}/${pageId}?fields=fan_count,followers_count,name&access_token=${token}`),
    metaFetch(`${BASE}/${pageId}/posts?fields=likes.summary(true),comments.summary(true),shares&limit=10&access_token=${token}`)
      .catch(() => ({ data: [] })),
  ]);

  const posts           = postsData.data || [];
  const totalLikes      = posts.reduce((s, p) => s + (p.likes?.summary?.total_count    ?? 0), 0);
  const totalComments   = posts.reduce((s, p) => s + (p.comments?.summary?.total_count ?? 0), 0);
  const totalShares     = posts.reduce((s, p) => s + (p.shares?.count                  ?? 0), 0);
  const totalEngagement = totalLikes + totalComments + totalShares;

  return [
    { name: "page_fans",               total: pageData.fan_count        ?? 0, daily: [] },
    { name: "page_fan_adds",           total: 0,                              daily: [] },
    { name: "page_impressions",        total: totalEngagement,                daily: [] },
    { name: "page_impressions_unique", total: pageData.followers_count   ?? 0, daily: [] },
    { name: "page_post_engagements",   total: totalEngagement,                daily: [] },
  ];
}

/** Audience location — requires 100+ followers */
async function getFacebookAudienceLocation() {
  return [];
}

/** Recent posts with engagement stats */
async function getFacebookPosts() {
  const { token, pageId } = getEnv();
  const fields = "id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares";
  const data   = await metaFetch(`${BASE}/${pageId}/posts?fields=${fields}&limit=10&access_token=${token}`);

  return (data.data || []).map(p => ({
    id:         p.id,
    platform:   "facebook",
    message:    p.message?.slice(0, 120) || "",
    image:      p.full_picture || null,
    createdAt:  p.created_time,
    likes:      p.likes?.summary?.total_count    ?? 0,
    comments:   p.comments?.summary?.total_count ?? 0,
    shares:     p.shares?.count                  ?? 0,
    engagement: (p.likes?.summary?.total_count    ?? 0) +
                (p.comments?.summary?.total_count  ?? 0) +
                (p.shares?.count                   ?? 0),
  }));
}


// ── Combined summary ──────────────────────────────────────────────────────────

exports.getSocialSummary = async () => {
  const { token, pageId } = getEnv();

  // Fire ALL 6 requests in parallel for maximum speed
  const [fbInsights, fbLocation, fbPosts] =
    await Promise.allSettled([
      getFacebookInsights(),
      getFacebookAudienceLocation(),
      getFacebookPosts(),
      
    ]);

  const safe   = r => r.status === "fulfilled" ? r.value : null;
  const fbIns  = safe(fbInsights) || [];
  const metric = name => fbIns.find(m => m.name === name);

  return {
    facebook: {
      fans:        metric("page_fans")?.total               ?? 0,
      newFans:     metric("page_fan_adds")?.total           ?? 0,
      reach:       metric("page_impressions_unique")?.total ?? 0,
      impressions: metric("page_impressions")?.total        ?? 0,
      engagement:  metric("page_post_engagements")?.total   ?? 0,
      dailyReach:  metric("page_impressions_unique")?.daily ?? [],
      posts:       safe(fbPosts)    || [],
      location:    safe(fbLocation) || [],
    },
    
  };
};