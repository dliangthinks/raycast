import { useState, useEffect } from "react";
import { getPreferenceValues, showToast, Toast, getSelectedText } from "@raycast/api";
import { useCommandHistory } from "./useCommandHistory";
import LLMManager, { ProviderType } from "./llmManager";
import { LLMError } from "./types";

export interface UseLLMOptions {
  context?: string;
  allowPaste?: boolean;
  useSelected?: boolean;
  buffer?: Buffer[];
}

export default function useLLM(props: any, options: UseLLMOptions = {}) {
  const { context = undefined, allowPaste = false, useSelected = false, buffer = [] } = options;
  
  const Pages = {
    Form: 0,
    Detail: 1,
  };

  let { query: argQuery } = props.arguments;
  if (!argQuery) argQuery = props.fallbackText ?? "";

  const prefs = getPreferenceValues();
  const provider = prefs.provider as ProviderType;
  const llmManager = LLMManager.getInstance();

  const [page, setPage] = useState(Pages.Detail);
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelected] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [textarea, setTextarea] = useState("");
  const { addToHistory } = useCommandHistory();

  const getResponse = async (query: string, data?: Buffer[]) => {
    setLastQuery(query);
    setPage(Pages.Detail);

    console.log(`[LLM Debug] Request to ${provider}:`, {
      model: prefs[`${provider}Model`] || llmManager.getDefaultModel(provider),
      input: query
    });

    await showToast({
      style: Toast.Style.Animated,
      title: `Waiting for ${provider}...`,
    });

    const start = Date.now();
    try {
      const llmProvider = llmManager.getProvider(provider);
      let streamContent = "";
      const response = await llmProvider.ask(query, {
        model: prefs[`${provider}Model`] || llmManager.getDefaultModel(provider),
        stream: (x) => {
          streamContent += x;
          setMarkdown((markdown) => markdown + x);
        },
        data: data ?? buffer,
      });

      const finalContent = response || streamContent;
      console.log(`[LLM Debug] Response from ${provider}:`, {
        timeMs: Date.now() - start,
        outputLength: finalContent.length,
        output: finalContent.slice(0, 100) + (finalContent.length > 100 ? '...' : '') // Show first 100 chars
      });
      
      if (!finalContent) {
        console.error(`[LLM Debug] No content received from provider ${provider}`);
        throw new Error("No content received from provider");
      }

      setMarkdown(finalContent);
      setLastResponse(finalContent);

      // Add to history with model information
      await addToHistory(query, finalContent, prefs[`${provider}Model`]);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      const error = e as LLMError;
      console.error("[LLM Debug] Error details:", {
        provider,
        error: error.message,
        stack: error.stack,
        isRateLimit: error.isRateLimit,
        errorType: error.errorType,
        details: error.details
      });
      
      // Handle rate limit errors
      if (error.isRateLimit) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rate limit reached",
          message: "Please slow down.",
        });
        setMarkdown(`## Could not access ${provider}.\n\nYou have been rate limited. Please slow down and try again later.`);
      } 
      // Handle empty response
      else if (!error.message || error.message === "No content received from provider") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Empty Response",
          message: `${provider} returned no content`,
        });
        setMarkdown(
          `## Empty Response from ${provider}\n\nThe provider did not return any content. This could be due to:\n\n1. The model not generating a response\n2. A streaming error\n3. An issue with the model's configuration\n\nTry:\n1. Using a different model\n2. Simplifying your prompt\n3. Checking the provider's status page\n\n**Provider:** ${provider}\n**Model:** ${prefs[`${provider}Model`] || llmManager.getDefaultModel(provider)}`
        );
      }
      // Handle API key issues
      else if (error.message.includes("key") || error.message.includes("auth") || error.message.includes("token")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Error",
          message: "Check your API key in preferences",
        });
        setMarkdown(
          `## API Key Error for ${provider}.\n\nThere seems to be an issue with your API key. Please verify that:\n\n1. You have entered a valid API key in Raycast preferences\n2. The API key has sufficient permissions\n3. The API key is active and not expired\n\n**Error details:** ${error.message}`
        );
      }
      // Handle content policy violations
      else if (error.message.includes("content") || error.message.includes("policy") || error.message.includes("safety") || error.message.includes("moderation")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Content Policy Violation",
          message: "Your prompt was flagged by provider",
        });
        setMarkdown(
          `## Content Policy Violation - ${provider}\n\nYour prompt was flagged by ${provider}'s content filters. Please modify your prompt to comply with their content policies.\n\n**Error details:** ${error.message}`
        );
      }
      // Generic fallback error
      else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Response Failed",
          message: `${(Date.now() - start) / 1000} seconds`,
        });
        setMarkdown(
          `## Could not access ${provider}.\n\nAn error occurred when communicating with the ${provider} API. This could be due to:\n\n1. Network connectivity issues\n2. The provider may be experiencing downtime\n3. Your prompt may have been rejected by the provider's content filters\n4. The model you selected may not be available\n\n**Error details:** ${error.message}`
        );
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      if (useSelected) {
        try {
          let selected = await getSelectedText();
          if (argQuery === "") {
            setSelected(selected);
            setPage(Pages.Form);
          } else {
            getResponse(`${context}\n${argQuery}\n${selected}`);
            return;
          }
          getResponse(`${context}\n${selected}`);
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not get the selected text. Continue without it.",
          });
          getResponse(argQuery);
        }
      } else {
        if (argQuery === "") {
          setPage(Pages.Form);
        } else {
          getResponse(argQuery);
        }
      }
    })();
  }, []);

  return {
    page: page,
    Pages: Pages,
    markdown: markdown,
    isLoading: isLoading,
    selectedState: selectedState,
    lastQuery: lastQuery,
    lastResponse: lastResponse,
    textarea: textarea,
    setTextarea: setTextarea,
    getResponse: getResponse,
  };
} 