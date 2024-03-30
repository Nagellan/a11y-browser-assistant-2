// console.log('Content script loaded..');

import React from 'react';
import { createRoot } from 'react-dom/client';

import { watchForRPCRequests } from '../../helpers/pageRPC';
import Popup from './Popup';

document.addEventListener('DOMContentLoaded', function () {
  // Define the URL to fetch
  const url = chrome.runtime.getURL('/content.html');

  // Make a GET request using fetch
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Request failed!');
      }
      return response.text();
    })
    .then((data) => {
      // Create a new div element
      const div = document.createElement('div');

      // Set the response data as the innerHTML of the div
      div.innerHTML = data;

      // Append the div to the body
      document.body.appendChild(div);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});

watchForRPCRequests();

const container = window.document.querySelector('#app-container');
const root = createRoot(container);

root.render(<Popup />);

if (module.hot) module.hot.accept();
