import { Button, Textarea, useToast } from '@chakra-ui/react';
import React, { useCallback, useState } from 'react';
import { useAppState } from '../state/store';
import { speak, cancelSpeech } from '../helpers/utils';

const TaskUI = () => {
  const state = useAppState((state) => ({
    taskHistory: state.currentTask.history,
    taskStatus: state.currentTask.status,
    runTask: state.currentTask.actions.runTask,
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
  }));

  const [command, setCommand] = useState('');

  const taskInProgress = state.taskStatus === 'running';

  const toast = useToast();

  const toastError = useCallback(
    (message: string) => {
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
    [toast]
  );

  const runTask = () => {
    state.instructions && state.runTask(toastError);
  };

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        state.setInstructions(command);
        runTask();
        setCommand('');
      }
    },
    [command, setCommand]
  );

  const summarizePage = () => {
    state.setInstructions(
      'Make a 3 sentence summary of what you see on the page. Dont tell semantic of the website, tell about this particular page. Explain only the main content and ignore headers, footers and others that are not related to content'
    );
    runTask();
  };

  return (
    <>
      <Textarea
        autoFocus
        placeholder="Write a command and press Enter"
        value={command || ''}
        disabled={taskInProgress}
        onChange={(e) => setCommand(e.target.value)}
        mb={2}
        onKeyDown={onKeyDown}
        onFocus={() => {
          speak('Write a command and press Enter');
        }}
        onBlur={() => {
          cancelSpeech();
        }}
      />
      <Button
        onClick={summarizePage}
        colorScheme="green"
        disabled={taskInProgress}
        onFocus={() => {
          speak('Make a brief summary of page contents');
        }}
        onBlur={() => {
          cancelSpeech();
        }}
      >
        Summarize Page
      </Button>
    </>
  );
};

export default TaskUI;
