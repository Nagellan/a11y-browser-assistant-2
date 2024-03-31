import { Box, ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { useAppState } from '../state/store';
import SetAPIKey from './SetAPIKey';
import TaskUI from './TaskUI';

const App = () => {
  const openAIKey = useAppState((state) => state.settings.openAIKey);

  return (
    <ChakraProvider>
      <Box p="8" fontSize="lg" w="full">
        {openAIKey ? <TaskUI /> : <SetAPIKey />}
      </Box>
    </ChakraProvider>
  );
};

export default App;
