"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";

export function AudioView() {
  const [search, setSearch] = useState("");
  return (
    <div className="h-full flex flex-col gap-2 p-4">
      <Input
        placeholder="Search songs and artists"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-col gap-2"></div>
    </div>
  );
}
