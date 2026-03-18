import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;
  if (!code) {
    return { statusCode: 400, body: "Missing code parameter" };
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };

  if (data.error || !data.access_token) {
    return { statusCode: 401, body: `OAuth error: ${data.error ?? "no token"}` };
  }

  const siteUrl = process.env.SITE_URL || "http://localhost:5173";

  return {
    statusCode: 302,
    headers: {
      Location: `${siteUrl}/#token=${data.access_token}`,
    },
    body: "",
  };
};

export { handler };
