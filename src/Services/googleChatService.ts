import { getAccessToken } from './authService';

export interface ChatSpace {
  name: string; // e.g. 'spaces/AAAAxxxxxx'
  displayName: string;
  spaceType: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createTime: string;
}

const LOCAL_CHAT_SPACES_KEY = 'famous_google_chat_spaces_v1';
const LOCAL_CHAT_MSGS_KEY = 'famous_google_chat_msgs_v1';

const getLocalSpaces = (): ChatSpace[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_SPACES_KEY);
    return raw ? JSON.parse(raw) : [
      { name: 'spaces/general', displayName: 'Espacio General de Operaciones', spaceType: 'SPACE' },
      { name: 'spaces/gerencia', displayName: 'Comité de Gerencia y Finanzas', spaceType: 'SPACE' },
      { name: 'spaces/soporte', displayName: 'Canal Directo de Soporte AI', spaceType: 'DIRECT_MESSAGE' },
    ];
  } catch {
    return [];
  }
};

const getLocalMessages = (spaceName: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_CHAT_MSGS_KEY}_${spaceName}`);
    return raw ? JSON.parse(raw) : [
      { id: 'm1', senderName: 'Carlos M.', text: 'Confirmado el reporte consolidado para la sesión de hoy.', createTime: new Date(Date.now() - 3600000).toLocaleTimeString() },
      { id: 'm2', senderName: 'Asistente IA', text: 'Tareas y correos sincronizados automáticamente.', createTime: new Date(Date.now() - 1800000).toLocaleTimeString() },
    ];
  } catch {
    return [];
  }
};

const setLocalMessages = (spaceName: string, msgs: ChatMessage[]) => {
  try {
    localStorage.setItem(`${LOCAL_CHAT_MSGS_KEY}_${spaceName}`, JSON.stringify(msgs));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
};

export const googleChatService = {
  async getSpaces(): Promise<{ spaces: ChatSpace[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { spaces: getLocalSpaces(), isRealApi: false };
    }

    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Google Chat API Error ${res.status}`);
      const data = await res.json();
      const rawSpaces = data.spaces || [];
      const spaces: ChatSpace[] = rawSpaces.map((s: any) => ({
        name: s.name,
        displayName: s.displayName || s.name,
        spaceType: s.spaceType || 'SPACE',
      }));

      localStorage.setItem(LOCAL_CHAT_SPACES_KEY, JSON.stringify(spaces));
      return { spaces, isRealApi: true };
    } catch (err) {
      console.warn('Error fetching Google Chat spaces, using fallback:', err);
      return { spaces: getLocalSpaces(), isRealApi: false };
    }
  },

  async getMessages(spaceName: string): Promise<{ messages: ChatMessage[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { messages: getLocalMessages(spaceName), isRealApi: false };
    }

    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Google Chat Messages API Error ${res.status}`);
      const data = await res.json();
      const rawMsgs = data.messages || [];
      const messages: ChatMessage[] = rawMsgs.map((m: any) => ({
        id: m.name,
        senderName: m.sender?.displayName || 'Usuario',
        text: m.text || '',
        createTime: m.createTime ? new Date(m.createTime).toLocaleTimeString() : new Date().toLocaleTimeString(),
      }));

      setLocalMessages(spaceName, messages);
      return { messages, isRealApi: true };
    } catch (err) {
      console.warn('Error fetching Chat messages, using fallback:', err);
      return { messages: getLocalMessages(spaceName), isRealApi: false };
    }
  },

  async sendMessage(spaceName: string, text: string): Promise<{ message: ChatMessage; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (res.ok) {
          const m = await res.json();
          const newMsg: ChatMessage = {
            id: m.name,
            senderName: m.sender?.displayName || 'Tú',
            text: m.text || text,
            createTime: new Date().toLocaleTimeString(),
          };
          const current = getLocalMessages(spaceName);
          setLocalMessages(spaceName, [...current, newMsg]);
          return { message: newMsg, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error sending Google Chat message via API:', err);
      }
    }

    const fallbackMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      senderName: 'Tú',
      text,
      createTime: new Date().toLocaleTimeString(),
    };
    const current = getLocalMessages(spaceName);
    setLocalMessages(spaceName, [...current, fallbackMsg]);
    return { message: fallbackMsg, isRealApi: false };
  },
};
