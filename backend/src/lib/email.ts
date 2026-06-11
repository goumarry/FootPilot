import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');

const FROM = process.env.SMTP_FROM ?? 'FootPilot <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

export async function sendInvitationEmail(opts: {
  to: string;
  firstName: string;
  lastName: string;
  role: string;
  clubNom: string;
  token: string;
}) {
  const link = `${APP_URL}/register/${opts.token}`;
  const roleLabel: Record<string, string> = {
    GESTIONNAIRE: 'Gestionnaire',
    ENTRAINEUR: 'Entraîneur',
    JOUEUR: 'Joueur',
  };

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Invitation FootPilot — ${opts.clubNom}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#4C1D95;">FootPilot</h2>
        <p>Bonjour <strong>${opts.firstName} ${opts.lastName}</strong>,</p>
        <p>Vous avez été invité(e) à rejoindre le club <strong>${opts.clubNom}</strong>
           en tant que <strong>${roleLabel[opts.role] ?? opts.role}</strong>.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer votre compte :</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6D28D9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Créer mon compte
        </a>
        <p style="color:#9390B0;font-size:12px;">Ce lien expire dans 7 jours.</p>
        <p style="color:#9390B0;font-size:12px;">
          Ou copiez ce lien : <a href="${link}">${link}</a>
        </p>
      </div>
    `,
  });
}

export async function sendEmailVerificationMail(opts: {
  to: string;
  firstName: string;
  token: string;
}) {
  const link = `${APP_URL}/verify-email/${opts.token}`;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'FootPilot — Confirmez votre adresse e-mail',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#4C1D95;">FootPilot</h2>
        <p>Bonjour <strong>${opts.firstName}</strong>,</p>
        <p>Merci pour votre inscription. Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail et activer votre compte :</p>
        <a href="${link}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#6D28D9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Confirmer mon adresse e-mail
        </a>
        <p style="color:#9390B0;font-size:12px;">Ce lien expire dans 24 heures.</p>
        <p style="color:#9390B0;font-size:12px;">
          Ou copiez ce lien : <a href="${link}">${link}</a>
        </p>
        <p style="color:#9390B0;font-size:12px;">Si vous n'avez pas créé de compte FootPilot, ignorez cet e-mail.</p>
      </div>
    `,
  });
}

export async function sendActualiteEmail(opts: {
  to: string[];
  clubNom: string;
  titre: string;
  contenu: string;
  auteur: string;
}) {
  if (opts.to.length === 0) return;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `[${opts.clubNom}] ${opts.titre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#4C1D95;">FootPilot — ${opts.clubNom}</h2>
        <h3>${opts.titre}</h3>
        <p>${opts.contenu.replace(/\n/g, '<br>')}</p>
        <p style="color:#9390B0;font-size:12px;">Publié par ${opts.auteur}</p>
      </div>
    `,
  });
}
