import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../utils/apiClient';
import { Logo, BRAND_NAME } from './Logo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { isNative } from '../utils/platform';

const GOOGLE_CLIENT_ID = '14287582180-0eanrl7vhg7h6obhogemb18jkqjmtc24.apps.googleusercontent.com';
// Google blocks its web sign-in inside app WebViews, so the Android/iOS app uses the
// native account picker instead. It returns an ID token for the same web client ID,
// which the Worker already verifies.
const isNativeApp = isNative;

interface LoginProps {
  onLoginSuccess?: (session: any) => void;
}

/** Static product preview: shows what writing in the app looks like. */
const PreviewSheet: React.FC = () => (
  <div className="w-full max-w-md rounded-2xl border border-paper-darker bg-paper-dark shadow-paper-md p-6 text-left">
    <div className="flex items-center gap-2 mb-5">
      <span className="w-2.5 h-2.5 rounded-full bg-paper-darker" />
      <span className="w-2.5 h-2.5 rounded-full bg-paper-darker" />
      <span className="w-2.5 h-2.5 rounded-full bg-paper-darker" />
      <span className="ml-3 text-[11px] text-ink-muted font-mono">Untitled · Verse 1</span>
    </div>
    <p className="font-serif text-xl leading-9 text-ink">
      Streetlight on the <span className="underline decoration-terracotta decoration-2 underline-offset-4">water</span>
      <br />
      Quiet as a <span className="underline decoration-terracotta decoration-2 underline-offset-4">daughter</span>
      <br />
      <span className="text-ink-light">Hold the line a little longer</span>
    </p>
    <div className="mt-5 flex gap-2 text-[11px] font-mono text-ink-muted">
      <span className="px-2 py-1 rounded-md bg-terracotta-light text-terracotta">rhyme: water / daughter</span>
      <span className="px-2 py-1 rounded-md bg-paper-active">17 syllables</span>
    </div>
  </div>
);

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [writerName, setWriterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuest, setShowGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNativeApp) return;
    const handleCredentialResponse = async (response: any) => {
      if (!response?.credential) return;
      setLoading(true);
      setError(null);
      try {
        const sess = await api.auth.signInWithGoogleCredential(response.credential);
        if (onLoginSuccess) {
          onLoginSuccess(sess);
        }
        if (window.location.pathname !== '/' || !onLoginSuccess) {
          window.location.href = '/';
        }
      } catch (err: any) {
        console.error('Google login failed:', err);
        setError('Google sign-in failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnContainerRef.current.innerHTML = '';
          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            // Match the guest button: fill the column (GIS allows 200-400px)
            width: Math.max(200, Math.min(400, googleBtnContainerRef.current.clientWidth || 320)),
          });
        } catch (e) {
          console.error('Error rendering Google button:', e);
        }
      }
    };

    // If script is already loaded
    if ((window as any).google?.accounts?.id) {
      initializeGoogle();
    } else {
      // Poll briefly for Google script load
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          initializeGoogle();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const handleNativeGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      await SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID } });
      const res = await SocialLogin.login({ provider: 'google', options: {} });
      const idToken = (res.result as { idToken?: string | null }).idToken;
      if (!idToken) throw new Error('No ID token returned');
      const sess = await api.auth.signInWithGoogleCredential(idToken);
      if (onLoginSuccess) {
        onLoginSuccess(sess);
      }
      if (window.location.pathname !== '/' || !onLoginSuccess) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Native Google login failed:', err);
      setError('Google sign-in failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const name = writerName.trim() || 'Writer';
      const sess = await api.auth.signInWithGuest(name, name);
      if (onLoginSuccess) {
        onLoginSuccess(sess);
      }
      if (window.location.pathname !== '/' || !onLoginSuccess) {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Guest login error:', err);
      setError('Sign-in failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-paper flex">
      {/* Brand panel (desktop) */}
      <aside className="hidden lg:flex flex-1 flex-col justify-between bg-paper-dark border-r border-paper-darker p-12">
        <Logo size={32} />
        <div className="flex flex-col gap-8">
          <h2 className="font-serif text-4xl leading-tight text-ink max-w-md">
            Where your next lyric starts.
          </h2>
          <PreviewSheet />
        </div>
        <p className="text-xs text-ink-muted">Rhymes, syllables and Malayalam support built in.</p>
      </aside>

      {/* Sign-in */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm flex flex-col">
          <Logo size={30} className="lg:hidden mb-10" />
          <h1 className="font-serif text-3xl font-semibold text-ink mb-2">Welcome to {BRAND_NAME}</h1>
          <p className="text-sm text-ink-muted leading-relaxed mb-8">
            Your lyric notebook. Sign in to keep every song in sync across your devices.
          </p>

          <div className="min-h-[44px] flex items-center">
            {loading ? (
              <div className="text-sm text-terracotta font-medium animate-pulse" role="status">
                Signing you in…
              </div>
            ) : isNativeApp ? (
              <Button variant="primary" size="lg" onClick={handleNativeGoogleLogin} className="w-full">
                Continue with Google
              </Button>
            ) : (
              <div ref={googleBtnContainerRef} className="w-full flex" />
            )}
          </div>

          <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <div className="flex-1 h-px bg-paper-darker" />
            <span className="text-[11px] text-ink-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-paper-darker" />
          </div>

          {!showGuest ? (
            <Button variant="secondary" size="lg" onClick={() => setShowGuest(true)} className="w-full">
              Continue as guest
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <form onSubmit={handleGuestLogin} className="flex flex-col gap-3">
              <label htmlFor="pen-name" className="text-xs font-medium text-ink-muted">
                Pen name
              </label>
              <Input
                id="pen-name"
                type="text"
                placeholder="e.g. Max"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
                autoFocus
              />
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                Start writing
              </Button>
            </form>
          )}

          {showGuest && (
            <p className="text-xs text-ink-muted mt-3">Guest songs live on this device until you sign in with Google.</p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};
