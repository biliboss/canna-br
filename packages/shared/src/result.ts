export type Result<E, A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly error: E };

export const ok = <A>(value: A): Result<never, A> => ({ ok: true, value });
export const err = <E>(error: E): Result<E, never> => ({ ok: false, error });

export const isOk = <E, A>(r: Result<E, A>): r is { ok: true; value: A } => r.ok;
export const isErr = <E, A>(r: Result<E, A>): r is { ok: false; error: E } => !r.ok;
