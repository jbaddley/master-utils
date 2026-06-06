import InviteAcceptPage from "@/features/swim/InviteAcceptPage";

type Params = { params: Promise<{ token: string }> };

export default async function Page({ params }: Params) {
  const { token } = await params;
  return <InviteAcceptPage token={token} />;
}
