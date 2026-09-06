import { getAccessToken } from './authService';

export interface GoogleContact {
  resourceName: string;
  name: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  company?: string;
  title?: string;
}

const LOCAL_CONTACTS_KEY = 'famous_google_contacts_fallback';

const INITIAL_CONTACTS: GoogleContact[] = [
  {
    resourceName: 'people/c101',
    name: 'Carlos Mendoza',
    givenName: 'Carlos',
    familyName: 'Mendoza',
    email: 'cmendoza@empresa.com',
    phone: '+52 33 1234 5678',
    company: 'Director de Operaciones',
  },
  {
    resourceName: 'people/c102',
    name: 'Laura Gómez',
    givenName: 'Laura',
    familyName: 'Gómez',
    email: 'lgomez@empresa.com',
    phone: '+52 33 9876 5432',
    company: 'Finanzas y Administración',
  },
  {
    resourceName: 'people/c103',
    name: 'Proveedores VIP',
    email: 'vip@proveedores.com',
    phone: '+52 800 555 0199',
    company: 'Logística Insumos',
  },
];

export const googleContactsService = {
  // Get/List Contacts
  async getContacts(pageSize: number = 50): Promise<{ contacts: GoogleContact[]; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const res = await fetch(
          `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const items: GoogleContact[] = (data.connections || []).map((p: any) => {
            const primaryName = p.names?.[0]?.displayName || 'Sin nombre';
            const primaryEmail = p.emailAddresses?.[0]?.value || '';
            const primaryPhone = p.phoneNumbers?.[0]?.value || '';
            const photoUrl = p.photos?.[0]?.url || '';
            const org = p.organizations?.[0]?.name || p.organizations?.[0]?.title || '';

            return {
              resourceName: p.resourceName,
              name: primaryName,
              givenName: p.names?.[0]?.givenName || '',
              familyName: p.names?.[0]?.familyName || '',
              email: primaryEmail,
              phone: primaryPhone,
              photoUrl,
              company: org,
            };
          });

          return { contacts: items, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error al obtener contactos de Google People API:', err);
      }
    }

    // Local fallback
    try {
      const raw = localStorage.getItem(LOCAL_CONTACTS_KEY);
      const items = raw ? JSON.parse(raw) : INITIAL_CONTACTS;
      return { contacts: items, isRealApi: false };
    } catch {
      return { contacts: INITIAL_CONTACTS, isRealApi: false };
    }
  },

  // Search Contacts
  async searchContacts(query: string): Promise<{ contacts: GoogleContact[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    const cleanQuery = query.toLowerCase().trim();

    if (token && cleanQuery) {
      try {
        const res = await fetch(
          `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(
            cleanQuery
          )}&readMask=names,emailAddresses,phoneNumbers,photos,organizations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          const results: GoogleContact[] = (data.results || []).map((r: any) => {
            const p = r.person;
            const primaryName = p.names?.[0]?.displayName || 'Sin nombre';
            const primaryEmail = p.emailAddresses?.[0]?.value || '';
            const primaryPhone = p.phoneNumbers?.[0]?.value || '';
            const photoUrl = p.photos?.[0]?.url || '';
            const org = p.organizations?.[0]?.name || p.organizations?.[0]?.title || '';

            return {
              resourceName: p.resourceName,
              name: primaryName,
              givenName: p.names?.[0]?.givenName || '',
              familyName: p.names?.[0]?.familyName || '',
              email: primaryEmail,
              phone: primaryPhone,
              photoUrl,
              company: org,
            };
          });

          return { contacts: results, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error buscando contactos en Google People API:', err);
      }
    }

    // Fallback local search
    const { contacts } = await googleContactsService.getContacts();
    if (!cleanQuery) return { contacts, isRealApi: false };

    const filtered = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(cleanQuery) ||
        (c.email && c.email.toLowerCase().includes(cleanQuery)) ||
        (c.phone && c.phone.includes(cleanQuery)) ||
        (c.company && c.company.toLowerCase().includes(cleanQuery))
    );

    return { contacts: filtered, isRealApi: false };
  },

  // Create Contact
  async createContact(
    name: string,
    email?: string,
    phone?: string,
    company?: string
  ): Promise<{ contact: GoogleContact; isRealApi: boolean }> {
    const token = await getAccessToken();

    const nameParts = name.trim().split(' ');
    const givenName = nameParts[0] || name;
    const familyName = nameParts.slice(1).join(' ') || '';

    if (token) {
      try {
        const body: any = {
          names: [{ givenName, familyName }],
        };
        if (email) {
          body.emailAddresses = [{ value: email.trim() }];
        }
        if (phone) {
          body.phoneNumbers = [{ value: phone.trim() }];
        }
        if (company) {
          body.organizations = [{ name: company.trim() }];
        }

        const res = await fetch(`https://people.googleapis.com/v1/people:createContact`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const p = await res.json();
          const newContact: GoogleContact = {
            resourceName: p.resourceName,
            name: p.names?.[0]?.displayName || name,
            givenName,
            familyName,
            email: p.emailAddresses?.[0]?.value || email,
            phone: p.phoneNumbers?.[0]?.value || phone,
            company: p.organizations?.[0]?.name || company,
          };
          window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'contacts' } }));
          return { contact: newContact, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error creando contacto en Google People API:', err);
      }
    }

    // Local fallback creation
    const { contacts } = await googleContactsService.getContacts();
    const newContact: GoogleContact = {
      resourceName: 'people/c-' + Date.now(),
      name: name.trim(),
      givenName,
      familyName,
      email: email?.trim(),
      phone: phone?.trim(),
      company: company?.trim(),
    };

    const updated = [newContact, ...contacts];
    localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'contacts' } }));
    return { contact: newContact, isRealApi: false };
  },

  // Delete Contact (with confirmation in UI)
  async deleteContact(resourceName: string): Promise<boolean> {
    const token = await getAccessToken();

    if (token && resourceName.startsWith('people/c') === false && resourceName.includes('/')) {
      try {
        const res = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok || res.status === 204) {
          window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'contacts' } }));
          return true;
        }
      } catch (err) {
        console.warn('Error eliminando contacto en Google People API:', err);
      }
    }

    // Local fallback delete
    const { contacts } = await googleContactsService.getContacts();
    const updated = contacts.filter((c) => c.resourceName !== resourceName);
    localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'contacts' } }));
    return true;
  },
};
