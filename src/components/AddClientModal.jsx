// RUTA: src/components/AddClientModal.jsx

import { useState, useEffect } from "react";
import api from "@/services/api";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const statusLabels = {
  Potencial: 'Potencial',
  Contactado: 'Contactado',
  Interesado: 'Interesado',
  En_Seguimiento: 'En Seguimiento',
  Cliente_Activo: 'Cliente Activo',
  No_Interesado: 'No Interesado',
  Importante: 'Importante',
};

export default function AddClientModal({ open, onClose, onSave, clientToEdit }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", status: "Potencial" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientToEdit && open) {
      setForm({
        name: clientToEdit.name || "",
        phone: clientToEdit.phone || "",
        email: clientToEdit.email || "",
        address: clientToEdit.address || "",
        status: clientToEdit.status || "Potencial",
      });
    } else if (open) {
      setForm({ name: "", phone: "", email: "", address: "", status: "Potencial" });
    }
  }, [clientToEdit, open]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { alert("El nombre del cliente es obligatorio."); return; }
    setLoading(true);
    const isEditing = !!clientToEdit;
    const url = isEditing ? `/clients/${clientToEdit.id}` : "/clients";
    const method = isEditing ? 'patch' : 'post';
    try {
      const res = await api[method](url, form);
      onSave(res.data);
    } catch (err) {
      console.error("❌ Error al guardar cliente:", err);
      alert("No se pudo guardar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        {/*
          Móvil: ocupa el ancho de pantalla con margen, centrado verticalmente,
          scroll interno si el contenido es alto.
          sm+: comportamiento original centrado con max-w-md.
        */}
        <DialogContent
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     bg-white rounded-2xl sm:rounded-xl shadow-2xl z-50
                     w-[calc(100%-2rem)] sm:w-full sm:max-w-md
                     max-h-[92dvh] overflow-y-auto
                     p-5 sm:p-6"
          aria-describedby="add-client-description"
        >
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {clientToEdit ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
            </DialogTitle>
            <DialogPrimitive.Description className="text-sm text-gray-500">
              {clientToEdit ? 'Modifica la información del cliente.' : 'Agrega la información básica del cliente.'}
            </DialogPrimitive.Description>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div>
              <Label>Nombre</Label>
              <Input name="name" placeholder="Nombre completo" value={form.name} onChange={handleChange} required />
            </div>

            <div>
              <Label>Estado</Label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full h-10 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border rounded-md"
              >
                {Object.entries(statusLabels).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Teléfono</Label>
              <Input name="phone" placeholder="Teléfono" value={form.phone} onChange={handleChange} />
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input name="email" type="email" placeholder="Correo" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input name="address" placeholder="Dirección" value={form.address} onChange={handleChange} />
            </div>

            {/* Botones full-width en móvil */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Guardando..." : (clientToEdit ? 'Guardar Cambios' : 'Crear Cliente')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}