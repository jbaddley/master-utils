import PublicMeetPage from "@/features/swim/PublicMeetPage";

type Params = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <PublicMeetPage slug={slug} />;
}
