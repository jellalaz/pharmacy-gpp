export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string[]> = {},
    public formErrors: string[] = [],
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Không kết nối được máy chủ.' }));
    throw new ApiError(
      body.message || 'Yêu cầu thất bại.',
      response.status,
      body.errors?.fieldErrors,
      body.errors?.formErrors,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const save = <T>(path: string, data: unknown, id?: string) =>
  api<T>(`${path}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
