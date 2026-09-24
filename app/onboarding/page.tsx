import { OnboardingWizard } from "@/app/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER ?? null;

  return (
    <div className="relative min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
            T
          </div>
          <span className="text-sm font-semibold tracking-[0.2em] text-stone-800">
            TABLETALK AI
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Set up your restaurant</h1>
          <p className="mt-1 text-sm text-stone-500">
            Takes about 3 minutes. You can always edit everything later from the dashboard.
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-stone-200">
          <style>{`
            .input-base {
              width: 100%;
              border: 1px solid #d6d3d1;
              padding: 0.625rem 1rem;
              font-size: 0.875rem;
              color: #1c1917;
              outline: none;
              border-radius: 0.25rem;
            }
            .input-base:focus { border-color: #14b8a6; }
            .input-base::placeholder { color: #a8a29e; }
            .btn-primary {
              background: #36b38f;
              color: white;
              font-size: 0.875rem;
              font-weight: 500;
              padding: 0.75rem 1.5rem;
              border-radius: 0.375rem;
              cursor: pointer;
              border: none;
              transition: background 0.15s;
              text-decoration: none;
              display: block;
            }
            .btn-primary:hover:not(:disabled) { background: #2fa07f; }
            .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            .btn-secondary {
              background: white;
              color: #57534e;
              font-size: 0.875rem;
              font-weight: 500;
              padding: 0.75rem 1.5rem;
              border-radius: 0.375rem;
              cursor: pointer;
              border: 1px solid #d6d3d1;
              transition: background 0.15s;
            }
            .btn-secondary:hover { background: #f5f5f4; }
          `}</style>
          <OnboardingWizard twilioNumber={twilioNumber} />
        </div>
      </main>
    </div>
  );
}
