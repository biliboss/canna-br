export type Result<E, A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly error: E };

export const ok = <A>(value: A): Result<never, A> => ({ ok: true, value });
export const err = <E>(error: E): Result<E, never> => ({ ok: false, error });
