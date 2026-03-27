"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  UserCheck,
  Clock,
  Monitor,
  Wifi,
  Camera,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  checkinRegistration,
  getCheckinStats,
  requestKioskPairing,
  getKioskPairingStatus,
  getKioskSession,
  type CheckinStats,
  type KioskSession,
} from "@/lib/api";

type CheckinResult = {
  status: "success" | "error" | "already";
  name: string;
  message: string;
};

// ─── Pairing Screen ─────────────────────────────────────────────────────────
function PairingScreen({ onPaired }: { onPaired: (session: KioskSession, token: string) => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestCode = useCallback(async () => {
    try {
      setError(null);
      const result = await requestKioskPairing();
      setCode(result.code);
      setExpiresAt(Date.now() + result.expiresIn * 1000);
    } catch {
      setError("Failed to generate pairing code. Check your connection.");
    }
  }, []);

  useEffect(() => {
    requestCode();
  }, [requestCode]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setCode(null);
        requestCode();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, requestCode]);

  // Poll for pairing confirmation
  useEffect(() => {
    if (!code) return;

    pollRef.current = setInterval(async () => {
      try {
        const status = await getKioskPairingStatus(code);
        if (status.status === "confirmed" && status.sessionToken) {
          if (pollRef.current) clearInterval(pollRef.current);
          const { session } = await getKioskSession(status.sessionToken);
          localStorage.setItem("nhimbe_kiosk_token", status.sessionToken);
          onPaired(session, status.sessionToken);
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [code, onPaired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Monitor className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Set Up Check-In Kiosk</h1>
        <p className="text-text-secondary mb-10">
          Enter this code on your phone to pair this screen with your event
        </p>

        {error ? (
          <div className="mb-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={requestCode}>Try Again</Button>
          </div>
        ) : code ? (
          <>
            <div className="flex justify-center gap-3 mb-6">
              {code.split("").map((char, i) => (
                <div
                  key={i}
                  className="w-16 h-20 bg-surface rounded-xl flex items-center justify-center text-3xl font-mono font-bold text-foreground border-2 border-elevated"
                >
                  {char}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-text-tertiary mb-8">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-text-secondary">
              <Wifi className="w-5 h-5 animate-pulse text-primary" />
              <span>Waiting for host to pair...</span>
            </div>
          </>
        ) : (
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
        )}

        <div className="mt-12 text-sm text-text-tertiary space-y-1">
          <p>1. Open nhimbe on your phone</p>
          <p>2. Go to your event → Manage → Kiosk</p>
          <p>3. Enter the 6-digit code above</p>
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-text-tertiary">
        Powered by <span className="text-secondary font-semibold">nhimbe</span> &middot; A Mukoko Product
      </footer>
    </div>
  );
}

// ─── QR Scanner Component ───────────────────────────────────────────────────
function QRScanner({
  onScan,
  enabled,
}: {
  onScan: (data: string) => void;
  enabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !containerRef.current) return;

        const scannerId = "qr-scanner-" + Date.now();
        const div = document.createElement("div");
        div.id = scannerId;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(div);

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            aspectRatio: 1,
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {
            // QR code not found in frame — this is normal
          }
        );
      } catch (err) {
        if (mounted) {
          setCameraError(
            err instanceof Error
              ? err.message.includes("Permission")
                ? "Camera access denied. Please allow camera permissions."
                : "Could not start camera. Make sure no other app is using it."
              : "Camera error"
          );
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [enabled, onScan]);

  if (cameraError) {
    return (
      <div className="w-full max-w-sm mx-auto bg-surface rounded-2xl p-8 text-center">
        <Camera className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
        <p className="text-text-secondary mb-4">{cameraError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden bg-black aspect-square [&_video]:rounded-2xl"
      />
    </div>
  );
}

// ─── Checkin Screen (QR-based) ──────────────────────────────────────────────
function CheckinScreen({ session, token }: { session: KioskSession; token: string }) {
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);

  // Load stats
  useEffect(() => {
    getCheckinStats(session.eventId).then(setStats).catch(() => {});
  }, [session.eventId]);

  // Auto-refresh stats every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      getCheckinStats(session.eventId).then(setStats).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [session.eventId]);

  // Clear result after 4 seconds and re-enable scanner
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      setResult(null);
      setScanning(true);
      cooldownRef.current = false;
    }, 4000);
    return () => clearTimeout(timer);
  }, [result]);

  const handleScan = useCallback(
    async (data: string) => {
      // Prevent duplicate scans during cooldown
      if (cooldownRef.current || processing) return;

      // Extract registration ID from QR data
      // QR code might be a URL like "nhimbe.com/checkin/REG_ID" or just the registration ID
      let registrationId = data;
      try {
        const url = new URL(data);
        const pathParts = url.pathname.split("/").filter(Boolean);
        // Look for /checkin/:id or /c/:id pattern
        const checkinIdx = pathParts.findIndex((p) => p === "checkin" || p === "c");
        if (checkinIdx >= 0 && pathParts[checkinIdx + 1]) {
          registrationId = pathParts[checkinIdx + 1];
        } else {
          // Last path segment as fallback
          registrationId = pathParts[pathParts.length - 1] || data;
        }
      } catch {
        // Not a URL — use raw data as registration ID
      }

      // Skip if same code scanned consecutively
      if (registrationId === lastScannedRef.current) return;
      lastScannedRef.current = registrationId;
      cooldownRef.current = true;
      setProcessing(true);
      setScanning(false);

      try {
        await checkinRegistration(session.eventId, registrationId);
        setResult({
          status: "success",
          name: "Guest",
          message: "Welcome! You're checked in.",
        });
        // Refresh stats
        getCheckinStats(session.eventId).then(setStats).catch(() => {});
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes("Already")
            ? "Already checked in"
            : err instanceof Error && err.message.includes("not found")
              ? "Registration not found"
              : "Check-in failed. Try again.";
        setResult({
          status: message.includes("Already") ? "already" : "error",
          name: "Guest",
          message,
        });
      } finally {
        setProcessing(false);
      }
    },
    [session.eventId, processing]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-elevated px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{session.eventName}</h1>
          <p className="text-sm text-text-secondary">Self Check-In Kiosk</p>
        </div>
        {stats && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-tertiary" />
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">{stats.attended}</span>
            </div>
            <Progress value={stats.rate} className="w-24 h-2" />
            <Badge variant={stats.rate > 75 ? "success" : stats.rate > 25 ? "warning" : "secondary"}>
              {stats.rate}%
            </Badge>
          </div>
        )}
      </header>

      {/* Full-screen result overlay */}
      {result && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center ${
            result.status === "success"
              ? "bg-green-500/95"
              : result.status === "already"
                ? "bg-yellow-500/95"
                : "bg-red-500/95"
          }`}
        >
          <div className="text-center text-white">
            {result.status === "success" ? (
              <CheckCircle2 className="w-24 h-24 mx-auto mb-6" />
            ) : result.status === "already" ? (
              <Clock className="w-24 h-24 mx-auto mb-6" />
            ) : (
              <XCircle className="w-24 h-24 mx-auto mb-6" />
            )}
            <h2 className="text-4xl font-bold mb-2">{result.name}</h2>
            <p className="text-2xl opacity-90">{result.message}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md text-center">
          <QrCode className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-3xl font-bold mb-2">Scan QR Code</h2>
          <p className="text-text-secondary mb-8">
            Show your registration QR code to check in
          </p>

          {processing ? (
            <div className="w-full max-w-sm mx-auto bg-surface rounded-2xl p-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-text-secondary">Checking in...</p>
            </div>
          ) : (
            <QRScanner onScan={handleScan} enabled={scanning} />
          )}

          <p className="text-sm text-text-tertiary mt-6">
            Point your QR code at the camera above
          </p>
        </div>
      </main>

      <footer className="border-t border-elevated px-6 py-3 text-center">
        <p className="text-xs text-text-tertiary">
          Powered by <span className="text-secondary font-semibold">nhimbe</span> &middot; A Mukoko Product
        </p>
      </footer>
    </div>
  );
}

// ─── Main Kiosk Page ────────────────────────────────────────────────────────
export default function KioskPage() {
  const [session, setSession] = useState<KioskSession | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Check for existing kiosk session on mount
  useEffect(() => {
    async function checkExisting() {
      const token = localStorage.getItem("nhimbe_kiosk_token");
      if (token) {
        try {
          const { session: existing } = await getKioskSession(token);
          setSession(existing);
          setSessionToken(token);
        } catch {
          localStorage.removeItem("nhimbe_kiosk_token");
        }
      }
      setChecking(false);
    }
    checkExisting();
  }, []);

  const handlePaired = useCallback((newSession: KioskSession, token: string) => {
    setSession(newSession);
    setSessionToken(token);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!session || !sessionToken) {
    return <PairingScreen onPaired={handlePaired} />;
  }

  return <CheckinScreen session={session} token={sessionToken} />;
}
