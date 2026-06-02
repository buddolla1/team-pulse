import React from 'react';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { RadioButton } from 'primereact/radiobutton';
import { classNames } from 'primereact/utils';

const normalizeOptions = (options = []) => options.map((option) => {
  if (typeof option === 'string') {
    return { label: option, value: option };
  }

  return {
    label: option.option_label ?? option.label ?? option.value ?? '',
    value: option.option_value ?? option.value ?? option.label ?? ''
  };
}).filter((option) => option.label !== '' || option.value !== '');

const getFieldKey = (field) => field.field_key || field.fieldKey || field.name;

const isInvalid = (errors, field) => Boolean(errors?.[getFieldKey(field)]);

const DynamicFieldRenderer = ({
  fields = [],
  values = {},
  errors = {},
  onChange,
  columns = 2
}) => {
  const renderControl = (field) => {
    const fieldKey = getFieldKey(field);
    const value = values[fieldKey];
    const options = normalizeOptions(field.options || []);
    const commonProps = {
      id: fieldKey,
      value: value ?? '',
      disabled: Boolean(field.is_read_only),
      className: classNames({ 'p-invalid': isInvalid(errors, field) })
    };

    switch (field.field_type) {
      case 'textarea':
        return (
          <InputTextarea
            {...commonProps}
            value={value ?? ''}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            rows={3}
            autoResize
          />
        );
      case 'number':
        return (
          <InputNumber
            inputId={fieldKey}
            value={value === '' || value === null || value === undefined ? null : Number(value)}
            onValueChange={(e) => onChange(fieldKey, e.value)}
            disabled={Boolean(field.is_read_only)}
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'decimal':
        return (
          <InputNumber
            inputId={fieldKey}
            value={value === '' || value === null || value === undefined ? null : Number(value)}
            onValueChange={(e) => onChange(fieldKey, e.value)}
            mode="decimal"
            minFractionDigits={field.ui_config?.minFractionDigits ?? 2}
            maxFractionDigits={field.ui_config?.maxFractionDigits ?? 4}
            disabled={Boolean(field.is_read_only)}
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'date':
        if (field.ui_config?.inputType === 'month') {
          return (
            <Calendar
              id={fieldKey}
              value={value ? new Date(`${value}-01`) : null}
              onChange={(e) => onChange(fieldKey, e.value ? e.value.toISOString().slice(0, 7) : null)}
              view="month"
              dateFormat="yy-mm"
              showIcon
              disabled={Boolean(field.is_read_only)}
              className={classNames({ 'p-invalid': isInvalid(errors, field) })}
            />
          );
        }
        return (
          <Calendar
            id={fieldKey}
            value={value ? new Date(value) : null}
            onChange={(e) => onChange(fieldKey, e.value ? e.value.toISOString().slice(0, 10) : null)}
            dateFormat="yy-mm-dd"
            showIcon
            disabled={Boolean(field.is_read_only)}
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'datetime':
        return (
          <Calendar
            id={fieldKey}
            value={value ? new Date(value) : null}
            onChange={(e) => onChange(fieldKey, e.value ? e.value.toISOString() : null)}
            showTime
            showSeconds
            dateFormat="yy-mm-dd"
            showIcon
            disabled={Boolean(field.is_read_only)}
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'select':
        return (
          <Dropdown
            id={fieldKey}
            value={value ?? null}
            options={options}
            onChange={(e) => onChange(fieldKey, e.value)}
            placeholder={field.placeholder || 'Select'}
            disabled={Boolean(field.is_read_only)}
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'multiselect':
        return (
          <MultiSelect
            id={fieldKey}
            value={Array.isArray(value) ? value : []}
            options={options}
            onChange={(e) => onChange(fieldKey, e.value)}
            placeholder={field.placeholder || 'Select'}
            disabled={Boolean(field.is_read_only)}
            display="chip"
            className={classNames({ 'p-invalid': isInvalid(errors, field) })}
          />
        );
      case 'radio':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {options.map((option) => (
              <div key={option.value} className="flex align-items-center gap-2">
                <RadioButton
                  inputId={`${fieldKey}-${option.value}`}
                  name={fieldKey}
                  value={option.value}
                  onChange={(e) => onChange(fieldKey, e.value)}
                  checked={value === option.value}
                  disabled={Boolean(field.is_read_only)}
                />
                <label htmlFor={`${fieldKey}-${option.value}`}>{option.label}</label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex align-items-center gap-2">
            <Checkbox
              inputId={fieldKey}
              checked={Boolean(value)}
              onChange={(e) => onChange(fieldKey, e.checked)}
              disabled={Boolean(field.is_read_only)}
            />
            <label htmlFor={fieldKey}>{field.help_text || field.field_label}</label>
          </div>
        );
      case 'switch':
        return (
          <InputSwitch
            checked={Boolean(value)}
            onChange={(e) => onChange(fieldKey, e.value)}
            disabled={Boolean(field.is_read_only)}
          />
        );
      case 'json':
        return (
          <InputTextarea
            {...commonProps}
            value={typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            rows={4}
            autoResize
          />
        );
      case 'email':
      case 'tel':
      case 'url':
      case 'text':
      default:
        return (
          <InputText
            {...commonProps}
            type={field.field_type === 'email' ? 'email' : field.field_type === 'tel' ? 'tel' : field.field_type === 'url' ? 'url' : 'text'}
            value={value ?? ''}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  return (
    <div
      className="dynamic-field-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: '1rem'
      }}
    >
      {fields.map((field) => {
        const fieldKey = getFieldKey(field);
        const span = field.ui_config?.span === 'full' ? columns : Math.min(Number(field.ui_config?.span) || 1, columns);
        return (
          <div
            key={fieldKey}
            className="dynamic-field-item"
            style={{ gridColumn: `span ${Math.max(1, span)}` }}
          >
            <label htmlFor={fieldKey} style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
              {field.field_label}
              {field.is_required ? <span className="p-error"> *</span> : null}
            </label>
            {renderControl(field)}
            {field.help_text ? (
              <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-color-secondary, #6c757d)' }}>
                {field.help_text}
              </small>
            ) : null}
            {isInvalid(errors, field) ? (
              <small className="p-error">{errors[fieldKey]}</small>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default DynamicFieldRenderer;
