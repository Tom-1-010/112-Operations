/**
 * Result type for error handling without exceptions
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly success = true as const;
  constructor(public readonly data: T) {}

  isOk(): this is Ok<T> {
    return true;
  }

  isErr(): this is Err<never> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return ok(fn(this.data));
  }

  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as any;
  }

  unwrap(): T {
    return this.data;
  }

  unwrapOr(_defaultValue: T): T {
    return this.data;
  }
}

export class Err<E> {
  readonly success = false as const;
  constructor(public readonly error: E) {}

  isOk(): this is Ok<never> {
    return false;
  }

  isErr(): this is Err<E> {
    return true;
  }

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as any;
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return err(fn(this.error));
  }

  unwrap(): never {
    throw this.error;
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }
}

export function ok<T>(data: T): Ok<T> {
  return new Ok(data);
}

export function err<E>(error: E): Err<E> {
  return new Err(error);
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.isOk();
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.isErr();
}
