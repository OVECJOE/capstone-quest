type Checked = {
  type: string;
  validationMessage: string;
  validity: Pick<ValidityState, "valueMissing" | "typeMismatch" | "tooShort" | "customError">;
  minLength?: number;
};

/** Says what is wrong with a field in the product's own words. */
export function problem({ type, validity, validationMessage, minLength }: Checked) {
  if (validity.customError) return validationMessage;
  if (validity.valueMissing) return type === "file" ? "Choose a file first." : "Please fill this in.";
  if (validity.typeMismatch && type === "url") return "Enter a full web address, starting with https://";
  if (validity.tooShort) return `Write at least ${minLength} characters.`;
  return "Check this answer.";
}
