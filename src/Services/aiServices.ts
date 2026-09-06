import { GoogleGenAI, Type } from '@google/genai';

// 1. Declaración de herramienta: Crear tarea
const createTaskDeclaration = {
  name: 'createTask',
  description: 'Crea una nueva tarea o pendiente administrativo en la lista de tareas del usuario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Título o descripción concisa de la tarea a realizar.',
      },
      category: {
        type: Type.STRING,
        description:
          'Categoría de la tarea (ej. General, Finanzas, Campo/Inventario, Trabajo, Estudio, Personal, Salud).',
      },
    },
    required: ['title'],
  },
};

// 2. Declaración de herramienta: Guardar nota
const addNoteDeclaration = {
  name: 'addNote',
  description: 'Guarda una nota rápida, apunte o recordatorio administrativo con su contenido.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: 'Contenido completo o cuerpo de la nota o recordatorio.',
      },
      title: {
        type: Type.STRING,
        description: 'Título opcional breve para la nota.',
      },
    },
    required: ['content'],
  },
};

// 3. Declaración de herramienta: Completar tarea
const completeTaskDeclaration = {
  name: 'completeTask',
  description:
    'Marca una tarea existente como completada buscando por su título o identificador.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskTitleOrId: {
        type: Type.STRING,
        description: 'Título exacto o aproximado de la tarea que se desea marcar como completada.',
      },
    },
    required: ['taskTitleOrId'],
  },
};

// 4. Declaración de herramienta: Consultar tareas pendientes
const getPendingTasksDeclaration = {
  name: 'getPendingTasks',
  description: 'Consulta y lista las tareas pendientes del usuario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description:
          'Filtro opcional por categoría (ej. Finanzas, Campo/Inventario, General, Trabajo, etc.).',
      },
    },
  },
};

// 5. Declaración de herramienta: Temporizador / Alarma Nativa (Capacitor)
const setNativeTimerDeclaration = {
  name: 'setNativeTimer',
  description:
    'Programa un temporizador, alarma o recordatorio sonoro directo en el dispositivo móvil o navegador mediante Capacitor Local Notifications.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Motivo o título del temporizador/alarma (ej. Sacar el pan, Llamar a cliente).',
      },
      seconds: {
        type: Type.NUMBER,
        description:
          'Duración total en segundos (ej. 300 para 5 minutos, 60 para 1 minuto, 10 para 10 segundos).',
      },
      minutes: {
        type: Type.NUMBER,
        description: 'Duración alternativa en minutos.',
      },
    },
    required: ['title'],
  },
};

// 6. Declaración de herramienta: Revisar Correos (Gmail)
const checkUnreadEmailsDeclaration = {
  name: 'checkUnreadEmails',
  description: 'Revisa y lista los correos electrónicos no leídos o bandeja de entrada de Gmail.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: {
        type: Type.NUMBER,
        description: 'Cantidad máxima de correos a consultar (por defecto 5).',
      },
    },
  },
};

// 7. Declaración de herramienta: Responder Correo (Gmail)
const replyToEmailDeclaration = {
  name: 'replyToEmail',
  description: 'Redacta y envía una respuesta a un correo electrónico recibido.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      emailIdOrSenderOrSubject: {
        type: Type.STRING,
        description: 'Remitente, asunto o ID del correo que se desea responder.',
      },
      replyBody: {
        type: Type.STRING,
        description: 'Texto o cuerpo de la respuesta a enviar.',
      },
    },
    required: ['replyBody'],
  },
};

// 8. Declaración de herramienta: Consultar Agenda (Google Calendar)
const getTodayAgendaDeclaration = {
  name: 'getTodayAgenda',
  description: 'Consulta los eventos, reuniones y compromisos agendados para hoy en Google Calendar.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description: 'Fecha a consultar (ej. "today" o "hoy").',
      },
    },
  },
};

// 9. Declaración de herramienta: Agendar Evento (Google Calendar)
const createCalendarEventDeclaration = {
  name: 'createCalendarEvent',
  description: 'Agenda una nueva reunión o compromiso en la agenda de Google Calendar.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Título o motivo de la reunión o compromiso.',
      },
      startTime: {
        type: Type.STRING,
        description: 'Hora de inicio en formato HH:MM (ej. 15:30 o 10:00).',
      },
      durationMinutes: {
        type: Type.NUMBER,
        description: 'Duración en minutos (por defecto 30).',
      },
      description: {
        type: Type.STRING,
        description: 'Notas o detalles adicionales del evento.',
      },
    },
    required: ['title'],
  },
};

export interface ToolCallResult {
  name: string;
  args: Record<string, any>;
}

export interface ProcessCommandOutput {
  toolCall: ToolCallResult | null;
  text: string | null;
}

/**
 * Procesa la orden de voz o texto del usuario mediante Gemini y Function Calling.
 * Configurado para respuestas cortas, ejecutivas y directas aptas para voz (TTS).
 */
export async function processUserCommand(userPrompt: string): Promise<ProcessCommandOutput> {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
    '';

  if (!apiKey || apiKey.trim() === '' || apiKey === 'tu_api_key_aqui') {
    console.error('Error: No se ha configurado VITE_GEMINI_API_KEY en el archivo .env');
    return {
      toolCall: null,
      text: 'Falta configurar la clave VITE_GEMINI_API_KEY en el archivo .env.',
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey: apiKey.trim() });

    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction:
          'Eres Famous Asistente, el administrador personal y ejecutivo de mano derecha del usuario. Tu tono es sumamente profesional, eficiente, claro y conciso. Respondes SIEMPRE con oraciones cortas (máximo 1 o 2 frases breves), diseñadas para ser leídas con total claridad por síntesis de voz (TTS). Si la orden requiere crear tareas, completar tareas, consultar pendientes, guardar notas, programar temporizadores/alarmas con Capacitor, revisar o responder correos con Gmail, o consultar y agendar compromisos con Google Calendar, utiliza SIEMPRE la herramienta adecuada.',
        tools: [
          {
            functionDeclarations: [
              createTaskDeclaration,
              addNoteDeclaration,
              completeTaskDeclaration,
              getPendingTasksDeclaration,
              setNativeTimerDeclaration,
              checkUnreadEmailsDeclaration,
              replyToEmailDeclaration,
              getTodayAgendaDeclaration,
              createCalendarEventDeclaration,
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      return {
        toolCall: {
          name: call.name,
          args: (call.args as Record<string, any>) || {},
        },
        text: null,
      };
    }

    return {
      toolCall: null,
      text: response.text || 'Orden recibida y procesada.',
    };
  } catch (error: any) {
    console.error('Detalle del error al llamar a Gemini:', error);
    return {
      toolCall: null,
      text: `Error de conexión con la IA: ${error?.message || 'Revisa la consola para detalles.'}`,
    };
  }
}
