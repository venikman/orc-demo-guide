/** F#-style tee — perform a side-effect in a pipe without changing the value. */
export const tap =
  <T>(fn: (value: T) => void) =>
  (value: T): T => {
    fn(value);
    return value;
  };
