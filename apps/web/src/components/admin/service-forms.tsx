"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/admin/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCategoryAction, createServiceAction } from "@/lib/crm/actions";
import { initialFormState, type FormState } from "@/lib/crm/form-state";

export function CategoryForm() {
  const [state, action, pending] = useActionState(
    createCategoryAction,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <h3 className="sm:col-span-2 font-semibold text-slate-950">
        Nueva categoría
      </h3>
      <FormMessage state={state} />
      <label className="text-sm font-semibold">
        Código
        <Input
          name="code"
          required
          placeholder="categoria_nueva"
          className="mt-2 h-11"
        />
      </label>
      <label className="text-sm font-semibold">
        Nombre
        <Input name="name" required className="mt-2 h-11" />
      </label>
      <label className="sm:col-span-2 text-sm font-semibold">
        Descripción
        <Textarea name="description" className="mt-2" />
      </label>
      <label className="text-sm font-semibold">
        Orden
        <Input
          name="sort_order"
          type="number"
          min="0"
          max="10000"
          defaultValue="100"
          className="mt-2 h-11"
        />
      </label>
      <div className="flex items-end">
        <button
          disabled={pending}
          aria-busy={pending}
          className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
        >
          {pending ? "Creando…" : "Crear categoría"}
        </button>
      </div>
    </form>
  );
}

type Category = { id: string; name: string };
type ServiceValue = {
  category_id: string;
  name: string;
  description: string | null;
  standard_price: number | null;
  currency_code: string;
};

export function ServiceForm({
  categories,
  value,
  action = createServiceAction,
  label = "Crear servicio",
}: {
  categories: Category[];
  value?: ServiceValue;
  action?: (state: FormState, data: FormData) => Promise<FormState>;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <FormMessage state={state} />
      <label className="text-sm font-semibold">
        Categoría
        <select
          name="category_id"
          defaultValue={value?.category_id ?? ""}
          required
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
        >
          <option value="">Seleccionar…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Nombre
        <Input
          name="name"
          required
          defaultValue={value?.name}
          className="mt-2 h-11"
        />
      </label>
      <label className="sm:col-span-2 text-sm font-semibold">
        Descripción
        <Textarea
          name="description"
          defaultValue={value?.description ?? ""}
          className="mt-2"
        />
      </label>
      <label className="text-sm font-semibold">
        Precio estándar
        <Input
          name="standard_price"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={value?.standard_price ?? ""}
          className="mt-2 h-11"
        />
      </label>
      <label className="text-sm font-semibold">
        Moneda
        <Input
          name="currency_code"
          defaultValue={value?.currency_code ?? "HNL"}
          maxLength={3}
          required
          className="mt-2 h-11"
        />
      </label>
      <button
        disabled={pending}
        aria-busy={pending}
        className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white sm:col-span-2 sm:justify-self-start"
      >
        {pending ? "Guardando…" : label}
      </button>
    </form>
  );
}
