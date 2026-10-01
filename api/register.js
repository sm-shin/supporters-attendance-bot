import { getUserKey, getParam, simpleText, sendJson } from "../lib/kakao.js";
import { findParticipant, findParticipantByName, bindParticipantToKakao } from "../lib/notion.js";

function normalizeName(input) {
  return input.trim().replace(/^서포터즈[\\s_-]*/i, "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, { error: "POST only" }, 405);

  try {
    const body = req.body || {};
    const userKey = getUserKey(body);

    if (!userKey) {
      return sendJson(res, simpleText("사용자 식별값을 확인할 수 없습니다. 채널에서 다시 시도해주세요."));
    }

    const alreadyBound = await findParticipant(userKey);
    if (alreadyBound) {
      return sendJson(
        res,
        simpleText(`이미 서포터즈 인증이 완료되어 있습니다.\n\n이름: ${alreadyBound.name}`)
      );
    }

    const rawName = (getParam(body, "name") || body?.userRequest?.utterance || "").trim();
    const name = normalizeName(rawName);

    if (!name || name.length > 30) {
      return sendJson(
        res,
        simpleText("출석에 사용할 이름을 정확히 입력해주세요.\n예) 홍길동 또는 서포터즈_홍길동")
      );
    }

    const participant = await findParticipantByName(name);

    if (!participant) {
      return sendJson(
        res,
        simpleText("등록된 서포터즈 명단에서 해당 이름을 찾을 수 없습니다.\n이름을 다시 확인하거나 운영자에게 문의해주세요.")
      );
    }

    if (participant.ambiguous) {
      return sendJson(
        res,
        simpleText("동일한 이름의 서포터즈가 2명 이상 등록되어 있어 자동 인증할 수 없습니다.\n운영자에게 문의해주세요.")
      );
    }

    if (!participant.active) {
      return sendJson(res, simpleText("현재 비활성화된 서포터즈입니다. 운영자에게 문의해주세요."));
    }

    if (participant.kakaoUserKey && participant.kakaoUserKey !== userKey) {
      return sendJson(
        res,
        simpleText("이미 다른 카카오 사용자와 연결된 이름입니다.\n운영자에게 문의해주세요.")
      );
    }

    await bindParticipantToKakao(participant.pageId, userKey);

    return sendJson(
      res,
      simpleText(`✅ 서포터즈 인증이 완료되었습니다.\n\n이름: ${participant.name}\n\n이제 오전 또는 오후 출석을 선택해주세요.`)
    );
  } catch (e) {
    console.error(e);
    return sendJson(res, simpleText("인증 처리 중 오류가 발생했습니다. 운영자에게 문의해주세요."));
  }
}
