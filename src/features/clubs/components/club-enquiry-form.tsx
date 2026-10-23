"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendClubEnquiryAction } from "@/app/actions/club-enquiry-actions";
import { LocationPicker } from "@/features/locations/components/location-picker";
import type { City, IndianState } from "@/services/location-service";
import type { ClubEnquiry } from "@/types/club-enquiry";

const schema = z.object({
  ownerName: z.string().trim().min(2, "Enter your name."),
  mobile: z
    .string()
    .refine((v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")), "Enter a valid 10-digit mobile number."),
  clubName: z.string().trim().min(2, "Enter the club's name."),
  tables: z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100, "Enter the number of tables (1–100)."),
  message: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

/** Step 1 of creating a club: the player tells CueSphere about it. */
export function ClubEnquiryForm({
  states,
  cities,
  defaults,
  previous,
}: {
  states: IndianState[];
  cities: City[];
  defaults: { ownerName: string; mobile: string };
  /** The rejected request being sent again (prefills the form). */
  previous?: ClubEnquiry | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [location, setLocation] = React.useState({ stateCode: previous?.stateCode ?? "", cityId: previous?.cityId ?? "" });
  const [locationError, setLocationError] = React.useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerName: previous?.ownerName ?? defaults.ownerName,
      mobile: previous?.mobile ?? defaults.mobile,
      clubName: previous?.clubName ?? "",
      tables: previous ? String(previous.tables) : "",
      message: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!location.stateCode || !location.cityId) {
      setLocationError("Choose your club's state and city.");
      return;
    }
    setIsSubmitting(true);
    const result = await sendClubEnquiryAction({ ...values, tables: Number(values.tables), ...location });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Request sent! We'll let you know soon.");
    router.replace("/clubs/new");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ownerName">Your name</Label>
          <Input id="ownerName" placeholder="Ravi Kumar" {...register("ownerName")} />
          {errors.ownerName ? <p className="text-xs text-destructive">{errors.ownerName.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input id="mobile" type="tel" placeholder="98765 43210" {...register("mobile")} />
          {errors.mobile ? <p className="text-xs text-destructive">{errors.mobile.message}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clubName">Club name</Label>
        <Input id="clubName" placeholder="e.g. Metro Snooker Club" {...register("clubName")} />
        {errors.clubName ? <p className="text-xs text-destructive">{errors.clubName.message}</p> : null}
      </div>
      <LocationPicker
        states={states}
        cities={cities}
        stateCode={location.stateCode}
        cityId={location.cityId}
        onChange={(next) => {
          setLocation(next);
          setLocationError(undefined);
        }}
        error={locationError}
      />
      <div className="space-y-2">
        <Label htmlFor="tables">Number of tables</Label>
        <Input id="tables" inputMode="numeric" placeholder="6" {...register("tables")} />
        {errors.tables ? <p className="text-xs text-destructive">{errors.tables.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Anything else? (optional)</Label>
        <Textarea id="message" rows={3} placeholder="Opening date, snooker or pool, anything we should know" {...register("message")} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send request
      </Button>
    </form>
  );
}
