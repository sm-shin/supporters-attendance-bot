import { attendanceHandler } from "../lib/attendance.js";

export default async function handler(req, res) {
  return attendanceHandler(req, res, "오전");
}
