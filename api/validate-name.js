import {
  findParticipant,
  findParticipantByName
} from "../lib/notion.js";

function normalizeName(input) {
  return String(input || "")
    .trim()
    .replace(/^서포터즈[\s_-]*/i, "")
    .trim();
}

function json(res, body, status = 200) {
  res.status(status);
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(
      res,
      {
        status: "ERROR",
        value: "",
        message: "POST 요청만 지원합니다."
      },
      405
    );
  }

  try {
    const body = req.body || {};

    const rawValue =
      body?.value?.resolved ||
      body?.value?.origin ||
      body?.utterance ||
      "";

    const userKey = body?.user?.id || "";

    const name = normalizeName(rawValue);

    if (!name || name.length > 30) {
      return json(res, {
        status: "FAIL",
        value: "",
        message: "이름을 정확히 입력해주세요."
      });
    }

    if (userKey) {
      const alreadyBound =
        await findParticipant(userKey);

      if (
        alreadyBound &&
        alreadyBound.name !== name
      ) {
        return json(res, {
          status: "FAIL",
          value: "",
          message:
            `이미 ${alreadyBound.name} (으)로 인증되어 있습니다.`
        });
      }
    }

    const participant =
      await findParticipantByName(name);

    if (!participant) {
      return json(res, {
        status: "FAIL",
        value: "",
        message:
          "등록된 서포터즈 명단에서 해당 이름을 찾을 수 없습니다."
      });
    }

    if (participant.ambiguous) {
      return json(res, {
        status: "FAIL",
        value: "",
        message:
          "동일한 이름의 서포터즈가 있습니다. 운영자에게 문의해주세요."
      });
    }

    if (!participant.active) {
      return json(res, {
        status: "FAIL",
        value: "",
        message:
          "현재 비활성화된 서포터즈입니다. 운영자에게 문의해주세요."
      });
    }

    if (
      participant.kakaoUserKey &&
      userKey &&
      participant.kakaoUserKey !== userKey
    ) {
      return json(res, {
        status: "FAIL",
        value: "",
        message:
          "이미 다른 사용자와 연결된 이름입니다."
      });
    }

    return json(res, {
      status: "SUCCESS",
      value: participant.name,
      message: ""
    });
  } catch (error) {
    console.error(
      "validate-name error:",
      error
    );

    return json(res, {
      status: "ERROR",
      value: "",
      message:
        "이름 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    });
  }
}
