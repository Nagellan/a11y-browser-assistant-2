import { Textarea, useToast } from '@chakra-ui/react';
import React, { useCallback, useEffect } from 'react';
import { useAppState } from '../state/store';
import { speak } from '../helpers/utils';

const TaskUI = () => {
  const state = useAppState((state) => ({
    taskHistory: state.currentTask.history,
    taskStatus: state.currentTask.status,
    runTask: state.currentTask.actions.runTask,
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
  }));

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runTask();
    }
  };

  useEffect(() => {
    speak('Please enter a command and press Enter');
  }, []);

  return (
    <>
      <Textarea
        autoFocus
        placeholder="Write a command and press Enter."
        value={state.instructions || ''}
        disabled={taskInProgress}
        onChange={(e) => state.setInstructions(e.target.value)}
        mb={2}
        onKeyDown={onKeyDown}
      />
    </>
  );
};

export default TaskUI;
