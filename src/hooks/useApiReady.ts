import { useEffect, useState } from "react";
import { getApiReady, subscribeApiReady } from "../services/apiReady";

export function useApiReady(): boolean {
  const [ready, setReady] = useState(getApiReady);

  useEffect(() => subscribeApiReady(setReady), []);

  return ready;
}
