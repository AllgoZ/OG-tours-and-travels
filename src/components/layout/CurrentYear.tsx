"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const BUILD_YEAR = new Date().getFullYear();

/** Current year computed in the visitor's browser (the server snapshot is the build year). */
export function CurrentYear() {
  const year = useSyncExternalStore(subscribe, () => new Date().getFullYear(), () => BUILD_YEAR);
  return <>{year}</>;
}
