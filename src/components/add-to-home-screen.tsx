"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noopSubscribe = () => () => {};

function useIsStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(display-mode: standalone)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(display-mode: standalone)").matches,
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

/**
 * Bouton « Ajouter à l'écran d'accueil ».
 * Utilise l'API d'installation PWA quand elle existe (Android / Chrome),
 * sinon affiche l'instruction iOS.
 */
export function AddToHomeScreen() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useIsStandalone();
  const isIos = useIsIos();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (isStandalone) return null;

  if (promptEvent) {
    return (
      <Button
        variant="outline"
        size="lg"
        className="mt-6 w-full"
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
      >
        Ajouter à l&apos;écran d&apos;accueil
      </Button>
    );
  }

  if (isIos) {
    return (
      <p className="mt-6 rounded-xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
        Pour garder votre carte à portée de main : bouton Partager puis « Sur l&apos;écran
        d&apos;accueil ».
      </p>
    );
  }

  return null;
}
