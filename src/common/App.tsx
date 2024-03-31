import {
  ChakraProvider,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../state/store';
import SetAPIKey from './SetAPIKey';
import TaskUI from './TaskUI';

const App = () => {
  const openAIKey = useAppState((state) => state.settings.openAIKey);

  const [isOpen, setIsOpen] = useState(false);

  const toggleIsOpen = useCallback(() => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      switch (message.request) {
        case 'open-ally':
          console.log('content open-ally');
          toggleIsOpen();
          break;
        case 'close-ally':
          console.log('content close-ally');
          close();
          break;

        default:
          break;
      }
    });
  }, [toggleIsOpen, close]);

  return (
    <ChakraProvider resetScope="#ally-content">
      <Modal isOpen={isOpen} onClose={close} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalBody>{openAIKey ? <TaskUI /> : <SetAPIKey />}</ModalBody>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
};

export default App;
