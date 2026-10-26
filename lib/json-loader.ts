/** Deduplicate concurrent requests; failed requests are evicted so a retry can recover. */
export function createJsonLoader<T>(validate: (value: unknown) => value is T) {
  const requests = new Map<string, Promise<T>>();
  return (url: string): Promise<T> => {
    let request = requests.get(url);
    if (!request) {
      request = fetch(url, { signal: AbortSignal.timeout(15000) })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const value: unknown = await response.json();
          if (!validate(value)) throw new Error('Invalid response');
          return value;
        })
        .catch((error: unknown) => {
          requests.delete(url);
          throw error;
        });
      requests.set(url, request);
    }
    return request;
  };
}
