'use client';

import {
    Checkbox as ArkCheckbox,
    Field as ArkField,
    NumberInput as ArkNumberInput,
    Portal,
    Select as ArkSelect,
    Switch as ArkSwitch,
    createListCollection,
} from '@ark-ui/react';
import { cloneElement, forwardRef, isValidElement, useId, useMemo, useState } from 'react';
import type { HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

import { cx } from './utils';

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    label?: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    children: ReactNode;
}

interface LinkedFieldControlProps {
    id?: string;
    'aria-describedby'?: string;
    'aria-errormessage'?: string;
    'aria-invalid'?: boolean;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
    { className, id, label, description, error, required, disabled, readOnly, children, ...props },
    ref,
) {
    const generatedId = useId();
    const controlId = id ?? `wt-field-${generatedId}`;
    const helperId = `field::${controlId}::helper-text`;
    const errorId = `field::${controlId}::error-text`;
    const describedBy = error ? errorId : description ? helperId : undefined;
    const linkedChild = isValidElement<LinkedFieldControlProps>(children)
        ? cloneElement(children, {
            id: children.props.id ?? controlId,
            ...(children.props['aria-describedby']
                ? { 'aria-describedby': children.props['aria-describedby'] }
                : describedBy ? { 'aria-describedby': describedBy } : {}),
            ...(children.props['aria-errormessage']
                ? { 'aria-errormessage': children.props['aria-errormessage'] }
                : error ? { 'aria-errormessage': errorId } : {}),
            'aria-invalid': children.props['aria-invalid'] ?? Boolean(error),
            ...(children.props.required !== undefined
                ? { required: children.props.required }
                : required !== undefined ? { required } : {}),
            ...(children.props.disabled !== undefined
                ? { disabled: children.props.disabled }
                : disabled !== undefined ? { disabled } : {}),
            ...(children.props.readOnly !== undefined
                ? { readOnly: children.props.readOnly }
                : readOnly !== undefined ? { readOnly } : {}),
        })
        : children;

    return (
        <ArkField.Root
            ref={ref}
            id={controlId}
            className={cx('wt-field', className)}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            invalid={Boolean(error)}
            {...props}
        >
            {label ? (
                <ArkField.Label className='wt-field__label'>
                    {label}
                    {required ? <span className='wt-field__required'>*</span> : null}
                </ArkField.Label>
            ) : null}
            {linkedChild}
            {description && !error ? <ArkField.HelperText className='wt-field__hint'>{description}</ArkField.HelperText> : null}
            {error ? <ArkField.ErrorText className='wt-field__error'>{error}</ArkField.ErrorText> : null}
        </ArkField.Root>
    );
});

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    { className, type = 'text', ...props },
    ref,
) {
    return <ArkField.Input ref={ref} type={type} className={cx('wt-input', className)} {...props} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    autoresize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { className, autoresize = false, ...props },
    ref,
) {
    return <ArkField.Textarea ref={ref} className={cx('wt-input', 'wt-textarea', className)} autoresize={autoresize} {...props} />;
});

export interface NumberInputProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'inputMode'> {
    value?: number | null;
    defaultValue?: number;
    onValueChange?: (value: number | null) => void;
    onValueCommit?: (value: number | null) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    invalid?: boolean;
    name?: string;
    placeholder?: string;
    'aria-label'?: string;
    showSteppers?: boolean;
}

export const NumberInput = forwardRef<HTMLDivElement, NumberInputProps>(function NumberInput(
    {
        className,
        id,
        value,
        defaultValue,
        onValueChange,
        onValueCommit,
        min,
        max,
        step,
        disabled,
        readOnly,
        required,
        invalid,
        name,
        placeholder,
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        'aria-errormessage': ariaErrorMessage,
        'aria-invalid': ariaInvalid,
        showSteppers = true,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    return (
        <ArkNumberInput.Root
            ref={ref}
            id={controlId}
            ids={{ input: controlId }}
            className={cx('wt-number-input', className)}
            value={value === undefined ? undefined : value === null ? '' : String(value)}
            defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
            onValueChange={(details) => onValueChange?.(Number.isNaN(details.valueAsNumber) ? null : details.valueAsNumber)}
            onValueCommit={(details) => onValueCommit?.(Number.isNaN(details.valueAsNumber) ? null : details.valueAsNumber)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            invalid={invalid}
            name={name}
            {...props}
        >
            <ArkNumberInput.Input
                className='wt-input wt-number-input__input'
                placeholder={placeholder}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                aria-errormessage={ariaErrorMessage}
                aria-invalid={ariaInvalid}
            />
            {showSteppers ? (
                <ArkNumberInput.Control className='wt-number-input__controls'>
                    <ArkNumberInput.IncrementTrigger className='wt-number-input__stepper' aria-label='Increase value'>
                        +
                    </ArkNumberInput.IncrementTrigger>
                    <ArkNumberInput.DecrementTrigger className='wt-number-input__stepper' aria-label='Decrease value'>
                        −
                    </ArkNumberInput.DecrementTrigger>
                </ArkNumberInput.Control>
            ) : null}
        </ArkNumberInput.Root>
    );
});

export type SelectValue = string | number;

export interface SelectOption<T extends SelectValue = SelectValue> {
    value: T;
    label: ReactNode;
    textValue?: string;
    disabled?: boolean;
}

export interface SelectProps<T extends SelectValue = SelectValue>
    extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'onSelect'> {
    options: ReadonlyArray<SelectOption<T>>;
    value?: T;
    defaultValue?: T;
    onValueChange?: (value: T | undefined) => void;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    invalid?: boolean;
    required?: boolean;
}

function encodeSelectValue(value: SelectValue) {
    return `${typeof value === 'number' ? 'n' : 's'}:${String(value)}`;
}

export const Select = forwardRef(function Select<T extends SelectValue = SelectValue>(
    {
        className,
        id,
        options,
        value,
        defaultValue,
        onValueChange,
        placeholder = '请选择',
        name,
        disabled,
        invalid,
        required,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        'aria-describedby': ariaDescribedBy,
        'aria-errormessage': ariaErrorMessage,
        'aria-invalid': ariaInvalid,
        ...props
    }: SelectProps<T>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultValue);
    const formValue = value ?? uncontrolledValue;
    const items = useMemo(
        () =>
            options.map((option) => ({
                value: encodeSelectValue(option.value),
                label: option.textValue ?? (typeof option.label === 'string' ? option.label : String(option.value)),
                option,
                disabled: option.disabled,
            })),
        [options],
    );
    const collection = useMemo(() => createListCollection({ items }), [items]);

    return (
        <ArkSelect.Root
            ref={ref}
            id={controlId}
            ids={{ trigger: controlId }}
            className={cx('wt-select', className)}
            collection={collection}
            value={value === undefined ? undefined : [encodeSelectValue(value)]}
            defaultValue={defaultValue === undefined ? undefined : [encodeSelectValue(defaultValue)]}
            onValueChange={(details) => {
                const next = options.find((option) => encodeSelectValue(option.value) === details.value[0]);
                setUncontrolledValue(next?.value);
                onValueChange?.(next?.value);
            }}
            disabled={disabled}
            invalid={invalid}
            required={required}
            positioning={{ sameWidth: true }}
            {...props}
        >
            <ArkSelect.HiddenSelect />
            {name ? (
                <input
                    type='hidden'
                    name={name}
                    value={formValue === undefined ? '' : String(formValue)}
                    disabled={disabled}
                />
            ) : null}
            <ArkSelect.Control>
                <ArkSelect.Trigger
                    className='wt-select__trigger'
                    aria-label={ariaLabel}
                    aria-labelledby={ariaLabelledBy}
                    aria-describedby={ariaDescribedBy}
                    aria-errormessage={ariaErrorMessage}
                    aria-invalid={ariaInvalid}
                >
                    <ArkSelect.ValueText placeholder={placeholder} />
                    <ArkSelect.Indicator className='wt-select__indicator' aria-hidden='true'>
                        ▾
                    </ArkSelect.Indicator>
                </ArkSelect.Trigger>
            </ArkSelect.Control>
            <Portal>
                <ArkSelect.Positioner className='wt-positioner'>
                    <ArkSelect.Content className='wt-select__content'>
                        {items.map((item) => (
                            <ArkSelect.Item key={item.value} item={item} className='wt-select__item'>
                                <ArkSelect.ItemText>{item.option.label}</ArkSelect.ItemText>
                                <ArkSelect.ItemIndicator className='wt-select__check'>✓</ArkSelect.ItemIndicator>
                            </ArkSelect.Item>
                        ))}
                    </ArkSelect.Content>
                </ArkSelect.Positioner>
            </Portal>
        </ArkSelect.Root>
    );
}) as <T extends SelectValue = SelectValue>(
    props: SelectProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;

export interface CheckboxProps extends Omit<HTMLAttributes<HTMLLabelElement>, 'onChange'> {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    invalid?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(function Checkbox(
    {
        className,
        id,
        checked,
        defaultChecked,
        onCheckedChange,
        disabled,
        invalid,
        required,
        name,
        value,
        label,
        children,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        'aria-describedby': ariaDescribedBy,
        'aria-errormessage': ariaErrorMessage,
        'aria-invalid': ariaInvalid,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    return (
        <ArkCheckbox.Root
            ref={ref}
            id={controlId}
            ids={{ hiddenInput: controlId }}
            className={cx('wt-checkbox', className)}
            checked={checked}
            defaultChecked={defaultChecked}
            onCheckedChange={(details) => onCheckedChange?.(details.checked === true)}
            disabled={disabled}
            invalid={invalid}
            required={required}
            name={name}
            value={value}
            {...props}
        >
            <ArkCheckbox.HiddenInput
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                aria-errormessage={ariaErrorMessage}
                aria-invalid={ariaInvalid}
            />
            <ArkCheckbox.Control className='wt-checkbox__control'>
                <ArkCheckbox.Indicator className='wt-checkbox__indicator'>✓</ArkCheckbox.Indicator>
            </ArkCheckbox.Control>
            {label ?? children ? <ArkCheckbox.Label className='wt-checkbox__label'>{label ?? children}</ArkCheckbox.Label> : null}
        </ArkCheckbox.Root>
    );
});

export interface SwitchProps extends Omit<HTMLAttributes<HTMLLabelElement>, 'onChange'> {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    invalid?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    label?: ReactNode;
}

export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(function Switch(
    {
        className,
        id,
        checked,
        defaultChecked,
        onCheckedChange,
        disabled,
        invalid,
        required,
        name,
        value,
        label,
        children,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        'aria-describedby': ariaDescribedBy,
        'aria-errormessage': ariaErrorMessage,
        'aria-invalid': ariaInvalid,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    return (
        <ArkSwitch.Root
            ref={ref}
            id={controlId}
            ids={{ hiddenInput: controlId }}
            className={cx('wt-switch', className)}
            checked={checked}
            defaultChecked={defaultChecked}
            onCheckedChange={(details) => onCheckedChange?.(details.checked)}
            disabled={disabled}
            invalid={invalid}
            required={required}
            name={name}
            value={value}
            {...props}
        >
            <ArkSwitch.HiddenInput
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                aria-errormessage={ariaErrorMessage}
                aria-invalid={ariaInvalid}
            />
            <ArkSwitch.Control className='wt-switch__control'>
                <ArkSwitch.Thumb className='wt-switch__thumb' />
            </ArkSwitch.Control>
            {label ?? children ? <ArkSwitch.Label className='wt-switch__label'>{label ?? children}</ArkSwitch.Label> : null}
        </ArkSwitch.Root>
    );
});
