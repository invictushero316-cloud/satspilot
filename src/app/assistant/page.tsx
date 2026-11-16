import { AssistantView } from "@/components/screens/assistant-view";
import {
  demoAssistantMessages,
  demoAssistantSuggestions,
} from "@/data/demo-data";
import { createAiProvider } from "@/server/ai/provider";
import { requireMerchantPageContext } from "@/server/merchant-context";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );

  const provider = createAiProvider();

  return (
    <AssistantView
      merchants={merchants}
      activeMerchantId={merchant.id}
      suggestions={demoAssistantSuggestions}
      initialMessages={demoAssistantMessages}
      aiConfigured={provider.isConfigured()}
    />
  );
}
