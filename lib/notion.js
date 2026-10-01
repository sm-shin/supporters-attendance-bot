const NOTION_BASE = "https://api.notion.com/v1";
const VERSION = process.env.NOTION_VERSION || "2025-09-03";

function headers() {
  if (!process.env.notion_token) throw new Error("notion_token is missing");
  return {
    "Authorization": `Bearer ${process.env.notion_token}`,
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
  if (!res.ok) {
    throw new Error(`Notion ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function richText(content) {
  return [{ type: "text", text: { content } }];
}

export async function findParticipant(kakaoUserKey) {
  const id = process.env.notion_participants_data_source_id;
  const data = await notion(`/data_sources/${id}/query`, {
    method: "POST",
    body: JSON.stringify({
      page_size: 1,
      filter: {
        property: "KakaoUserKey",
        rich_text: { equals: kakaoUserKey }
      }
    })
  });
  const page = data.results?.[0];
  if (!page) return null;
  const name = page.properties?.Name?.title?.map(x => x.plain_text).join("") || "";
  const active = page.properties?.Active?.checkbox ?? true;
  return { pageId: page.id, name, active };
}

export async function upsertParticipant(kakaoUserKey, name, isoNow) {
  const current = await findParticipant(kakaoUserKey);

  if (current) {
    await notion(`/pages/${current.pageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          Name: { title: richText(name) },
          Active: { checkbox: true }
        }
      })
    });
    return { created: false, name };
  }

  const id = process.env.notion_participants_data_source_id;
  await notion(`/pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: id },
      properties: {
        Name: { title: richText(name) },
        KakaoUserKey: { rich_text: richText(kakaoUserKey) },
        RegisteredAt: { date: { start: isoNow } },
        Active: { checkbox: true }
      }
    })
  });
  return { created: true, name };
}

export async function findAttendance(kakaoUserKey, date, session) {
  const id = process.env.notion_attendance_data_source_id;
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
  const id = process.env.notion_attendance_data_source_id;
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
