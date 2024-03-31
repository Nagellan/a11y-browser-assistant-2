import React from 'react';
import { createRoot } from 'react-dom/client';

import { watchForRPCRequests } from '../../helpers/pageRPC';

import App from '../../common/App';

// Create a new div element
const container = document.createElement('div');

container.id = 'ally-container';

// Append the div to the body
document.body.appendChild(container);

watchForRPCRequests();

const root = createRoot(container);

root.render(<App />);

if (module.hot) module.hot.accept();
