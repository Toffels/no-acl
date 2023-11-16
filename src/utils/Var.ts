import { Descriptor } from "../Types";

export function Var<V extends { [key: `@${string}`]: Descriptor }>(vars: V) {
  return vars;
}
