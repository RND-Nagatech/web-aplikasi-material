import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";
import loginIllustration from "../../../assets/logo_login.png";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(4, "Minimal 4 karakter").max(72),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Minimal 2 karakter").max(120),
    email: z.string().trim().email("Email tidak valid").max(255),
    password: z.string().min(4, "Minimal 4 karakter").max(72),
    confirmPassword: z.string().min(4, "Minimal 4 karakter").max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak sama",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
const authInputClass =
  "h-11 rounded-xl border-slate-300 bg-white/95 px-3 text-[15px] shadow-sm transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const redirectAfterAuth = () => {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
    navigate(from, { replace: true });
  };

  const onLoginSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Selamat datang kembali");
      redirectAfterAuth();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setSubmitting(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast.success("Akun berhasil dibuat");
      redirectAfterAuth();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Register gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex h-screen items-center justify-center overflow-hidden bg-muted/30 p-4">
      <div className="h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid h-full grid-cols-1 lg:grid-cols-2">
          <div className="relative hidden p-4 lg:block">
            <div className="h-full overflow-hidden rounded-2xl">
              <img src={loginIllustration} alt="Login" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="flex h-full items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Masuk" : "Daftar"}</h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Akses dasbor admin" : "Buat akun baru untuk mengakses dasbor"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "outline"}
              onClick={() => setMode("login")}
            >
              Masuk
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "default" : "outline"}
              onClick={() => setMode("register")}
            >
              Daftar
            </Button>
          </div>

              {mode === "login" ? (
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className={authInputClass}
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Kata sandi</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className={`${authInputClass} pr-10`}
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground"
                        aria-label={showLoginPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Memproses..." : "Masuk"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama</Label>
                    <Input id="name" autoComplete="name" className={authInputClass} {...registerForm.register("name")} />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      autoComplete="email"
                      className={authInputClass}
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Kata sandi</Label>
                    <div className="relative">
                      <Input
                        id="registerPassword"
                        type={showRegisterPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${authInputClass} pr-10`}
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground"
                        aria-label={showRegisterPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi kata sandi</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`${authInputClass} pr-10`}
                        {...registerForm.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground"
                        aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Memproses..." : "Daftar"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
