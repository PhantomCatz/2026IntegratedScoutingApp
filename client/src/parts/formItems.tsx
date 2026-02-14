import '../public/stylesheets/formItems.css';
import { useRef, useEffect } from 'react';
import * as Utils from '../utils/utils';

import type { StringMap } from '../types/utilityTypes';
import { assertInstanceOf, assertBoolean, assertNumber, assertString  } from '../types/assertions';

type AlignOptions = "left" | "center" | "right";

type Disableable<T> = Partial<T> & { disabled: true } | T & { disabled?: false };

type FormType<FieldType> = {
	onFinish?: (values: FieldType) => void,
	onFinishFailed?: ( values: FieldType, errorFields: { [key: string]: string } ) => void,
	accessor: FormAccessorType<FieldType>,
	children?: React.ReactNode,
	initialValues?: Partial<FieldType>,
};
type InputType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	required?: boolean,
	message?: string,
	onChange?: (val: string) => void,
	onInput?: React.InputEventHandler,
	align?: AlignOptions,
	shown?: boolean,
	pattern?: string,
	disabled?: boolean,
	defaultValue?: string,
	minLength?: number,
	maxLength?: number,
}>;
type NumberInputType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	required?: boolean,
	message?: string,
	min?: number,
	max?: number,
	disabled?: boolean,
	onChange?: (val: number) => void,
	align?: AlignOptions,
	shown?: boolean,
	buttons?: boolean,
	defaultValue?: number,
}>;
type SelectType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	required?: boolean,
	message?: string,
	options: { label: string, value: string}[],
	onChange?: (val: string) => void,
	align?: AlignOptions,
	shown?: boolean,
	multiple?: boolean,
	defaultValue?: string | string[],
}>;
type CheckboxType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	onChange?: (val: boolean) => void,
	align?: AlignOptions,
	shown?: boolean,
	defaultValue?: boolean,
}>;
type TextAreaType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	required?: boolean,
	message?: string,
	disabled?: boolean
	onChange?: (val: string) => void,
	align?: AlignOptions,
	shown?: boolean,
	defaultValue?: string,
}>;
type RadioType<FieldType> = Disableable<{
	title: string | React.ReactElement,
	name: StringMap<FieldType>,
	value: string,
	required?: boolean,
	message?: string,
	disabled?: boolean
	onChange?: (val: boolean) => void,
	align?: AlignOptions,
	shown?: boolean,
	defaultValue?: string,
}>;
type FormAccessorType<FieldType> = {
	getFieldValue<K extends string & keyof FieldType>(id: K): FieldType[K],
	setFieldValue<K extends string & keyof FieldType>(id: K, newValue: FieldType[K]): void,
	setFormValues(values: Partial<FieldType>): void,
	resetFields(): void,
};

// TODO: implement onFinishFailed
function Form<FieldType>(props: FormType<NoInfer<FieldType>>): React.ReactElement {
	const onFinish = props.onFinish ?? (() => {});
	const accessor = props.accessor;
	const initialValues = props.initialValues;

	function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		// :eyes:
		const formValues: FieldType = {} as FieldType;

		const target = event.target;

		assertInstanceOf(target, HTMLFormElement);

		for(const input of target) {
			const id = input.id;
			if(!id) {
				continue;
			}

			const key = id as string & keyof FieldType;

			formValues[key] = accessor.getFieldValue(key);
		}

		onFinish(formValues);
	}

	const children = props.children;

	useEffect(() => {
		if(!initialValues) {
			return;
		}

		const DELAY = 50;

		setTimeout(() => {
			accessor.setFormValues(initialValues);
		}, DELAY);
	}, []);

	return (
		<form
			onSubmit={onSubmit}
		>
			{children}
		</form>
	);
}
// TODO: implement required fields
function Input<FieldType>(props: InputType<NoInfer<FieldType>>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const shown = props.shown ?? true;
	const required = (props.required ?? true) && shown;
	if((props.required ?? true) && !shown) {
		console.error("Required and not shown for", name)
	}
	const message = props.message ?? "";
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "center";
	const pattern = props.pattern;
	const disabled = props.disabled;
	const defaultValue = props.defaultValue;

	const input = useRef(null);

	function handleChange(e: React.ChangeEvent): void {
		const target = e.target;

		assertInstanceOf(target, HTMLInputElement);

		const newVal = target.value;

		onChange(newVal);
	}

	return (
		<>
			<div
				className="input input__text"
				style={{
					textAlign: align,
					display: shown ? 'inherit' : 'none',
				}}
			>
				{title &&
					<label
						style={{
							textAlign: align,
						}}
						htmlFor={name}
					>{title}</label>
				}
				<input
					id={name}
					name={name}
					ref={input}
					type="text"
					pattern={pattern}
					onChange={handleChange}
					required={required}
					disabled={disabled}
					defaultValue={defaultValue}
				/>
				<p
					className="message"
				>
					{message}
				</p>
			</div>
		</>
	);
}
// TODO: check out oninvalid for error message
function NumberInput<FieldType>(props: NumberInputType<FieldType>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const shown = props.shown ?? true;
	const required = (props.required ?? true) && shown;
	if((props.required ?? true) && !shown) {
		console.error("Required and not shown for", name)
	}
	const message = props.message;

	const min = props.min ?? 0;
	const max = props.max ?? Infinity;
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "center";
	const buttons = props.buttons ?? true;
	const defaultValue = props.defaultValue ?? props.min !== undefined ? min : undefined;
	const disabled = props.disabled;

	const input = useRef<HTMLInputElement>(null);

	function updateInputValue(delta: number): void {
		if(!input.current) {
			return;
		}

		const parsedValue = Utils.toNumber(input.current.value) + delta;
		let newValue: number;
		if(parsedValue > max) {
			newValue = max;
		} else if(parsedValue < min) {
			newValue = min;
		} else {
			newValue = parsedValue;
		}

		input.current.value = newValue.toString();

		// if we didn't have to clamp it
		if(parsedValue === newValue) {
			// :eyes:
			handleChange({target: input.current} as unknown as React.ChangeEvent);
		}
	}
	function handleChange(e: React.ChangeEvent): void {
		const target = e.target;

		assertInstanceOf(target, HTMLInputElement);

		const newVal = Utils.toNumber(target.value);

		onChange(newVal);
	}

	return (
		<>
			<div
				className="input input__number"
				style={{
					textAlign: align,
					display: shown ? 'inherit' : 'none',
				}}
			>
				{title &&
					<label
						style={{
							textAlign: align,
						}}
						htmlFor={name}
					>{title}</label>
				}
				<div>
					{ buttons &&
						<button
							type="button"
							className="changeButton changeButton__decrement"
							onClick={() => {
								updateInputValue(-1);
							}}
							disabled={disabled}
						>-</button>
					}
					<input
						ref={input}
						id={name}
						name={name}
						type="number"
						min={min}
						max={max}
						onChange={handleChange}
						required={required}
						defaultValue={defaultValue}
						disabled={disabled}
					/>
					{ buttons &&
						<button
							type="button"
							className="changeButton changeButton__increment"
							onClick={() => {
								updateInputValue(1);
							}}
							disabled={disabled}
						>+</button>
					}
				</div>
				<p
					className="message"
				>
					{message}
				</p>
			</div>
		</>
	);
}
function Select<FieldType>(props: SelectType<FieldType>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const shown = props.shown ?? true;
	const required = (props.required ?? true) && shown;
	if((props.required ?? true) && !shown) {
		console.error("Required and not shown for", name)
	}
	// TODO: remove?
	// const message = props.message ?? `Please input ${title}`;
	const options = props.options ?? [];
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "left";
	const multiple = props.multiple;
	const defaultValue = props.defaultValue ?? multiple ? [] : "";

	const select = useRef(null);

	const optionElements = options.map(function(item: { label: string, value: string }) {
		return (
			<option
				value={item.value}
				key={item.value}
			>
				{item.label}
			</option>
		);
	});

	function handleChange(event: React.ChangeEvent): void {
		const target = event.target;

		assertInstanceOf(target, HTMLSelectElement);

		onChange(target.value);
	}

	return (
		<>
			<div
				className="input input__select"
				style={{
					textAlign: align,
					display: shown ? 'inherit' : 'none',
				}}
			>
				{title &&
					<label
						style={{
							textAlign: align,
						}}
						htmlFor={name}
					>{title}</label>
				}
				<select
					ref={select}
					id={name}
					name={name}
					defaultValue={defaultValue}
					required={required}
					multiple={multiple}
					onChange={handleChange}
					size={multiple ? options.length : undefined}
				>
					{optionElements}
				</select>
			</div>
		</>
	);
}
function Checkbox<FieldType>(props: CheckboxType<NoInfer<FieldType>>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "left";
	const shown = props.shown ?? true;
	const disabled = props.disabled;
	const defaultValue = props.defaultValue;

	const checkbox = useRef<HTMLInputElement>(null);

	function handleChange(event: React.ChangeEvent): void {
		const target = event.target;

		assertInstanceOf(target, HTMLInputElement);

		onChange(target.checked);
	}

	return (
		<>
			<div
				className="input input__checkbox"
				style={{
					display: shown ? 'inherit' : 'none',
				}}
			>
				{title &&
					<label
						style={{
							textAlign: align,
						}}
						htmlFor={name}
					>{title}</label>
				}
				<input
					ref={checkbox}
					id={name}
					name={name}
					type="checkbox"
					onChange={handleChange}
					checked={defaultValue}
					disabled={disabled}
				/>
			</div>
		</>
	);
}
function TextArea<FieldType>(props: TextAreaType<NoInfer<FieldType>>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const shown = props.shown ?? true;
	const required = (props.required ?? true) && shown;
	if((props.required ?? true) && !shown) {
		console.error("Required and not shown for", name)
	}
	const disabled = props.required;
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "left";
	const defaultValue = props.defaultValue;

	const textbox = useRef(null);

	function handleChange(event: React.ChangeEvent): void {
		const target = event.target;

		assertInstanceOf(target, HTMLTextAreaElement);

		onChange(target.value);
	}

	return (
		<>
			<div
				className="input input__textarea"
				style={{
					display: shown ? 'inherit' : 'none',
				}}
			>
				{title &&
					<label
						style={{
							textAlign: align,
						}}
						htmlFor={name}
					>{title}</label>
				}
				<textarea
					ref={textbox}
					id={name}
					name={name}
					onChange={handleChange}
					defaultValue={defaultValue}
					required={required}
					disabled={disabled}
				/>
			</div>
		</>
	);
}
function Radio<FieldType>(props: RadioType<NoInfer<FieldType>>): React.ReactElement {
	const title = props.title;
	const name = props.name;
	const value = props.value;
	const shown = props.shown ?? true;
	const required = (props.required ?? true) && shown;
	if((props.required ?? true) && !shown) {
		console.error("Required and not shown for", name)
	}
	const disabled = props.required;
	const onChange = props.onChange ?? (() => {});
	const align = props.align ?? "center";
	const defaultValue = props.defaultValue;

	const radio = useRef(null);

	function handleChange(event: React.ChangeEvent): void {
		const target = event.target;

		assertInstanceOf(target, HTMLInputElement);

		onChange(target.checked);
	}

	return (
		<>
			<div
				className="input input__radio"
				style={{
					display: shown ? 'inherit' : 'none',
				}}
			>
				<label
					style={{
						textAlign: align,
					}}
					htmlFor={`${name}-${value}`}
				>{title}
					<input
						ref={radio}
						type="radio"
						id={`${name}-${value}`}
						name={name}
						value={value}
						onChange={handleChange}
						defaultValue={defaultValue}
						required={required}
						disabled={disabled}
					/>
				</label>
			</div>
		</>
	);
}

// This was the best solution I had that could infer the key type qaq
function getFieldAccessor<FieldType>(): FormAccessorType<FieldType> {
	const accessor =  {
		getFieldValue<K extends string & keyof FieldType>(id: K): FieldType[K] {
			const elements = document.querySelectorAll(`[name=${id}]`);

			if(!elements.length) {
				throw new Error(`Could not find element ${id}`);
			}

			try {
				if(elements.length === 1) {
					return getFieldValueSingleElement<K, FieldType>(elements[0]);
				} else {
					return getFieldValueMultipleElements<K, FieldType>(elements, id);
				}
			} catch (err) {
				console.error(`err=`, err);
				console.error(`id=`, id);
				console.error(`elements=`, elements);

				throw err;
			}
		},
		setFieldValue<K extends string & keyof FieldType>(id: K, newValue: FieldType[K]): void {
			const elements = document.querySelectorAll(`[name=${id}]`);

			if(!elements.length) {
				throw new Error(`Could not find element ${id}`);
			}

			try {
				if(elements.length === 1) {
					setFieldValueSingleElement(elements[0], newValue);
				} else {
					setFieldValueMultipleElements<K, FieldType>(elements, newValue, id);
				}
			} catch (err) {
				console.error(`err=`, err);
				console.error(`id=`, id);
				console.error(`newValue=`, newValue);
				console.error(`elements[0]=`, elements[0]);

				throw err;
			}
		},
		setFormValues(values: Partial<FieldType>): void {
			for(const [k, v] of Object.entries(values)) {
				type Key = string & keyof FieldType;

				accessor.setFieldValue(k as Key, v as FieldType[Key]);
			}
		},
		resetFields(): void {
			const form = document.querySelector("form");

			if(!form) {
				console.error(`No form: form=`, form);
				return;
			}

			form.reset();
		}
	}

	return accessor;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function setFieldValueSingleElement<T>(element: Element, newValue: T): void {
	const tag = element.nodeName;

	switch(tag) {
		case "SELECT":
			assertInstanceOf(element, HTMLSelectElement);
			if(element.multiple) {
				for (let i = 0; i < element.options.length; i++) {

					element.options[i].selected = (newValue as unknown[]).indexOf(element.options[i].value) >= 0;
				}
			} else {
				assertString(newValue);
				element.value = newValue;
			}
			break;
		case "TEXTAREA":
			assertInstanceOf(element, HTMLTextAreaElement);
			assertString(newValue);
			element.value = newValue;
			break;
		case "INPUT":
			assertInstanceOf(element, HTMLInputElement);
			switch(element.type) {
				case "checkbox":
					assertBoolean(newValue);
					element.checked = newValue;
					break;
				case "number":
					assertNumber(newValue);
					element.value = newValue.toString();
					break;
				case "text":
					assertString(newValue);
					element.value = newValue;
					break;
				default:
					throw new Error(`Could not use submit type ${element.type}`);
			}
			break;
		default:
			throw new Error(`Could not use element tag ${tag}`);
	}
}
function setFieldValueMultipleElements<K extends string & keyof FieldType, FieldType>(elementList: NodeListOf<Element>, newValue: FieldType[K], id: K): void {
	for(const element of elementList) {
		const tag = element.nodeName;

		switch(tag) {
			case "INPUT":
				assertInstanceOf(element, HTMLInputElement);
				switch(element.type) {
					case "radio":
						assertString(newValue);
						if(newValue === element.value) {
							element.checked = true;
						} else {
							element.checked = false;
						}
						break;
					default:
						throw new Error(`Could not use submit type ${element.type}`);
				}
				break;
			default:
				throw new Error(`Could not use element tag ${tag}`);
		}
	}

	throw new Error(`Could not set value of ${id}`);
}
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function getFieldValueSingleElement<K extends string & keyof FieldType, FieldType>(element: Element): FieldType[K] {
	type ResultType = FieldType[K];

	const tag = element.nodeName;

	switch(tag) {
		case "SELECT":
			assertInstanceOf(element, HTMLSelectElement);
			if(element.multiple) {
				const options: string[] = [];
				for(const option of element.selectedOptions) {
					options.push(option.value);
				}
				return options as ResultType;
			} else {
				return element.value as ResultType;
			}
		case "TEXTAREA":
			assertInstanceOf(element, HTMLTextAreaElement);
			return element.value as ResultType;
		case "INPUT":
			assertInstanceOf(element, HTMLInputElement);
			switch(element.type) {
				case "checkbox":
					return element.checked as ResultType;
				case "number":
					return Number(element.value) as ResultType;
				case "text":
					return element.value as ResultType;
				case "submit":
				default:
					throw new Error(`Could not use submit type ${element.type}`);
			}
		default:
			throw new Error(`Could not use element tag ${tag}`);
	}
}
function getFieldValueMultipleElements<K extends string & keyof FieldType, FieldType>(elementList: NodeListOf<Element>, id: K): FieldType[K] {
	type ResultType = FieldType[K];

	for(const element of elementList) {
		const tag = element.nodeName;

		switch(tag) {
			case "INPUT":
				assertInstanceOf(element, HTMLInputElement);
				switch(element.type) {
					case "radio": {
						if(element.checked) {
							const value = element.value;
							return value as ResultType;
						}
						break;
					}
					default:
						throw new Error(`Could not use submit type ${element.type}`);
				}
				break;
			default:
				throw new Error(`Could not use element tag ${tag}`);
		}

		throw new Error(`Could not find value of element`);
	}

	throw new Error(`Could not get value of ${id}`);
}

export { Input, NumberInput, Select, Checkbox, TextArea, Radio };
export { getFieldAccessor, };
export default Form;
