const NOTION_BASE = "https://api.notion.com/v1";
const VERSION = process.env.NOTION_VERSION || "2025-09-03";

function headers() {
  const rawToken = process.env.NOTION_TOKEN || "";
  const token = rawToken.trim().split.(/\s+/)[0];
  
  if (!token) {
    throw new Error("NOTION_TOKEN is missing");
  }
  
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": VERSION
  };
}

async function notion(path, options = {}) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Notion ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function richText(content) {
  return [{ type: "text", text: { content } }];
}
function plainRichText(property) {
  return property?.rich_text?.map(x => x.plain_text).join("") || "";
}
function plainTitle(property) {
  return property?.title?.map(x => x.plain_text).join("") || "";
}

export async function findParticipant(kakaoUserKey) {
  const id = process.env.NOTION_PARTICIPANTS_DATA_SOURCE_ID;
  const data = await notion(`/data_sources/${id}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: { property: "KakaoUserKey", rich_text: { equals: kakaoUserKey } }
    })
  });
  const page = data.results?.[0];
  if (!page) return null;

  return {
    pageId: page.id,
    name: plainTitle(page.properties?.Name),
    kakaoUserKey: plainRichText(page.properties?.KakaoUserKey),
    active: page.properties?.Active?.checkbox ?? true
  };
}

export async function findParticipantByName(name) {
  const id = process.env.NOTION_PARTICIPANTS_DATA_SOURCE_ID;
  const data = await notion(`/data_sources/${id}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 2,
      filter: { property: "Name", title: { equals: name } }
    })
  });

  if (!data.results?.length) return null;
  if (data.results.length > 1) return { ambiguous: true, matches: data.results.length };

  const page = data.results[0];
  return {
    pageId: page.id,
    name: plainTitle(page.properties?.Name),
    kakaoUserKey: plainRichText(page.properties?.KakaoUserKey),
    active: page.properties?.Active?.checkbox ?? true,
    ambiguous: false
  };
}

export async function bindParticipantToKakao(pageId, kakaoUserKey) {
  return notion(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: { KakaoUserKey: { rich_text: richText(kakaoUserKey) } }
    })
  });
}

export async function findAttendance(kakaoUserKey, date, session) {
  const id = process.env.NOTION_ATTENDANCE_DATA_SOURCE_ID;
  const data = await notion(`/data_sources/${id}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: {
        and: [
          { property: "KakaoUserKey", rich_text: { equals: kakaoUserKey } },
          { property: "Date", date: { equals: date } },
          { property: "Session", select: { equals: session } }
        ]
      }
    })
  });
  return data.results?.[0] || null;
}

export async function createAttendance({ kakaoUserKey, name, date, session, checkedAt }) {
  const id = process.env.NOTION_ATTENDANCE_DATA_SOURCE_ID;
  const logicalKey = `${date}_${session}_${kakaoUserKey}`;

  return notion(`/pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: id },
      properties: {
        Name: { title: richText(name) },
        KakaoUserKey: { rich_text: richText(kakaoUserKey) },
        Date: { date: { start: date } },
        Session: { select: { name: session } },
        CheckedAt: { date: { start: checkedAt } },
        AttendanceKey: { rich_text: richText(logicalKey) }
      }
    })
  });
}
