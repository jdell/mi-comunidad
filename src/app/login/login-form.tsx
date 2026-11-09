"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

type Channel = "phone" | "email";

function toE164(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `+34${digits}`;
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError ? "No se pudo iniciar sesión. Inténtalo de nuevo." : null,
  );
  const [pending, startTransition] = useTransition();

  const supabase = createClient();

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const target = channel === "phone" ? toE164(phone) : email.trim().toLowerCase();
      const { error } =
        channel === "phone"
          ? await supabase.auth.signInWithOtp({ phone: target })
          : await supabase.auth.signInWithOtp({ email: target, options: { shouldCreateUser: true } });
      if (error) {
        setError(
          error.status === 429
            ? "Demasiados intentos. Espera un minuto y vuelve a probar."
            : "No hemos podido enviar el código. Revisa el dato introducido.",
        );
        return;
      }
      setSentTo(target);
    });
  }

  function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    startTransition(async () => {
      const token = code.replace(/\D/g, "");
      const { error } =
        channel === "phone"
          ? await supabase.auth.verifyOtp({ phone: sentTo, token, type: "sms" })
          : await supabase.auth.verifyOtp({ email: sentTo, token, type: "email" });
      if (error) {
        setError("Código incorrecto o caducado.");
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  function signInWithGoogle() {
    setError(null);
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) setError("No se pudo conectar con Google.");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sentTo ? (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 text-center text-lg tracking-[0.4em]"
                autoFocus
                required
              />
              <p className="text-sm text-muted-foreground">Lo hemos enviado a {sentTo}.</p>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Verificar y entrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSentTo(null);
                setCode("");
              }}
            >
              Cambiar {channel === "phone" ? "teléfono" : "email"}
            </Button>
          </form>
        ) : (
          <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <TabsList className="w-full">
              <TabsTrigger value="phone">Teléfono</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>
            <TabsContent value="phone">
              <form onSubmit={sendCode} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono móvil</Label>
                  <div className="flex gap-2">
                    <span className="inline-flex h-11 items-center rounded-lg border bg-muted px-3 text-sm">+34</span>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="612 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />} Enviar código por SMS
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="email">
              <form onSubmit={sendCode} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />} Enviar código por email
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> o continuar con <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="h-11 w-full" onClick={signInWithGoogle} disabled={pending}>
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.2H2.1A11 11 0 0 0 1 12c0 1.8.4 3.4 1.1 4.8L5.7 14z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.2L5.7 10C6.6 7.4 9.1 5.4 12 5.4z" />
          </svg>
          Google
        </Button>
      </CardContent>
    </Card>
  );
}
