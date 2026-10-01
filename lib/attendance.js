import { getUserKey, simpleText, sendJson, seoulNow, monthDay } from "../lib/kakao.js";
import { findParticipant, findAttendance, createAttendance } from "../lib/notion.js";

export async function attendanceHandler(req, res, session) {
  if (req.method !== "POST") return sendJson(res, { error: "POST only" }, 405);

  try {
    const userKey = getUserKey(req.body || {});
    if (!userKey) {
      return sendJson(res, simpleText("사용자 식별값을 확인할 수 없습니다. 채널에서 다시 시도해주세요."));
    }

    const { date, isoLocal, weekday } = seoulNow();

    if (weekday === "일") {
      return sendJson(res, simpleText("오늘은 출석 운영일이 아닙니다.\n출석은 월요일부터 토요일까지 가능합니다."));
    }

    const participant = await findParticipant(userKey);
    if (!participant) {
      return sendJson(res, simpleText(
        "먼저 출석에 사용할 이름을 등록해주세요.",
        ["이름 등록"]
      ));
    }
    if (!participant.active) {
      return sendJson(res, simpleText("현재 출석이 비활성화된 참여자입니다. 운영자에게 문의해주세요."));
    }

    const duplicate = await findAttendance(userKey, date, session);
    if (duplicate) {
      return sendJson(res, simpleText(`⚠️ 이미 오늘 ${session} 출석이 완료되었습니다.`));
    }

    await createAttendance({
      kakaoUserKey: userKey,
      name: participant.name,
      participantPageId: participant.pageId,
      date,
      session,
      checkedAt: isoLocal
    });

    const message = `✅ ${monthDay(date)} ${session} 서포터즈 활동 출석합니다.\n${participant.name}`;

    return sendJson(res, simpleText(
      `✅ 출석이 완료되었습니다.\n\n오픈채팅방에 아래 멘트를 남겨주세요.\n\n${message}`
    ));
  } catch (e) {
    console.error(e);
    return sendJson(res, simpleText("출석 처리 중 오류가 발생했습니다. 운영자에게 문의해주세요."));
  }
}
