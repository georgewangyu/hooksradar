import { HooksRadarApp } from "./hooks-radar-app";
import { hooks } from "@/lib/hooks";

export default function Home() {
  return <HooksRadarApp hooks={hooks} />;
}
