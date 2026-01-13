import { useState } from "react";

interface UsePluginReturn {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function usePlugin(): UsePluginReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return { loading, error, setLoading, setError };
}