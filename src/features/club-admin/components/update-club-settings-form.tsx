"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClubSettingsAction } from "@/app/actions/club-settings-actions";
import type { Club } from "@/types/club";
import { LocationPicker } from "@/features/locations/components/location-picker";
import type { City, IndianState } from "@/services/location-service";

const schema = z.object({
  name: z.string().min(2, "Enter a club name."),
  tagline: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  aboutText: z.string().optional(),
  rulesText: z.string().optional(),
  membershipText: z.string().optional(),
  privacyPolicyText: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function UpdateClubSettingsForm({
  clubSlug,
  club,
  states,
  cities,
}: {
  clubSlug: string;
  club: Club;
  states: IndianState[];
  cities: City[];
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [location, setLocation] = React.useState({ stateCode: club.stateCode ?? "", cityId: club.cityId ?? "" });
  const [locationError, setLocationError] = React.useState<string>();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: club.name,
      tagline: club.tagline,
      description: club.description,
      address: club.address,
      phone: club.phone,
      email: club.email,
      googleMapsUrl: club.googleMapsUrl,
      facebook: club.socialLinks.facebook ?? "",
      twitter: club.socialLinks.twitter ?? "",
      instagram: club.socialLinks.instagram ?? "",
      youtube: club.socialLinks.youtube ?? "",
      aboutText: club.aboutText,
      rulesText: club.rulesText,
      membershipText: club.membershipText,
      privacyPolicyText: club.privacyPolicyText,
    },
  });

  async function onSubmit(values: FormValues) {
    if (!location.stateCode || !location.cityId) {
      setLocationError("Choose your club's state and city.");
      return;
    }
    setIsSubmitting(true);
    const result = await updateClubSettingsAction(clubSlug, {
      name: values.name,
      tagline: values.tagline,
      description: values.description,
      address: values.address,
      phone: values.phone,
      email: values.email,
      googleMapsUrl: values.googleMapsUrl,
      stateCode: location.stateCode,
      cityId: location.cityId,
      socialLinks: {
        facebook: values.facebook ?? "",
        twitter: values.twitter ?? "",
        instagram: values.instagram ?? "",
        youtube: values.youtube ?? "",
      },
      aboutText: values.aboutText,
      rulesText: values.rulesText,
      membershipText: values.membershipText,
      privacyPolicyText: values.privacyPolicyText,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Club Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" placeholder="Enjoy Playing" {...register("tagline")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">About / Description</Label>
          <Textarea
            id="description"
            rows={3}
            placeholder="A short description of your club shown in the footer."
            {...register("description")}
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
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
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="12C Snooker Street, Your City - 400001" {...register("address")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="info@yourclub.com" {...register("email")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
          <Input id="googleMapsUrl" placeholder="https://maps.google.com/..." {...register("googleMapsUrl")} />
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-foreground">Social Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" placeholder="https://facebook.com/yourclub" {...register("facebook")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter / X</Label>
            <Input id="twitter" placeholder="https://x.com/yourclub" {...register("twitter")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" placeholder="https://instagram.com/yourclub" {...register("instagram")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" placeholder="https://youtube.com/@yourclub" {...register("youtube")} />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Information Pages</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on your club's About, Rules, Membership and Privacy Policy pages (linked from the footer).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aboutText">About Us</Label>
          <Textarea id="aboutText" rows={4} placeholder="Tell visitors about your club..." {...register("aboutText")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rulesText">Rules</Label>
          <Textarea id="rulesText" rows={4} placeholder="House rules, dress code, conduct..." {...register("rulesText")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="membershipText">Membership</Label>
          <Textarea id="membershipText" rows={4} placeholder="Membership tiers, fees, how to join..." {...register("membershipText")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="privacyPolicyText">Privacy Policy</Label>
          <Textarea id="privacyPolicyText" rows={4} placeholder="How you handle members' data..." {...register("privacyPolicyText")} />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save Changes
      </Button>
    </form>
  );
}
