"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

/** État d'autorisation du navigateur, lu sans effet de bord. */
function usePermission(): NotificationPermission | "unsupported" {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      if (typeof window === "undefined") return "unsupported";
      const supported =
        "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
      return supported ? Notification.permission : "unsupported";
    },
    () => "unsupported" as const,
  );
}

function useIsStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(display-mode: standalone)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari iOS n'expose pas display-mode avant l'installation.
      ("standalone" in window.navigator && Boolean(window.navigator.standalone)),
    () => false,
  );
}

function useIsIos(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    () => false,
  );
}

/** La clé VAPID voyage en base64url ; l'API la veut en octets. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export function PushOptIn({ token, businessName }: { token: string; businessName: string }) {
  const permission = usePermission();
  const isStandalone = useIsStandalone();
  const isIos = useIsIos();
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return null;

  // Ce test passe avant celui du support, et c'est volontaire : Safari ne
  // connaît le push qu'une fois la carte installée. En concluant d'abord
  // « non supporté », on masquerait justement l'explication qui dit quoi faire.
  if (isIos && !isStandalone) {
    return (
      <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">
        Pour être prévenu dès qu&apos;une récompense vous attend, ajoutez d&apos;abord cette carte à
        votre écran d&apos;accueil.
      </p>
    );
  }

  if (permission === "unsupported") return null;

  if (permission === "denied") {
    return (
      <p className="mt-6 flex items-start gap-2.5 rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Les notifications sont bloquées pour ce site. Vous pouvez les réautoriser dans les
          réglages de votre navigateur.
        </span>
      </p>
    );
  }

  if (state === "done" || (permission === "granted" && state === "idle")) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success">
        <Check className="h-4 w-4" aria-hidden />
        Notifications activées
      </p>
    );
  }

  async function enable() {
    setState("working");
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const granted = await Notification.requestPermission();
      if (granted !== "granted") {
        setState("idle");
        setMessage("Vous avez refusé les notifications.");
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!),
        }));

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      if (!response.ok) throw new Error("subscribe failed");
      setState("done");
    } catch {
      setState("error");
      setMessage("Activation impossible. Réessayez plus tard.");
    }
  }

  return (
    <div className="mt-6">
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={enable}
        disabled={state === "working"}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {state === "working" ? "Activation…" : "Me prévenir sur ce téléphone"}
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
        {message ?? `Une notification quand une récompense vous attend chez ${businessName}.`}
      </p>
    </div>
  );
}
