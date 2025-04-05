import { Detail, Form, ActionPanel, Action } from "@raycast/api";
import useLLM from "./api/useLLM";
import { getPreferenceValues } from "@raycast/api";

export default function Polish(props) {
  const { prompt } = getPreferenceValues();
  const {
    page,
    Pages,
    markdown,
    isLoading,
    selectedState,
    lastQuery,
    lastResponse,
    textarea,
    setTextarea,
    getResponse
  } = useLLM(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });

  return page === Pages.Detail ? (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.Paste content={markdown} />
            <Action.CopyToClipboard content={markdown} />
          </ActionPanel>
        )
      }
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              getResponse(values.query);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Query"
        placeholder="Enter your query"
        value={textarea}
        onChange={setTextarea}
      />
    </Form>
  );
}
