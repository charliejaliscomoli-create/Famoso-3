import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Building,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogIn,
  ExternalLink,
} from 'lucide-react';
import { googleContactsService, GoogleContact } from '../Services/googleContactsService';
import { subscribeAuth, googleSignIn, logoutGoogle, getCurrentUser } from '../Services/authService';

export function ContactsView() {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealApi, setIsRealApi] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [user, setUser] = useState(getCurrentUser());
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Form State
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newCompany, setNewCompany] = useState<string>('');

  // Confirmation modal state for deletion (MANDATORY per Workspace guidelines)
  const [deleteTarget, setDeleteTarget] = useState<GoogleContact | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const fetchContacts = useCallback(async (query: string = searchQuery) => {
    setLoading(true);
    try {
      const res = query.trim()
        ? await googleContactsService.searchContacts(query)
        : await googleContactsService.getContacts();
      setContacts(res.contacts);
      setIsRealApi(res.isRealApi);
    } catch (err) {
      console.error('Error cargando contactos:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchContacts();

    const handleSync = () => fetchContacts();
    window.addEventListener('famous-storage-sync', handleSync);
    return () => window.removeEventListener('famous-storage-sync', handleSync);
  }, [fetchContacts, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts(searchQuery);
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      await googleSignIn();
      await fetchContacts();
    } catch (err: any) {
      console.error('Error al iniciar sesión con Google:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      await googleContactsService.createContact(
        newName,
        newEmail || undefined,
        newPhone || undefined,
        newCompany || undefined
      );

      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewCompany('');
      setIsAdding(false);
      await fetchContacts();
    } catch (err) {
      console.error('Error al crear contacto:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteContact = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      await googleContactsService.deleteContact(deleteTarget.resourceName);
      setDeleteTarget(null);
      await fetchContacts();
    } catch (err) {
      console.error('Error al eliminar contacto:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Sync Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Google Contacts</h2>
              {isRealApi ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Google Sincronizado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" /> Modo Local / Inicia Sesión
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestiona tu libreta de contactos ejecutivos y colaboradores de Google Contacts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!user ? (
            <button
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {authLoading ? 'Conectando...' : 'Conectar con Google'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={() => logoutGoogle()}
                className="text-xs text-slate-400 hover:text-slate-200 underline px-2 py-1"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          <button
            onClick={() => fetchContacts()}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-slate-700/50"
            title="Recargar contactos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Formulario Agregar Contacto */}
      {isAdding && (
        <form
          onSubmit={handleCreateContact}
          className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Agregar Contacto a Google Contacts
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Teléfono / Móvil
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+52 33 1234 5678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Empresa / Cargo
              </label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Director de Operaciones"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              Guardar en Google Contacts
            </button>
          </div>
        </form>
      )}

      {/* Buscador */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar contactos por nombre, correo, teléfono o empresa..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-24 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700"
        >
          Buscar
        </button>
      </form>

      {/* Lista de Contactos */}
      <div className="space-y-3">
        {loading && contacts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Cargando contactos desde Google Contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No se encontraron contactos</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}". Intenta con otro nombre o correo.`
                : 'Agrega tu primer contacto o conecta tu cuenta de Google.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition group flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {contact.photoUrl ? (
                      <img
                        src={contact.photoUrl}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{contact.name}</h4>
                      {contact.company && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-500" />
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget(contact)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer opacity-80 group-hover:opacity-100"
                    title="Eliminar contacto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition border border-slate-700/50"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{contact.email}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}

                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition border border-slate-700/50"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación (MANDATORIO por política de Workspace APIs) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">
                ¿Eliminar a "{deleteTarget.name}" de Google Contacts?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Esta acción borrará el contacto permanentemente de tu libreta de direcciones de Google Contacts. Esta operación no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteContact}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-red-600/20"
              >
                {loading ? 'Eliminando...' : 'Sí, Eliminar Contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
