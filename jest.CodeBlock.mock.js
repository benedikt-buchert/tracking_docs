import React from 'react';
module.exports = function CodeBlock({children, ...props}) {
  return <pre {...props}>{children}</pre>;
};
