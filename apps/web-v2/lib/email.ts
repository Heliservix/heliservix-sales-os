// Email notifications via Resend (https://resend.com). Adolfo only has a
// Hostinger mailbox (no transactional email API), so this uses Resend's
// HTTP API directly instead — no extra npm package needed, just fetch().
//
// Configure in .env.local (see .env.example):
//   RESEND_API_KEY      — from resend.com after creating a free account
//   NOTIFY_EMAIL         — where the "technician uploaded a report" alert goes
//   NOTIFY_FROM_EMAIL    — the "from" address (must be on a domain verified in Resend)
//
// Deliberately fails soft: if RESEND_API_KEY isn't set yet, this logs a
// warning and returns instead of throwing, so a técnico's report upload
// still succeeds even before Adolfo finishes setting up Resend.
export async function sendReportUploadedEmail(params: {
  technicianName: string;
  campaignName: string;
  summaryMessage: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "HeliServiX OS <onboarding@resend.dev>";

  if (!apiKey || !notifyEmail) {
    console.warn(
      "[email] RESEND_API_KEY o NOTIFY_EMAIL no están configurados todavía — no se envió el aviso de reporte subido."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        subject: `Reporte semanal subido — ${params.campaignName}`,
        text: [
          `${params.technicianName} subió el reporte semanal de la faena "${params.campaignName}".`,
          "",
          params.summaryMessage,
          "",
          "Entra a HeliServiX OS para ver los detalles."
        ].join("\n")
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`[email] Resend respondió ${response.status}: ${body}`);
    }
  } catch (error) {
    console.warn("[email] No se pudo enviar el aviso por correo:", error);
  }
}

// Sends the técnico their brand-new login (email + temporary password) when
// Adolfo creates their account from the Personal module. Unlike
// sendReportUploadedEmail (which fails soft), this one throws on failure —
// createTechnicianAccount in app/personnel/actions.ts needs to know the
// técnico actually received their password, since there's no other way for
// them to get it (nobody types passwords into this app, and Adolfo shouldn't
// have to relay it by phone/WhatsApp for security reasons).
export async function sendAccountCreatedEmail(params: { to: string; fullName: string; tempPassword: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "HeliServiX OS <onboarding@resend.dev>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.heliservix.com";

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurado — no se puede enviar la contraseña temporal por correo. Configúralo en las variables de entorno (ver .env.example)."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject: "Tu acceso a HeliServiX OS",
      text: [
        `Hola ${params.fullName},`,
        "",
        "Adolfo te creó una cuenta para entrar a HeliServiX OS.",
        "",
        `Enlace: ${siteUrl}/login`,
        `Usuario (correo): ${params.to}`,
        `Contraseña temporal: ${params.tempPassword}`,
        "",
        "Por seguridad, cámbiala apenas entres la primera vez."
      ].join("\n")
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend respondió ${response.status}: ${body}`);
  }
}
