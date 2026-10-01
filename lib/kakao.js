export function getUserKey(body) {
  return body?.userRequest?.user?.id
    || body?.userRequest?.user?.properties?.botUserKey
    || body?.userRequest?.user?.properties?.plusfriendUserKey
    || null;
}

export function getParam(body, key) {
  return body?.action?.params?.[key] ?? null;
}

export function simpleText(text, quickReplies = []) {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
      ...(quickReplies.length ? {
        quickReplies: quickReplies.map(label => ({
          messageText: label,
          action: "message",
          label
        }))
      } : {})
    }
  };
}

export function sendJson(res, payload, status = 200) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function seoulNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(now).reduce((a,p) => (a[p.type]=p.value,a), {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  const isoLocal = `${date}T${time}+09:00`;

  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", weekday: "short"
  }).format(now);

  return { now, date, time, isoLocal, weekday };
}

export function monthDay(date) {
  const [,m,d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
