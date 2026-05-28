import { EmbedAttribution } from "@/components/EmbedAttribution";

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.site-header,.site-footer{display:none!important}body{background:transparent}`}</style>
      <div style={{ padding: "1rem" }}>{children}</div>
      <EmbedAttribution />
    </>
  );
}
