import { getAccessToken } from './authService';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread?: boolean;
}

const LOCAL_GMAIL_KEY = 'famous_gmail_fallback_v1';

const getLocalEmails = (): GmailMessage[] => {
  try {
    const raw = localStorage.getItem(LOCAL_GMAIL_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'msg-101',
        threadId: 'th-101',
        from: 'Director Comercial <director@empresa.com>',
        subject: 'Reporte Semanal de Ventas y Proyecciones',
        snippet: 'Hola, adjunto el reporte resumido del segundo trimestre. Por favor revisa los números claves.',
        date: new Date(Date.now() - 3600000 * 3).toLocaleString(),
        isUnread: true,
      },
      {
        id: 'msg-102',
        threadId: 'th-102',
        from: 'Soporte Técnico Google <support@google.com>',
        subject: 'Confirmación de Licencias y Accesos de Cuenta',
        snippet: 'Se han otorgado correctamente los permisos ejecutivos para Google Workspace.',
        date: new Date(Date.now() - 3600000 * 12).toLocaleString(),
        isUnread: true,
      },
      {
        id: 'msg-103',
        threadId: 'th-103',
        from: 'Finanzas <facturacion@proveedores.com>',
        subject: 'Factura Pendiente de Aprobación #8942',
        snippet: 'Estimado Administrador, se solicita la revisión de la orden de pago para el lote de insumos.',
        date: new Date(Date.now() - 3600000 * 24).toLocaleString(),
        isUnread: false,
      }
    ];
  } catch {
    return [];
  }
};

const setLocalEmails = (msgs: GmailMessage[]) => {
  try {
    localStorage.setItem(LOCAL_GMAIL_KEY, JSON.stringify(msgs));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
};

export const gmailService = {
  async getUnreadEmails(maxResults: number = 10): Promise<{ messages: GmailMessage[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { messages: getLocalEmails().filter((m) => m.isUnread), isRealApi: false };
    }

    try {
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!listRes.ok) throw new Error(`Gmail API Error ${listRes.status}`);
      const listData = await listRes.json();
      const rawMessages = listData.messages || [];

      const messages: GmailMessage[] = await Promise.all(
        rawMessages.map(async (m: { id: string; threadId: string }) => {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!detailRes.ok) {
            return {
              id: m.id,
              threadId: m.threadId,
              from: 'Desconocido',
              subject: '(Sin asunto)',
              snippet: '',
              date: new Date().toLocaleDateString(),
              isUnread: true,
            };
          }
          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Desconocido';
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(Sin asunto)';
          const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || new Date().toLocaleDateString();

          return {
            id: detail.id,
            threadId: detail.threadId,
            from,
            subject,
            snippet: detail.snippet || '',
            date: dateHeader,
            isUnread: true,
          };
        })
      );

      setLocalEmails(messages);
      return { messages, isRealApi: true };
    } catch (err) {
      console.warn('Error fetching Gmail messages, using fallback:', err);
      return { messages: getLocalEmails().filter((m) => m.isUnread), isRealApi: false };
    }
  },

  async sendEmail(data: { to: string; subject: string; body: string }): Promise<{ success: boolean; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const rawMessage = [
          `To: ${data.to}`,
          'Content-Type: text/plain; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${data.subject}`,
          '',
          data.body,
        ].join('\r\n');

        const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        });

        if (res.ok) {
          return { success: true, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error sending Gmail via API:', err);
      }
    }

    // Fallback simulation
    const current = getLocalEmails();
    const sentMsg: GmailMessage = {
      id: 'msg-' + Date.now(),
      threadId: 'th-' + Date.now(),
      from: 'Yo (Enviado)',
      subject: data.subject,
      snippet: data.body,
      date: new Date().toLocaleString(),
      isUnread: false,
    };
    setLocalEmails([sentMsg, ...current]);
    return { success: true, isRealApi: false };
  },
};
