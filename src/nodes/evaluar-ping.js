// Flujo 05, nodo "evaluar-ping": decide si la demo está caída y si toca avisar
// (como mucho un aviso por hora, usando el estado guardado en el workflow).
// @include shared/telegram

function run(item, state, env, now) {
  const r = item.json || {};
  const ok = r.success === true && Array.isArray(r.data);
  const ts = (now || new Date()).getTime();
  const lastAlert = state.lastAlertAt || 0;
  const shouldAlert = !ok && ts - lastAlert > 60 * 60 * 1000;
  const text = ok ? null : `⚠️ <b>Foodzinder no responde</b>\n${escapeHtml(r.error || r.message || "sin respuesta válida de /api/v1/restaurants")}\n${(env.FOODZINDER_BASE_URL || "")}`;
  return [{
    json: {
      ok,
      shouldAlert,
      nextState: { lastAlertAt: shouldAlert ? ts : lastAlert, lastOkAt: ok ? ts : state.lastOkAt || null },
      telegramBody: shouldAlert ? tgMessage(env.TELEGRAM_ADMIN_CHAT_ID, text) : null,
      checkedAt: new Date(ts).toISOString(),
    },
  }];
}

const st = $getWorkflowStaticData("global");
const out = run($input.first(), st, $env, new Date());
Object.assign(st, out[0].json.nextState);
return out; // @n8n-invoke
