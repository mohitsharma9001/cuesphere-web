"use client";

import { Label } from "@/components/ui/label";
import { selectClass } from "@/features/club-admin/components/screens/pair-tv-form";
import type { City, IndianState } from "@/services/location-service";

/** State + city dropdowns for a club. Only launch states are offered. */
export function LocationPicker({
  states,
  cities,
  stateCode,
  cityId,
  onChange,
  error,
}: {
  states: IndianState[];
  cities: City[];
  stateCode: string;
  cityId: string;
  onChange: (next: { stateCode: string; cityId: string }) => void;
  error?: string;
}) {
  const stateCities = cities.filter((c) => c.stateCode === stateCode);

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clubState">State</Label>
          <select
            id="clubState"
            className={selectClass}
            value={stateCode}
            onChange={(e) => onChange({ stateCode: e.target.value, cityId: "" })}
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clubCity">City</Label>
          <select
            id="clubCity"
            className={selectClass}
            value={cityId}
            disabled={!stateCode}
            onChange={(e) => onChange({ stateCode, cityId: e.target.value })}
          >
            <option value="">{stateCode ? "Select city" : "Pick a state first"}</option>
            {stateCities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Your club&apos;s tournaments count towards this state&apos;s and city&apos;s player rankings.
      </p>
    </div>
  );
}
