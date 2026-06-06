"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DonateModal } from "@/components/DonateModal";
import { DonateThankYouModal } from "@/components/DonateThankYouModal";

interface DonationContextValue {
  openDonateModal: () => void;
  closeDonateModal: () => void;
  donateModalOpen: boolean;
}

const DonationContext = createContext<DonationContextValue | null>(null);

function DonationReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [thankYouOpen, setThankYouOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("donated") !== "1") return;

    setThankYouOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("donated");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, router, pathname]);

  return (
    <DonateThankYouModal
      open={thankYouOpen}
      onClose={() => setThankYouOpen(false)}
    />
  );
}

export function DonationProvider({ children }: { children: ReactNode }) {
  const [donateModalOpen, setDonateModalOpen] = useState(false);

  const openDonateModal = useCallback(() => setDonateModalOpen(true), []);
  const closeDonateModal = useCallback(() => setDonateModalOpen(false), []);

  return (
    <DonationContext.Provider
      value={{ openDonateModal, closeDonateModal, donateModalOpen }}
    >
      {children}
      <DonateModal />
      <Suspense fallback={null}>
        <DonationReturnHandler />
      </Suspense>
    </DonationContext.Provider>
  );
}

export function useDonation(): DonationContextValue {
  const ctx = useContext(DonationContext);
  if (!ctx) throw new Error("useDonation must be used within DonationProvider");
  return ctx;
}
