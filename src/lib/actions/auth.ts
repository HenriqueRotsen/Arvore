"use server";

import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return "E-mail ou senha inválidos.";
    }
    throw error;
  }

  redirect("/pessoas");
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/");
}
