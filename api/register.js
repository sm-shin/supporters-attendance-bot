import { getUserKey, getParam, simpleText, sendJson, seoulNow } from "../lib/kakao.js";
import { upsertParticipant } from "../lib/notion.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, { error: "POST only" }, 405);

  try {
    const body = req.body || {};
    const userKey = getUserKey(body);
    const name = (getParam(body, "name") || body?.userRequest?.utterance || "").trim();

    if (!userKey) {
      return sendJson(res, simpleText("사용자 식별값을 확인할 수 없습니다. 채널에서 다시 시도해주세요."));
    }
    if (!name || name.length > 30) {
      return sendJson(res, simpleText("출석에 사용할 이름 또는 오픈채팅 닉네임을 입력해주세요."));
    }

    const { isoLocal } = seoulNow();
    await upsertParticipant(userKey, name, isoLocal);

    return sendJson(res, simpleText(
      `✅ 이름 등록이 완료되었습니다.\n\n출석 이름: ${name}\n\n이제 오전 또는 오후 출석을 선택해주세요.`,
      ["오전 출석", "오후 출석"]
    ));
  } catch (e) {
    console.error(e);
    return sendJson(res, simpleText("등록 처리 중 오류가 발생했습니다. 운영자에게 문의해주세요."));
  }
}
