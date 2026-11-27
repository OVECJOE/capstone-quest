export type FormState = { error?: string; done?: string };

/** Database functions raise readable messages. Anything else stays in the server log. */
export function failure(error: { code?: string; message: string }): FormState {
  if (error.code === "P0001") return { error: error.message };
  if (error.code === "23514") return { error: "Check the length of your answers and try again." };
  console.error(error);
  return { error: "Something went wrong. Please try again." };
}

export const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
