import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle, Save } from 'lucide-react';
import { useId, useState } from 'react';
import { Dialog } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { ApiError } from '../services/api';
export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'checkbox' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  full?: boolean;
  min?: number;
  minLength?: number;
  maxLength?: number;
  hint?: string;
}
export type FormValues = Record<string, string | number | boolean | null | undefined>;
export function toForm(record: object): FormValues {
  return Object.fromEntries(
    Object.entries(record).filter(([, v]) => v == null || ['string', 'number', 'boolean'].includes(typeof v)),
  );
}
export function RecordForm({
  title,
  fields,
  defaults,
  onSave,
  onClose,
}: {
  title: string;
  fields: Field[];
  defaults: FormValues;
  onSave: (data: FormValues) => Promise<void>;
  onClose: () => void;
}) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    shape[f.name] =
      f.type === 'checkbox'
        ? z.boolean()
        : f.type === 'number'
          ? z
              .number({ invalid_type_error: 'Vui lòng nhập số hợp lệ.' })
              .finite()
              .min(f.min ?? 0, 'Giá trị phải không âm.')
              .max(999999999)
          : f.required
            ? z.string().trim().min(1, 'Vui lòng nhập thông tin.').max(2000)
            : z.string().max(2000);
    if (f.type === 'email')
      shape[f.name] = f.required
        ? z.string().email('Email chưa hợp lệ.')
        : z.union([z.string().email('Email chưa hợp lệ.'), z.literal('')]);
    if (f.type === 'password') {
      const minimum = f.minLength ?? 1;
      const maximum = f.maxLength ?? 128;
      // Passwords must be checked without trimming or otherwise changing their value.
      shape[f.name] = z
        .string()
        .max(maximum, `Mật khẩu không được quá ${maximum} ký tự.`)
        .refine(
          (value) => (!f.required && value === '') || value.length >= minimum,
          `Mật khẩu phải có ít nhất ${minimum} ký tự.`,
        );
    }
  }
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.type === 'number'
          ? Number(defaults[f.name] ?? 0)
          : (defaults[f.name] ?? (f.type === 'checkbox' ? true : '')),
      ]),
    ),
  });
  const [error, setFormError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const formId = useId();
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && !isSubmitting && onClose()}
      title={title}
      description="Thông tin sẽ được lưu vào cơ sở dữ liệu của hệ thống."
      wide
    >
      <form
        onSubmit={handleSubmit(
          async (data) => {
            setFormError('');
            try {
              await onSave(data);
              onClose();
            } catch (e) {
              if (e instanceof ApiError) {
                let fieldCount = 0;
                const generalErrors = [...e.formErrors];
                for (const [name, messages] of Object.entries(e.fieldErrors)) {
                  if (!messages?.length) continue;
                  if (fields.some((field) => field.name === name)) {
                    setError(
                      name,
                      { type: 'server', message: messages.join(' ') },
                      { shouldFocus: fieldCount === 0 },
                    );
                    fieldCount++;
                  } else generalErrors.push(...messages);
                }
                setFormError(
                  generalErrors.join(' ') ||
                    (fieldCount ? 'Vui lòng kiểm tra các trường được đánh dấu.' : e.message),
                );
              } else setFormError((e as Error).message);
            }
          },
          () => setFormError(''),
        )}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <label
              key={f.name}
              className={`${f.full ? 'span-2' : ''} ${f.type === 'checkbox' ? 'checkbox-field' : ''}`}
            >
              <span>
                {f.label}
                {f.required && <em> *</em>}
              </span>
              {f.type === 'select' ? (
                <select
                  aria-invalid={Boolean(errors[f.name])}
                  aria-describedby={`${formId}-${f.name}-feedback`}
                  {...register(f.name)}
                >
                  <option value="">Chọn {f.label.toLowerCase()}</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  rows={3}
                  aria-invalid={Boolean(errors[f.name])}
                  aria-describedby={`${formId}-${f.name}-feedback`}
                  {...register(f.name)}
                />
              ) : f.type === 'password' ? (
                <div className="form-password-control">
                  <input
                    type={visiblePasswords[f.name] ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors[f.name])}
                    aria-describedby={`${formId}-${f.name}-feedback`}
                    {...register(f.name)}
                  />
                  <button
                    type="button"
                    aria-label={visiblePasswords[f.name] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={Boolean(visiblePasswords[f.name])}
                    onClick={() =>
                      setVisiblePasswords((current) => ({ ...current, [f.name]: !current[f.name] }))
                    }
                  >
                    {visiblePasswords[f.name] ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              ) : (
                <input
                  type={f.type ?? 'text'}
                  step={f.type === 'number' ? '0.01' : undefined}
                  min={f.min}
                  aria-invalid={Boolean(errors[f.name])}
                  aria-describedby={`${formId}-${f.name}-feedback`}
                  {...register(f.name, { valueAsNumber: f.type === 'number' })}
                />
              )}
              <small
                id={`${formId}-${f.name}-feedback`}
                className={errors[f.name] ? 'field-error' : 'field-hint'}
                role={errors[f.name] ? 'alert' : undefined}
              >
                {errors[f.name] ? String(errors[f.name]?.message) : f.hint}
              </small>
            </label>
          ))}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Lưu thông tin
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
