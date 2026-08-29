'use client';

import {
    ColorPicker as ArkColorPicker,
    FileUpload as ArkFileUpload,
    Portal,
    Slider as ArkSlider,
    TagsInput as ArkTagsInput,
    parseColor,
} from '@ark-ui/react';
import { forwardRef, useId } from 'react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';

import { cx } from './utils';

export interface SliderProps
    extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'aria-label' | 'aria-labelledby'> {
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    onValueCommit?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    readOnly?: boolean;
    name?: string;
    label?: ReactNode;
    showValue?: boolean;
    'aria-label'?: string;
    'aria-labelledby'?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
    {
        className,
        id,
        value,
        defaultValue,
        onValueChange,
        onValueCommit,
        min = 0,
        max = 100,
        step = 1,
        disabled,
        readOnly,
        name,
        label,
        showValue = false,
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
        <ArkSlider.Root
            ref={ref}
            id={controlId}
            ids={{ hiddenInput: () => controlId }}
            className={cx('wt-slider', className)}
            value={value === undefined ? undefined : [value]}
            defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
            onValueChange={(details) => onValueChange?.(details.value[0] ?? min)}
            onValueChangeEnd={(details) => onValueCommit?.(details.value[0] ?? min)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            readOnly={readOnly}
            name={name}
            aria-label={ariaLabel ? [ariaLabel] : undefined}
            aria-labelledby={ariaLabelledBy ? [ariaLabelledBy] : undefined}
            {...props}
        >
            {label || showValue ? (
                <div className='wt-slider__header'>
                    {label ? <ArkSlider.Label className='wt-slider__label'>{label}</ArkSlider.Label> : <span />}
                    {showValue ? <ArkSlider.ValueText className='wt-slider__value' /> : null}
                </div>
            ) : null}
            <ArkSlider.Control className='wt-slider__control'>
                <ArkSlider.Track className='wt-slider__track'>
                    <ArkSlider.Range className='wt-slider__range' />
                </ArkSlider.Track>
                <ArkSlider.Thumb className='wt-slider__thumb' index={0}>
                    <ArkSlider.HiddenInput
                        aria-describedby={ariaDescribedBy}
                        aria-errormessage={ariaErrorMessage}
                        aria-invalid={ariaInvalid}
                    />
                </ArkSlider.Thumb>
            </ArkSlider.Control>
        </ArkSlider.Root>
    );
});

function safeParseColor(value: string | undefined) {
    try {
        return parseColor(value || '#8b5cf6');
    } catch {
        return parseColor('#8b5cf6');
    }
}

export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    invalid?: boolean;
    name?: string;
    label?: ReactNode;
}

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
    {
        className,
        id,
        value,
        defaultValue,
        onValueChange,
        disabled,
        readOnly,
        required,
        invalid,
        name,
        label,
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
        <ArkColorPicker.Root
            ref={ref}
            id={controlId}
            ids={{ trigger: controlId }}
            className={cx('wt-color-picker', className)}
            value={value === undefined ? undefined : safeParseColor(value)}
            defaultValue={safeParseColor(defaultValue)}
            onValueChange={(details) => onValueChange?.(details.value.toString('hexa'))}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            invalid={invalid}
            name={name}
            format='hsla'
            positioning={{ placement: 'bottom-start' }}
            {...props}
        >
            {label ? <ArkColorPicker.Label className='wt-field__label'>{label}</ArkColorPicker.Label> : null}
            <ArkColorPicker.Control className='wt-color-picker__control'>
                <ArkColorPicker.Trigger
                    className='wt-color-picker__trigger'
                    aria-label={ariaLabel ?? '选择颜色'}
                    aria-labelledby={ariaLabelledBy}
                    aria-describedby={ariaDescribedBy}
                    aria-errormessage={ariaErrorMessage}
                    aria-invalid={ariaInvalid}
                >
                    <ArkColorPicker.TransparencyGrid className='wt-color-picker__transparency'>
                        <ArkColorPicker.ValueSwatch className='wt-color-picker__swatch' />
                    </ArkColorPicker.TransparencyGrid>
                    <ArkColorPicker.ValueText className='wt-color-picker__value' />
                </ArkColorPicker.Trigger>
            </ArkColorPicker.Control>
            <ArkColorPicker.HiddenInput />
            <Portal>
                <ArkColorPicker.Positioner className='wt-positioner'>
                    <ArkColorPicker.Content className='wt-color-picker__content'>
                        <ArkColorPicker.Area className='wt-color-picker__area'>
                            <ArkColorPicker.AreaBackground className='wt-color-picker__area-background' />
                            <ArkColorPicker.AreaThumb className='wt-color-picker__area-thumb' />
                        </ArkColorPicker.Area>
                        <ArkColorPicker.ChannelSlider channel='hue' className='wt-color-picker__channel'>
                            <ArkColorPicker.ChannelSliderTrack className='wt-color-picker__channel-track' />
                            <ArkColorPicker.ChannelSliderThumb className='wt-color-picker__channel-thumb' />
                        </ArkColorPicker.ChannelSlider>
                        <ArkColorPicker.ChannelSlider channel='alpha' className='wt-color-picker__channel'>
                            <ArkColorPicker.TransparencyGrid className='wt-color-picker__channel-track'>
                                <ArkColorPicker.ChannelSliderTrack />
                            </ArkColorPicker.TransparencyGrid>
                            <ArkColorPicker.ChannelSliderThumb className='wt-color-picker__channel-thumb' />
                        </ArkColorPicker.ChannelSlider>
                        <div className='wt-color-picker__inputs'>
                            <ArkColorPicker.ChannelInput channel='hex' className='wt-input' aria-label='Hex color' />
                            <ArkColorPicker.ChannelInput channel='alpha' className='wt-input' aria-label='Alpha channel' />
                        </div>
                    </ArkColorPicker.Content>
                </ArkColorPicker.Positioner>
            </Portal>
        </ArkColorPicker.Root>
    );
});

export interface TagsInputProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    invalid?: boolean;
    name?: string;
    max?: number;
    allowDuplicates?: boolean;
}

export const TagsInput = forwardRef<HTMLDivElement, TagsInputProps>(function TagsInput(
    {
        className,
        id,
        value,
        defaultValue,
        onValueChange,
        placeholder = '输入后按 Enter',
        disabled,
        readOnly,
        required,
        invalid,
        name,
        max,
        allowDuplicates = false,
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
        <ArkTagsInput.Root
            ref={ref}
            id={controlId}
            ids={{ input: controlId }}
            className={cx('wt-tags-input', className)}
            value={value}
            defaultValue={defaultValue}
            onValueChange={(details) => onValueChange?.(details.value)}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            invalid={invalid}
            name={name}
            max={max}
            allowDuplicates={allowDuplicates}
            addOnPaste
            {...props}
        >
            <ArkTagsInput.Control className='wt-tags-input__control'>
                <ArkTagsInput.Context>
                    {(api) =>
                        api.value.map((tag, index) => (
                            <ArkTagsInput.Item key={`${tag}-${index}`} index={index} value={tag} className='wt-tags-input__item'>
                                <ArkTagsInput.ItemPreview className='wt-tags-input__preview'>
                                    <ArkTagsInput.ItemText>{tag}</ArkTagsInput.ItemText>
                                    <ArkTagsInput.ItemDeleteTrigger className='wt-tags-input__delete' aria-label={`删除 ${tag}`}>
                                        ×
                                    </ArkTagsInput.ItemDeleteTrigger>
                                </ArkTagsInput.ItemPreview>
                                <ArkTagsInput.ItemInput className='wt-tags-input__item-input' />
                            </ArkTagsInput.Item>
                        ))
                    }
                </ArkTagsInput.Context>
                <ArkTagsInput.Input
                    className='wt-tags-input__input'
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    aria-labelledby={ariaLabelledBy}
                    aria-describedby={ariaDescribedBy}
                    aria-errormessage={ariaErrorMessage}
                    aria-invalid={ariaInvalid}
                />
            </ArkTagsInput.Control>
            <ArkTagsInput.HiddenInput />
        </ArkTagsInput.Root>
    );
});

export interface FileUploadRejection {
    file: File;
    errors: Array<{ code: string; message?: string }>;
}

export interface FileUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
    accept?: string | string[] | Record<string, string[]>;
    multiple?: boolean;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    readOnly?: boolean;
    maxFiles?: number;
    minFileSize?: number;
    maxFileSize?: number;
    files?: File[];
    defaultFiles?: File[];
    onFilesChange?: (files: File[]) => void;
    onReject?: (rejections: FileUploadRejection[]) => void;
    name?: string;
    label?: ReactNode;
    description?: ReactNode;
    browseLabel?: ReactNode;
}

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(function FileUpload(
    {
        className,
        accept,
        multiple = false,
        disabled,
        required,
        invalid,
        readOnly,
        maxFiles,
        minFileSize,
        maxFileSize,
        files,
        defaultFiles,
        onFilesChange,
        onReject,
        name,
        label = '上传文件',
        description = '拖放文件到这里，或点击选择',
        browseLabel = '选择文件',
        ...props
    },
    ref,
) {
    const normalizedAccept =
        typeof accept === 'string' ? accept.split(',').map((item) => item.trim()).filter(Boolean) : accept;

    return (
        <ArkFileUpload.Root
            ref={ref}
            className={cx('wt-file-upload', className)}
            accept={normalizedAccept as ComponentProps<typeof ArkFileUpload.Root>['accept']}
            maxFiles={maxFiles ?? (multiple ? 24 : 1)}
            minFileSize={minFileSize}
            maxFileSize={maxFileSize}
            acceptedFiles={files}
            defaultAcceptedFiles={defaultFiles}
            onFileChange={(details) => onFilesChange?.(details.acceptedFiles)}
            onFileReject={(details) =>
                onReject?.(
                    details.files.map((rejection) => ({
                        file: rejection.file,
                        errors: rejection.errors.map((error) => ({ code: error, message: error })),
                    })),
                )
            }
            disabled={disabled}
            required={required}
            invalid={invalid}
            readOnly={readOnly}
            name={name}
            {...props}
        >
            <ArkFileUpload.HiddenInput />
            <ArkFileUpload.Label className='wt-file-upload__label'>{label}</ArkFileUpload.Label>
            <ArkFileUpload.Dropzone className='wt-file-upload__dropzone'>
                <span className='wt-file-upload__icon' aria-hidden='true'>
                    ↥
                </span>
                <span className='wt-file-upload__description'>{description}</span>
                <ArkFileUpload.Trigger className='wt-button' data-variant='soft' data-size='sm'>
                    {browseLabel}
                </ArkFileUpload.Trigger>
            </ArkFileUpload.Dropzone>
            <ArkFileUpload.Context>
                {(api) =>
                    api.acceptedFiles.length ? (
                        <ArkFileUpload.ItemGroup className='wt-file-upload__items'>
                            {api.acceptedFiles.map((file) => (
                                <ArkFileUpload.Item
                                    key={`${file.name}-${file.lastModified}`}
                                    file={file}
                                    className='wt-file-upload__item'
                                >
                                    <ArkFileUpload.ItemName className='wt-file-upload__name' />
                                    <ArkFileUpload.ItemSizeText className='wt-file-upload__size' />
                                    <ArkFileUpload.ItemDeleteTrigger
                                        className='wt-file-upload__remove'
                                        aria-label={`移除 ${file.name}`}
                                    >
                                        ×
                                    </ArkFileUpload.ItemDeleteTrigger>
                                </ArkFileUpload.Item>
                            ))}
                        </ArkFileUpload.ItemGroup>
                    ) : null
                }
            </ArkFileUpload.Context>
        </ArkFileUpload.Root>
    );
});
