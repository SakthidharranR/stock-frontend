export type PasswordIssue = string

export function validatePassword(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = []

  if (password.length < 8) {
    issues.push('At least 8 characters')
  }
  if (!/[a-z]/.test(password)) {
    issues.push('One lowercase letter')
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('One uppercase letter')
  }
  if (!/[0-9]/.test(password)) {
    issues.push('One number')
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    issues.push('One special character')
  }

  return issues
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm
}
