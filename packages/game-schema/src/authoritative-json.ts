export type AuthoritativeJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly AuthoritativeJsonValue[]
  | { readonly [key: string]: AuthoritativeJsonValue };
