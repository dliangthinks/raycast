# Multi-LLM Polish for Raycast

A powerful text polishing extension for Raycast that leverages multiple LLM providers to help you improve your writing.

## Features

- 🔄 Multiple LLM Support
  - Google Gemini
  - OpenAI GPT
  - DeepSeek
- 🌊 Real-time streaming responses
- 🎯 Dynamic model selection
- 🔒 Secure API key management
- ⚡️ Fast and efficient text processing

## Installation

1. Install the extension from Raycast Store
2. Configure your preferred LLM provider(s)
3. Start polishing your text!

## Setup

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

You can switch between providers:
- Through global preferences
- Per command through command preferences

### Model Selection

Each provider supports different models:
- Leave the model field empty to use provider's default
- Enter a specific model name for custom selection
- Models are fetched automatically when available

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your API key is correctly entered
   - Check if the API key has sufficient permissions
   - Verify the API key is active

2. **Provider Not Responding**
   - Check your internet connection
   - Verify the provider's service status
   - Try switching to a different provider

3. **Model Not Available**
   - Clear the model field to use default
   - Check if the model name is correct
   - Try a different model

### Rate Limits

Each provider has different rate limits:
- Gemini: Varies by API key type
- OpenAI: Depends on your subscription
- DeepSeek: Check their documentation

If you hit rate limits:
- Wait a few minutes before retrying
- Switch to a different provider
- Consider upgrading your API quota

## Development

```bash
# Install dependencies
npm install

# Start development
ray develop

# Build
ray build

# Lint
ray lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details