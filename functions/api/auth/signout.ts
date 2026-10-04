import { cookie, json, SESSION_COOKIE, type Env } from "../../_lib/session";

export const onRequestPost: PagesFunction<Env> = async () =>
  json({ ok: true }, { headers: { "Set-Cookie": cookie(SESSION_COOKIE, "", 0) } });
