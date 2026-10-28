import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('Lỗi API cho form', () => {
  it('giữ chi tiết lỗi từng trường và lỗi chung từ backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Dữ liệu chưa hợp lệ.',
            errors: {
              fieldErrors: { password: ['Mật khẩu phải có ít nhất 8 ký tự.'] },
              formErrors: ['Kiểm tra thông tin.'],
            },
          }),
          { status: 400 },
        ),
      ),
    );
    const result = api('/users', { method: 'POST' });
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      status: 400,
      fieldErrors: { password: ['Mật khẩu phải có ít nhất 8 ký tự.'] },
      formErrors: ['Kiểm tra thông tin.'],
    });
  });
  it('giữ thông báo lỗi nghiệp vụ khi không có lỗi từng trường', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Mã hoặc email đã tồn tại.',
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(api('/users')).rejects.toMatchObject({
      status: 409,
      message: 'Mã hoặc email đã tồn tại.',
      fieldErrors: {},
      formErrors: [],
    });
  });
});
