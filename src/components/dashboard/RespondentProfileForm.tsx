"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateRespondentProfile } from "@/app/dashboard/settings/actions";
import ChipSelect from "@/components/ui/ChipSelect";
import {
  INTEREST_OPTIONS,
  EXPERTISE_OPTIONS,
  AGE_RANGE_OPTIONS,
} from "@/lib/constants";

type Props = {
  interests: string[];
  expertise: string[];
  ageRange: string | null;
  location: string;
  occupation: string;
};

export default function RespondentProfileForm({
  interests: initialInterests,
  expertise: initialExpertise,
  ageRange: initialAgeRange,
  location: initialLocation,
  occupation: initialOccupation,
}: Props) {
  const [interests, setInterests] = useState(initialInterests);
  const [expertise, setExpertise] = useState(initialExpertise);
  const [ageRange, setAgeRange] = useState(initialAgeRange || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isComplete = interests.length > 0 && expertise.length > 0;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px] mb-[24px]">
      <div className="flex items-center justify-between mb-[8px]">
        <h2 className="text-[16px] font-semibold text-[#111111]">
          Matching Profile
        </h2>
        {isComplete && (
          <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#22c55e]/10 text-[#22c55e]">
            Complete
          </span>
        )}
      </div>
      <p className="text-[13px] text-[#64748B] mb-[28px]">
        Help us match you with ideas you&apos;re qualified to answer. Better
        matches mean higher-quality feedback for founders — and more earnings for
        you.
      </p>

      <form
        ref={formRef}
        action={async (formData: FormData) => {
          setSaving(true);
          setSaved(false);
          try {
            await updateRespondentProfile(formData);
            setSaved(true);
            if (searchParams.get("complete-profile") === "true") {
              setTimeout(() => router.push("/dashboard/the-wall"), 1000);
            }
          } finally {
            setSaving(false);
          }
        }}
        className="flex flex-col gap-[24px]"
      >
        <ChipSelect
          label="Your interests (select all that apply)"
          name="interests"
          options={INTEREST_OPTIONS}
          selected={interests}
          onChange={setInterests}
        />

        <ChipSelect
          label="Your expertise (select all that apply)"
          name="expertise"
          options={EXPERTISE_OPTIONS}
          selected={expertise}
          onChange={setExpertise}
        />

        <div className="flex flex-col gap-[6px] max-w-[240px]">
          <label htmlFor="ageRange" className="text-[13px] font-medium text-[#64748B]">
            Age range
          </label>
          <select
            id="ageRange"
            name="ageRange"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="text-[14px] px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[#111111] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-[32px]"
          >
            <option value="">Select...</option>
            {AGE_RANGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-[16px] max-w-[500px] max-md:grid-cols-1">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="location" className="text-[13px] font-medium text-[#64748B]">
              Location (city or country)
            </label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={initialLocation}
              placeholder="e.g. New York, USA"
              className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="occupation" className="text-[13px] font-medium text-[#64748B]">
              Occupation
            </label>
            <input
              id="occupation"
              name="occupation"
              type="text"
              defaultValue={initialOccupation}
              placeholder="e.g. Software Engineer"
              className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] placeholder:text-[#94A3B8]"
            />
          </div>
        </div>

        <div className="flex items-center gap-[12px] mt-[4px]">
          <button
            type="submit"
            disabled={saving}
            className="self-start inline-flex items-center justify-center px-[24px] py-[12px] rounded-xl text-[14px] font-medium bg-[#111111] text-white hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Matching Profile"}
          </button>
          {saved && (
            <span className="text-[13px] text-[#22c55e] font-medium animate-in fade-in">
              Profile updated
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
