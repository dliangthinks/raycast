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

    await showToast({
      style: Toast.Style.Animated,
      title: `Waiting for ${provider}...`,
    });

    const start = Date.now();
    try {
      const llmProvider = llmManager.getProvider(provider);
      const response = await llmProvider.ask(query, {
        model: prefs.model,
        stream: (x) => {
          setMarkdown((markdown) => markdown + x);
        },
        data: data ?? buffer,
      });

      setMarkdown(response);
      setLastResponse(response);

      // Add to history with model information
      await addToHistory(query, response, prefs.model);

      await showToast({
        style: Toast.Style.Success,
        title: "Response Finished",
        message: `${(Date.now() - start) / 1000} seconds`,
      });
    } catch (e) {
      const error = e as LLMError;
      if (error.isRateLimit) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rate limit reached",
          message: "Please slow down.",
        });
        setMarkdown(`## Could not access ${provider}.\n\nYou have been rate limited. Please slow down and try again later.`);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Response Failed",
          message: `${(Date.now() - start) / 1000} seconds`,
        });
        setMarkdown(
          `## Could not access ${provider}.\n\nThis may be because the provider has decided that your prompt did not comply with its regulations. Please try another prompt, and if it still does not work, create an issue on GitHub.`
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