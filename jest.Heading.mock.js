import React from 'react';

const MockHeading = ({ as, children }) =>
  React.createElement(as, null, children);
MockHeading.displayName = 'MockHeading';
module.exports = MockHeading;
