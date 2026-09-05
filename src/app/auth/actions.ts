"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function login(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Enter your email and password.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Enter an email and a password.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Supabase's own message here ("User already registered") leaves the
    // person stuck on this page with no obvious next step - point them at
    // the form that actually works instead of making them notice and
    // navigate there themselves.
    if (/already registered|already exists/i.test(error.message)) {
      redirect(
        `/login?notice=${encodeURIComponent("That email already has an account - sign in instead.")}`,
      );
    }
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // With email confirmation on (the Supabase default), signUp succeeds but
  // issues no session until the link in the confirmation email is clicked.
  if (!data.session) {
    redirect(
      `/login?notice=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`,
    );
  }

  redirect("/profile");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
