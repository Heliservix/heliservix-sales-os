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
