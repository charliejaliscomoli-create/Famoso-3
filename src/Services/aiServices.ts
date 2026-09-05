import { GoogleGenAI, Type } from '@google/genai';

// Inicialización de la API de Gemini utilizando la variable de entorno de Vite
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

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
 * Configurado para respuestas breves, claras y directas aptas para voz (TTS).
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
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction:
          'Eres Famous Asistente, un asistente administrativo personal de productividad ágil y eficiente. Ayudas a gestionar tareas y notas mediante comandos de voz. Si el usuario pide crear una tarea, agregar una nota, completar una tarea o consultar pendientes, invoca la herramienta correspondiente. Responde SIEMPRE con frases breves, claras y directas (máximo 1 o 2 oraciones breves), optimizadas para síntesis de voz.',
        tools: [
          {
            functionDeclarations: [
              createTaskDeclaration,
              addNoteDeclaration,
              completeTaskDeclaration,
              getPendingTasksDeclaration,
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
      text: response.text || 'Orden comprendida.',
    };
  } catch (error: any) {
    console.error('Detalle del error al llamar a Gemini:', error);
    return {
      toolCall: null,
      text: `Error de conexión con la IA: ${error?.message || 'Revisa la consola para más detalles.'}`,
    };
  }
}
