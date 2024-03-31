import { CreateCompletionResponseUsage } from 'openai';
import { callDOMAction } from '../helpers/domActions';
import {
  ParsedResponse,
  ParsedResponseSuccess,
  parseResponse,
} from '../helpers/parseResponse';
import { determineNextAction } from '../helpers/determineNextAction';
import templatize from '../helpers/shrinkHTML/templatize';
import { getSimplifiedDom } from '../helpers/simplifyDom';
import { sleep, speak, truthyFilter } from '../helpers/utils';
import { MyStateCreator } from './store';

export type TaskHistoryEntry = {
  prompt: string;
  response: string;
  action: ParsedResponse;
  usage: CreateCompletionResponseUsage;
};

export type CurrentTaskSlice = {
  tabId: number;
  instructions: string | null;
  history: TaskHistoryEntry[];
  status: 'idle' | 'running' | 'success' | 'error' | 'interrupted';
  actionStatus:
    | 'idle'
    | 'attaching-debugger'
    | 'pulling-dom'
    | 'transforming-dom'
    | 'performing-query'
    | 'performing-action'
    | 'waiting';
  actions: {
    runTask: (onError: (error: string) => void) => Promise<void>;
    interrupt: () => void;
  };
};
export const createCurrentTaskSlice: MyStateCreator<CurrentTaskSlice> = (
  set,
  get
) => ({
  tabId: -1,
  instructions: null,
  history: [],
  status: 'idle',
  actionStatus: 'idle',
  actions: {
    runTask: async (onError) => {
      const wasStopped = () => get().currentTask.status !== 'running';
      const setActionStatus = (status: CurrentTaskSlice['actionStatus']) => {
        set((state) => {
          state.currentTask.actionStatus = status;
        });
      };

      const instructions = get().ui.instructions;

      if (!instructions || get().currentTask.status === 'running') return;

      set((state) => {
        state.currentTask.instructions = instructions;
        state.currentTask.history = [];
        state.currentTask.status = 'running';
        state.currentTask.actionStatus = 'attaching-debugger';
      });

      try {
        const activeTab = await chrome.runtime.sendMessage({
          request: 'get-active-tab',
        });

        console.log(activeTab);

        if (!activeTab.id) throw new Error('No active tab found');
        const tabId = activeTab.id;
        set((state) => {
          state.currentTask.tabId = tabId;
        });

        await chrome.runtime.sendMessage({
          request: 'attach-debugger',
          options: { tabId },
        });
        await chrome.runtime.sendMessage({
          request: 'disable-incompatible-extensions',
        });

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (wasStopped()) break;

          setActionStatus('pulling-dom');
          const pageDOM = await getSimplifiedDom(activeTab);
          if (!pageDOM) {
            set((state) => {
              state.currentTask.status = 'error';
            });
            break;
          }
          const html = pageDOM.outerHTML;

          if (wasStopped()) break;
          setActionStatus('transforming-dom');
          const currentDom = templatize(html);

          const previousActions = get()
            .currentTask.history.map((entry) => entry.action)
            .filter(truthyFilter);

          setActionStatus('performing-query');

          const query = await determineNextAction(
            instructions,
            previousActions.filter(
              (pa) => !('error' in pa)
            ) as ParsedResponseSuccess[],
            currentDom,
            3,
            onError
          );

          if (!query) {
            set((state) => {
              state.currentTask.status = 'error';
            });
            break;
          }

          if (wasStopped()) break;

          setActionStatus('performing-action');
          const action = parseResponse(query.response);

          set((state) => {
            state.currentTask.history.push({
              prompt: query.prompt,
              response: query.response,
              action,
              usage: query.usage,
            });
          });
          if ('error' in action) {
            onError(action.error);
            break;
          }
          if (
            action === null ||
            action.parsedAction.name === 'finish' ||
            action.parsedAction.name === 'fail'
          ) {
            await sleep(1500);
            break;
          }

          speak(action.userHint);
          if (action.parsedAction.name === 'answer') {
            set((state) => {
              state.currentTask.status = 'success';
            });
            break;
          }
          if (action.parsedAction.name === 'click') {
            await callDOMAction('click', {
              ...action.parsedAction.args,
              tab: activeTab,
            });
          } else if (action.parsedAction.name === 'setValue') {
            await callDOMAction(action?.parsedAction.name, {
              ...action?.parsedAction.args,
              tab: activeTab,
            });
          }

          if (wasStopped()) break;

          // While testing let's automatically stop after 50 actions to avoid
          // infinite loops
          if (get().currentTask.history.length >= 50) {
            break;
          }

          setActionStatus('waiting');
          // sleep 2 seconds. This is pretty arbitrary; we should figure out a better way to determine when the page has settled.
          await sleep(2000);
        }
        set((state) => {
          state.currentTask.status = 'success';
        });
      } catch (e: any) {
        console.error(e);
        onError(e.message);
        set((state) => {
          state.currentTask.status = 'error';
        });
      } finally {
        await chrome.runtime.sendMessage({
          request: 'detach-debugger',
          options: { tabId: get().currentTask.tabId },
        });
        await chrome.runtime.sendMessage({
          request: 'reenable-extensions',
        });
      }
    },
    interrupt: () => {
      set((state) => {
        state.currentTask.status = 'interrupted';
      });
    },
  },
});
