"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CustomerSearch({
  defaultValue,
  filter,
}: {
  defaultValue: string;
  filter: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({ filter });
        if (value.trim()) params.set("q", value.trim());
        router.push(`/dashboard/customers?${params.toString()}`);
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Rechercher un prénom ou un téléphone"
        aria-label="Rechercher un client"
      />
      <Button type="submit" variant="outline">
        Chercher
      </Button>
    </form>
  );
}
