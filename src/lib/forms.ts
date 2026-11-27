export type FormState = { error?: string; done?: string };

/** Database functions raise readable messages. Anything else stays in the server log. */
export function failure(error: { code?: string; message: string }): FormState {
  if (error.code === "P0001") return { error: error.message };
  if (error.code === "23514") return { error: "Check the length of your answers and try again." };
  console.error(error);
  return { error: "Something went wrong. Please try again." };
}

/** Browsers send line breaks as two characters, which would break the length limits shown on screen. */
export const clean = (value: unknown) => String(value ?? "").replace(/\r\n?/g, "\n").trim();
export const text = (data: FormData, key: string) => clean(data.get(key));
/** Accepts a bare invite code or a pasted invite link, with or without a trailing slash or query. */
export const inviteCode = (value: string) =>
  value.trim().split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() ?? "";
export const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
