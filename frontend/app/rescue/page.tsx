import type { Metadata } from "next";
import { RescueView } from "@/components/rescue/rescue-view";

export const metadata: Metadata = { title: "Rescue Mode" };

export default function RescuePage() {
  return <RescueView />;
}
