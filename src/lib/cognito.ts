import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js'
import { getCognitoConfig } from './cognitoConfig'

export type AuthTokens = {
  accessToken: string
  idToken: string
  refreshToken: string
}

export type SignInResult =
  | { status: 'success'; tokens: AuthTokens; email: string }
  | {
      status: 'new_password_required'
      cognitoUser: CognitoUser
      userAttributes: Record<string, string>
    }

let userPool: CognitoUserPool | null = null

function getUserPool(): CognitoUserPool {
  if (!userPool) {
    const { userPoolId, clientId } = getCognitoConfig()
    userPool = new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    })
  }
  return userPool
}

function mapCognitoError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Something went wrong. Please try again.'

  if (message.includes('User does not exist')) {
    return 'No account found with this email.'
  }
  if (message.includes('Incorrect username or password')) {
    return 'Incorrect email or password.'
  }
  if (message.includes('User is not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (message.includes('Password attempts exceeded')) {
    return 'Too many attempts. Wait a few minutes and try again.'
  }
  if (message.includes('InvalidParameterException')) {
    return 'Check your email and password format.'
  }
  if (message.includes('UsernameExistsException')) {
    return 'An account with this email already exists.'
  }
  if (message.includes('InvalidPasswordException')) {
    return 'Password does not meet the requirements.'
  }
  if (message.includes('CodeMismatchException')) {
    return 'Invalid verification code. Try again.'
  }
  if (message.includes('ExpiredCodeException')) {
    return 'Verification code expired. Request a new one.'
  }
  if (message.includes('LimitExceededException')) {
    return 'Too many requests. Wait a few minutes and try again.'
  }

  return message
}

export type SignUpResult = {
  email: string
  userConfirmed: boolean
  userSub: string
}

export function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const attributes: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: 'email', Value: normalizedEmail }),
  ]

  const trimmedName = displayName?.trim()
  if (trimmedName) {
    attributes.push(
      new CognitoUserAttribute({ Name: 'name', Value: trimmedName }),
    )
  }

  return new Promise((resolve, reject) => {
    getUserPool().signUp(
      normalizedEmail,
      password,
      attributes,
      [],
      (err, result) => {
        if (err) {
          reject(new Error(mapCognitoError(err)))
          return
        }
        if (!result) {
          reject(new Error('Sign up failed. Please try again.'))
          return
        }
        resolve({
          email: normalizedEmail,
          userConfirmed: result.userConfirmed ?? false,
          userSub: result.userSub,
        })
      },
    )
  })
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const cognitoUser = new CognitoUser({
    Username: normalizedEmail,
    Pool: getUserPool(),
  })

  return new Promise((resolve, reject) => {
    cognitoUser.confirmRegistration(code.trim(), true, (err) => {
      if (err) {
        reject(new Error(mapCognitoError(err)))
        return
      }
      resolve()
    })
  })
}

export function resendConfirmationCode(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const cognitoUser = new CognitoUser({
    Username: normalizedEmail,
    Pool: getUserPool(),
  })

  return new Promise((resolve, reject) => {
    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(new Error(mapCognitoError(err)))
        return
      }
      resolve()
    })
  })
}

const PENDING_SIGNUP_KEY = 'stock_pending_signup'

export type PendingSignUp = {
  email: string
  password: string
}

export function storePendingSignUp(data: PendingSignUp): void {
  sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data))
}

export function getPendingSignUp(): PendingSignUp | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingSignUp
  } catch {
    return null
  }
}

export function clearPendingSignUp(): void {
  sessionStorage.removeItem(PENDING_SIGNUP_KEY)
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const cognitoUser = new CognitoUser({
    Username: normalizedEmail,
    Pool: getUserPool(),
  })

  const authDetails = new AuthenticationDetails({
    Username: normalizedEmail,
    Password: password,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const accessToken = session.getAccessToken().getJwtToken()
        const idToken = session.getIdToken().getJwtToken()
        const refreshToken = session.getRefreshToken().getToken()

        resolve({
          status: 'success',
          email: normalizedEmail,
          tokens: { accessToken, idToken, refreshToken },
        })
      },
      onFailure: (err) => {
        reject(new Error(mapCognitoError(err)))
      },
      newPasswordRequired: (userAttributes) => {
        const attrs: Record<string, string> = {}
        for (const [key, value] of Object.entries(userAttributes)) {
          if (typeof value === 'string') {
            attrs[key] = value
          }
        }
        resolve({
          status: 'new_password_required',
          cognitoUser,
          userAttributes: attrs,
        })
      },
    })
  })
}

export function signOut(): void {
  const pool = getUserPool()
  const user = pool.getCurrentUser()
  if (user) {
    user.signOut()
  }
}

export function getCurrentCognitoUser(): CognitoUser | null {
  return getUserPool().getCurrentUser()
}
