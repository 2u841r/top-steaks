const axios = require("axios");

// GitHub only returns ~1 year per contributionsCollection call. Get all years first, then fetch each year.
async function getContributionYears(username, token) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionYears
        }
      }
    }
  `;
  const res = await axios.post(
    "https://api.github.com/graphql",
    { query, variables: { login: username } },
    { headers: { Authorization: `bearer ${token}` } }
  );
  return res.data.data.user.contributionsCollection.contributionYears || [];
}

async function getContributionsForYear(username, token, year) {
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;
  const res = await axios.post(
    "https://api.github.com/graphql",
    { query, variables: { login: username, from, to } },
    { headers: { Authorization: `bearer ${token}` } }
  );
  const weeks = res.data.data.user.contributionsCollection.contributionCalendar.weeks;
  return weeks.flatMap((w) => w.contributionDays);
}

async function getAllContributions(username, token) {
  const years = await getContributionYears(username, token);
  if (years.length === 0) return [];

  const yearResults = await Promise.all(
    years.map((year) => getContributionsForYear(username, token, year))
  );
  const allDays = yearResults.flat();
  allDays.sort((a, b) => a.date.localeCompare(b.date));
  return allDays;
}

// Calculate all streaks from contribution days
function calculateStreaks(days) {
  const streaks = [];
  let current = 0;
  let start = null;

  for (const day of days) {
    if (day.contributionCount > 0) {
      if (current === 0) start = day.date;
      current++;
    } else {
      if (current > 0) {
        streaks.push({ length: current, start });
        current = 0;
        start = null;
      }
    }
  }
  if (current > 0) streaks.push({ length: current, start });

  return streaks.sort((a, b) => b.length - a.length);
}

function generateSVG(username, streaks, topN) {
  const top = streaks.slice(0, topN);
  const maxLen = top[0]?.length || 1;
  const rowH = 44;
  const padX = 16;
  const barMaxW = 260;
  const width = 440;
  const height = 60 + top.length * rowH + 20;

  const colors = ["#F7971E", "#FFD200", "#56CCF2", "#6FCF97", "#BB6BD9", "#EB5757",
    "#F2994A", "#2D9CDB", "#219653", "#9B51E0"];

  const bars = top.map((s, i) => {
    const barW = Math.max(4, (s.length / maxLen) * barMaxW);
    const y = 52 + i * rowH;
    const color = colors[i % colors.length];
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    const isEmoji = i < 3;
    return `
      <text x="${padX}" y="${y + 16}" font-size="13" fill="#aaa" font-family="monospace">${isEmoji ? "" : medal}</text>
      ${isEmoji ? `<text x="${padX - 1}" y="${y + 17}" font-size="14" font-family="monospace">${medal}</text>` : ""}
      <rect x="${padX + 30}" y="${y}" width="${barW}" height="22" rx="4" fill="${color}" opacity="0.85"/>
      <text x="${padX + 30 + barW + 8}" y="${y + 15}" font-size="13" fill="#eee" font-family="monospace" font-weight="bold">${s.length}d</text>
      <text x="${padX + 30 + barW + 8}" y="${y + 28}" font-size="10" fill="#888" font-family="monospace">from ${s.start}</text>
    `;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="10" fill="url(#bg)" stroke="#30363d" stroke-width="1"/>
  <text x="${padX}" y="30" font-size="15" fill="#e6edf3" font-family="monospace" font-weight="bold">🔥 Top ${topN} Streaks — ${username}</text>
  <line x1="${padX}" y1="40" x2="${width - padX}" y2="40" stroke="#30363d" stroke-width="1"/>
  ${bars}
</svg>`;
}

module.exports = async (req, res) => {
  const { username, top = "3", token: queryToken } = req.query;

  if (!username) {
    return res.status(400).send("?username= is required");
  }

  const token = queryToken || process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).send("GITHUB_TOKEN not set");

  try {
    const days = await getAllContributions(username, token);
    const streaks = calculateStreaks(days);
    const topN = Math.min(parseInt(top) || 3, 10);
    const svg = generateSVG(username, streaks, topN);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  } catch (e) {
    res.status(500).send(`Error: ${e.message}`);
  }
};
