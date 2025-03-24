'use server'

import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  // Here you would typically validate the user credentials
  // For this example, we'll just check if the email and password are not empty
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // Simulate a delay as if we're checking the credentials
  await new Promise(resolve => setTimeout(resolve, 1000))

  // For demonstration, let's consider the login successful if the email contains '@'
  // In a real application, you'd check against your user database
  if (email.toString().includes('@')) {
    // Redirect to a dashboard or home page after successful login
    redirect('/dashboard')
  } else {
    return { error: 'Invalid email or password' }
  }
}

