import { createContext, useContext } from 'react'

/** What a <Field> tells the control inside it: is it required, is it in error (red border). */
export interface FieldState {
  required: boolean
  invalid: boolean
  /** The field may stay empty: a picker inside it offers "clear". */
  optional?: boolean
}
export const FieldContext = createContext<FieldState>({ required: false, invalid: false })
export const useFieldState = () => useContext(FieldContext)

/** Border of a text-like control: red only while the field is in error. */
export const invalidCls = 'border-red-500 ring-1 ring-red-500 dark:border-red-400 dark:ring-red-400'
