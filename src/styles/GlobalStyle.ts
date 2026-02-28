import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: #f9fafb;
    color: #1f2937;
    margin: 0;
  }

  .ant-layout,
  .ant-menu,
  .ant-table,
  .ant-modal,
  .ant-form,
  .ant-btn,
  .ant-card,
  .ant-statistic {
    font-family: 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
  }
`;
