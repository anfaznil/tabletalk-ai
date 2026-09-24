"use client";

import { FormEvent, useState } from "react";

const BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1920&q=80";

export function SignupForm() {
  const [restaurantName, setRestaurantName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, username, password }),
      });

      const data = (await res.json()) as {
        errors?: Record<string, string>;
        error?: string;
      };

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ form: data.error ?? "Signup failed." });
        }
        return;
      }

      window.location.assign("/");
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center px-8 py-6 md:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">
              T
            </div>
            <span className="text-sm font-semibold tracking-[0.2em] text-white">
              TABLETALK AI
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-[420px] bg-white px-10 py-12 shadow-2xl">
            <h1 className="mb-2 text-center text-base font-bold tracking-[0.15em] text-stone-900">
              CREATE ACCOUNT
            </h1>
            <p className="mb-8 text-center text-xs text-stone-500">
              14-day free trial · No credit card required
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <input
                  name="restaurantName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Restaurant name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                  className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none"
                />
                {errors.restaurantName && (
                  <p className="mt-1 text-xs text-red-600">{errors.restaurantName}</p>
                )}
              </div>

              <div>
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                )}
              </div>

              <div>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-stone-300 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <p className="text-center text-sm text-red-600" role="alert">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-md bg-[#36b38f] py-3 text-sm font-medium text-white transition-colors hover:bg-[#2fa07f] disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Start free trial"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-stone-500">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-teal-600 hover:underline">
                Log in
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
