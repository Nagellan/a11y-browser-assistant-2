import { OpenAI } from 'openai';
import { useAppState } from '../state/store';
import { availableActions } from './availableActions';
import { ParsedResponseSuccess } from './parseResponse';

const formattedActions = availableActions
  .map((action, i) => {
    const args = action.args
      .map((arg) => `${arg.name}: ${arg.type}`)
      .join(', ');
    return `${i + 1}. ${action.name}(${args}): ${action.description}`;
  })
  .join('\n');

const systemMessage = `
You are a browser automation assistant for helping blind people.

You can use the following tools:

${formattedActions}

You will be be given a task to perform and the current state of the DOM. You will also be given previous actions that you have taken. You may retry a failed action up to one time.

You must predict a next action in json format.
An example of an action:

{
  "thought": "I should click the add to cart button",
  "action": "click(223)",
  "userHint": "I added the product to the card"
}

You must always include the "thought", "action" and "userHint" parameters or else your response will be marked as invalid.`;

export async function determineNextAction(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  simplifiedDOM: string,
  maxAttempts = 3,
  notifyError?: (error: string) => void
) {
  const model = useAppState.getState().settings.selectedModel;
  const prompt = formatPrompt(taskInstructions, previousActions, simplifiedDOM);
  const apiKey = useAppState.getState().settings.openAIKey;
  if (!apiKey) {
    notifyError?.('No OpenAI key found');
    return null;
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      return {
        usage: completion.usage,
        prompt,
        response: completion.choices[0].message?.content?.trim(),
      };
    } catch (error: any) {
      console.log('determineNextAction error', error);
      if (error.response.data.error.message.includes('server error')) {
        // Problem with the OpenAI API, try again
        if (notifyError) {
          notifyError(error.response.error.message);
        }
      } else {
        // Another error, give up
        throw new Error(error.response.data.error.message);
      }
    }
  }
  throw new Error(
    `Failed to complete query after ${maxAttempts} attempts. Please try again later.`
  );
}

export function formatPrompt(
  taskInstructions: string,
  previousActions: ParsedResponseSuccess[],
  pageContents: string
) {
  let previousActionsString = '';

  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `{"thought": "${action.thought}","action": "${action.action}","userHint":"${action.userHint}"}`
      )
      .join('\n\n');
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }

  return `The user requests the following task:

${taskInstructions}

${previousActionsString}

Current time: ${new Date().toLocaleString()}

Current page contents:
${pageContents}`;
}
