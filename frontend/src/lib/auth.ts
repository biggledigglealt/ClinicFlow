import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export async function register(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })

  if (error) throw error

  return data
}

export async function resendSignupVerification(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: window.location.origin },
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
    redirectTo: window.location.origin,
  })

  if (error) throw error

  return data
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error

  return data.user
}
