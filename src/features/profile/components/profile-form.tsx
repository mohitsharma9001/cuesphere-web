"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileCompletionCard } from "@/features/profile/components/profile-completion-card";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { REQUIRED_PROFILE_FIELDS, type PlayerProfile } from "@/types/player-profile";
import { updateProfileAction } from "@/app/actions/profile-actions";

const schema = z.object({
  profilePhotoUrl: z.string(), // optional
  fullName: z.string().min(2, "Enter your full name."),
  mobile: z.string().min(8, "Enter a valid mobile number."),
  dob: z.string().min(1, "Date of birth is required."),
  city: z.string().min(1, "City is required."),
  emergencyContact: z.string().min(8, "Enter a valid emergency contact number."),
  preferredCue: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({
  profile,
  redirectTo,
}: {
  profile: PlayerProfile;
  redirectTo: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      profilePhotoUrl: profile.profilePhotoUrl,
      fullName: profile.fullName,
      mobile: profile.mobile,
      dob: profile.dob,
      city: profile.city,
      emergencyContact: profile.emergencyContact,
      preferredCue: profile.preferredCue,
    },
  });

  const values = watch();
  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => {
    if (field === "email") return !profile.email;
    if (field === "id" || field === "userId" || field === "createdAt") return false;
    return !values[field as keyof FormValues]?.toString().trim();
  });
  const percent = Math.round(
    ((REQUIRED_PROFILE_FIELDS.length - missing.length) / REQUIRED_PROFILE_FIELDS.length) * 100
  );

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    const result = await updateProfileAction(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Profile updated!");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <Controller
          control={control}
          name="profilePhotoUrl"
          render={({ field }) => (
            <AvatarUpload value={field.value} onChange={field.onChange} name={values.fullName || "Player"} />
          )}
        />
        {errors.profilePhotoUrl ? (
          <p className="text-xs text-destructive">{errors.profilePhotoUrl.message}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input id="mobile" {...register("mobile")} />
            {errors.mobile ? <p className="text-xs text-destructive">{errors.mobile.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" {...register("dob")} />
            {errors.dob ? <p className="text-xs text-destructive">{errors.dob.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
            {errors.city ? <p className="text-xs text-destructive">{errors.city.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input id="emergencyContact" {...register("emergencyContact")} />
            {errors.emergencyContact ? (
              <p className="text-xs text-destructive">{errors.emergencyContact.message}</p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preferredCue">Preferred Cue (Optional)</Label>
            <Input id="preferredCue" {...register("preferredCue")} />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save &amp; Continue
        </Button>
      </form>

      <ProfileCompletionCard percent={percent} missing={missing} className="h-fit" />
    </div>
  );
}
