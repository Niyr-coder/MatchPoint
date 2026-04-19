"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el inicio de sesión con Google.",
  server_error: "Error del servidor. Intenta de nuevo.",
  default: "Ocurrió un error al iniciar sesión. Intenta de nuevo.",
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorCode = searchParams.get("error")
    if (errorCode) {
      setError(ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.default)
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setError(null)
    setIsLoading(true)
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/api/auth/callback`,
      },
    })
  }

  return (
    <div>
      {/* Header */}
      <h1 className="font-black text-foreground text-[32px] tracking-[-0.03em] leading-none uppercase">
        Bienvenido<span className="text-primary">.</span>
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        Ingresa con tu cuenta de Google para continuar.
      </p>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Google button */}
      <div className="mt-10">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          aria-busy={isLoading}
          className="relative flex items-center justify-center gap-3 w-full border border-border bg-white hover:bg-muted active:scale-[0.98] rounded-xl px-5 py-3.5 text-sm font-bold text-foreground transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          style={{ fontFamily: "inherit" }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-[18px] h-[18px] animate-spin shrink-0 text-muted-foreground" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-muted-foreground text-xs mt-5 leading-relaxed text-center">
          Al continuar, aceptas nuestros{" "}
          <a href="#" className="text-primary font-bold hover:underline focus-visible:outline-none focus-visible:underline">Términos de Servicio</a>{" "}
          y{" "}
          <a href="#" className="text-primary font-bold hover:underline focus-visible:outline-none focus-visible:underline">Política de Privacidad</a>.
        </p>
      </div>
    </div>
  )
}
