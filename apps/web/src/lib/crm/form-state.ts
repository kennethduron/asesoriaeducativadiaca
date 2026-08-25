export type FormState = {
  status: "idle" | "error" | "warning";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  duplicates?: { id: string; client_code: string; full_name: string }[];
};

export const initialFormState: FormState = { status: "idle" };
