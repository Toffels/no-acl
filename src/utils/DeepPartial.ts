export type DeepPartial<T> = T extends {}
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type DeepPartialNullable<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartialNullable<T[P]> | null
    : T[P] | null;
};
