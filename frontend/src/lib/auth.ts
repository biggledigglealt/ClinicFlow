import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

export function getAuthRedirectUrl() {
  return Capacitor.isNativePlatform()
    ? 'ca.uottawa.clinicflow://auth-callback'
    : window.location.origin
}

export async function register(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  })

  if (error) throw error

  return data
}

export async function resendSignupVerification(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  })

  if (error) throw error

  return data
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw error

  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()

  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  })

  if (error) throw error

  return data
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })

  if (reauthenticationError) throw reauthenticationError

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data.user
}
