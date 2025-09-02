// lib/validators/password.ts
import { LOWERCASE_REGEX, UPPERCASE_REGEX, NUMBER_REGEX, SPECIAL_CHAR_REGEX } from '@/lib/regex'

export type PasswordCheckState = {
  length: boolean
  lowercase: boolean
  uppercase: boolean
  number: boolean
  special: boolean
}

export function getPasswordChecks(password: string): PasswordCheckState {
  return {
    length: password.length >= 8,
    lowercase: LOWERCASE_REGEX.test(password),
    uppercase: UPPERCASE_REGEX.test(password),
    number: NUMBER_REGEX.test(password),
    special: SPECIAL_CHAR_REGEX.test(password),
  }
}

export function isPasswordValid(password: string): boolean {
  const checks = getPasswordChecks(password)
  return Object.values(checks).every(Boolean)
}
