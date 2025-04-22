# Bring Your Own LLM to Raycast

AI extension for Raycast that leverages multiple LLM providers to help you improve your writing.
An example command - Polish - is provided. You can add as many commands as you need.

## Features

- 🔄 Multiple LLM Support, currently listing:
  - Google Gemini
  - OpenAI GPT
  - DeepSeek
- 🌊 Real-time streaming responses
- 🎯 Dynamic model selection
- 🔒 Secure API key management
- ⚡️ Fast and efficient text processing


## Setup

This extension is currently not submitted to raycast store. In order to use it, you have to compile locally. But once compiled and loaded into raycast it will stay there.


```bash
# Install dependencies
npm install

npm run dev

npm run build
```

### API Keys

You'll need to obtain API keys for the providers you want to use:

#### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to Raycast preferences under "Gemini API Key"

#### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to Raycast preferences under "OpenAI API Key"

#### DeepSeek
1. Visit DeepSeek's platform
2. Generate an API key
3. Add it to Raycast preferences under "DeepSeek API Key"

### Configuration

The extension can be configured through Raycast preferences:

1. **Default Provider**: Choose your preferred LLM provider
2. **Model Selection**: Optionally specify a model for each provider
3. **System Prompt**: Customize how the LLM should polish your text

## Usage

1. Select text you want to polish
2. Trigger Raycast with your preferred shortcut
3. Choose "Polish Text"
4. Wait for the improved version
5. Copy or paste the result

### Provider Selection

Add new providers in package.json.
You can switch between providers:
- Through global preferences
- Per command through command preferences

### Model Selection

Each provider supports different models:
- For Gemini, currently listing 2.0 flash and 2.5 pro
- For OpenAI, currently listing 4o-mini and 4o
- For Deepseek, currently listing v3 chat
- 

This project was adapted from Evanzhou's Google Gemini Extension.