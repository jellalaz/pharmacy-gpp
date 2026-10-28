export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireFound<T>(value: T | null): T {
  if (!value) throw new HttpError(404, 'Không tìm thấy dữ liệu trong phạm vi của bạn.');
  return value;
}
