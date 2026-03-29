"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    // Browser redirects — no need to reset loading state
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-black text-[#0a0a0a] text-3xl tracking-tight leading-tight mb-2">
          Empieza a jugar
        </h1>
        <p className="text-[#737373] text-sm">
          Accede o crea tu cuenta en un solo clic.
        </p>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex items-center gap-3 w-full border border-[#e5e5e5] bg-white hover:bg-[#f5f5f5] rounded-xl px-4 py-4 text-sm font-semibold text-[#0a0a0a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {isLoading ? (
          <Loader2 className="w-[18px] h-[18px] animate-spin shrink-0 text-[#737373]" />
        ) : (
          <GoogleIcon />
        )}
        <span>{isLoading ? "Conectando..." : "Continuar con Google"}</span>
      </button>

      {/* Terms */}
      <p className="text-xs text-[#c0c0c0] leading-relaxed">
        Al continuar aceptas nuestros{" "}
        <a href="#" className="underline hover:text-[#737373] transition-colors">
          Términos de Servicio
        </a>{" "}
        y{" "}
        <a href="#" className="underline hover:text-[#737373] transition-colors">
          Política de Privacidad
        </a>
        . Si no tienes cuenta, se creará una automáticamente.
      </p>
    </div>
  )
}
