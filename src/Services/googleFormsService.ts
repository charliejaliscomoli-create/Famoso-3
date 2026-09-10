import { getAccessToken } from './authService';

export interface FormItem {
  id: string;
  title: string;
  documentTitle: string;
  responderUri?: string;
  responsesCount?: number;
}

const LOCAL_FORMS_KEY = 'famous_google_forms_fallback_v1';

const getLocalForms = (): FormItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_FORMS_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'form-1',
        title: 'Encuesta de Satisfacción de Clientes Q2',
        documentTitle: 'Encuesta de Satisfacción de Clientes Q2',
        responderUri: 'https://docs.google.com/forms/d/e/demo1/viewform',
        responsesCount: 14,
      },
      {
        id: 'form-2',
        title: 'Registro de Solicitud de Equipos e Insumos',
        documentTitle: 'Registro de Solicitud de Equipos e Insumos',
        responderUri: 'https://docs.google.com/forms/d/e/demo2/viewform',
        responsesCount: 8,
      }
    ];
  } catch {
    return [];
  }
};

const setLocalForms = (forms: FormItem[]) => {
  try {
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(forms));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
};

export const googleFormsService = {
  async getForms(): Promise<{ forms: FormItem[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { forms: getLocalForms(), isRealApi: false };
    }

    try {
      // Google Drive API query for mimeType='application/vnd.google-apps.form'
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.form'&fields=files(id,name,webViewLink)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error(`Google Drive Forms Search Error ${res.status}`);
      const data = await res.json();
      const files = data.files || [];

      const items: FormItem[] = files.map((f: any) => ({
        id: f.id,
        title: f.name,
        documentTitle: f.name,
        responderUri: f.webViewLink,
        responsesCount: 0,
      }));

      setLocalForms(items);
      return { forms: items, isRealApi: true };
    } catch (err) {
      console.warn('Error fetching Google Forms, using fallback:', err);
      return { forms: getLocalForms(), isRealApi: false };
    }
  },

  async createForm(title: string): Promise<{ form: FormItem; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const res = await fetch('https://forms.googleapis.com/v1/forms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            info: {
              title: title,
              documentTitle: title,
            },
          }),
        });

        if (res.ok) {
          const item = await res.json();
          const newForm: FormItem = {
            id: item.formId,
            title: item.info?.title || title,
            documentTitle: item.info?.documentTitle || title,
            responderUri: item.responderUri,
            responsesCount: 0,
          };
          const current = getLocalForms();
          setLocalForms([newForm, ...current]);
          return { form: newForm, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error creating Google Form via API:', err);
      }
    }

    const fallbackForm: FormItem = {
      id: 'form-' + Date.now(),
      title,
      documentTitle: title,
      responderUri: `https://docs.google.com/forms/d/demo-${Date.now()}/viewform`,
      responsesCount: 0,
    };
    const current = getLocalForms();
    setLocalForms([fallbackForm, ...current]);
    return { form: fallbackForm, isRealApi: false };
  },

  async getFormResponses(formId: string): Promise<{ responsesCount: number; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { responsesCount: Math.floor(Math.random() * 10) + 1, isRealApi: false };
    }

    try {
      const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const count = (data.responses || []).length;
        return { responsesCount: count, isRealApi: true };
      }
    } catch (err) {
      console.warn('Error fetching form responses:', err);
    }
    return { responsesCount: 5, isRealApi: false };
  },
};
