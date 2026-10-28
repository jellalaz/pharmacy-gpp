import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, save } from '../services/api';
export function useRecords<T>(path: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: [path], queryFn: () => api<T[]>(path) });
  async function persist(data: unknown, id?: string) {
    await save(path, data, id);
    await client.invalidateQueries({ queryKey: [path] });
    toast.success(id ? 'Đã cập nhật thông tin.' : 'Đã thêm bản ghi mới.');
  }
  return { query, records: query.data ?? [], persist };
}
