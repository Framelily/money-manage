import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
    background-color: #f9fafb;
    color: #1f2937;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .ant-layout,
  .ant-menu,
  .ant-table,
  .ant-modal,
  .ant-form,
  .ant-btn,
  .ant-card,
  .ant-statistic,
  .ant-collapse,
  .ant-select,
  .ant-input,
  .ant-tag {
    font-family: 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Mobile: full-width modals */
  @media (max-width: 640px) {
    .ant-modal {
      max-width: calc(100vw - 32px) !important;
      margin: 16px auto !important;
      top: 16px !important;
    }
    .ant-modal .ant-modal-content {
      padding: 16px !important;
    }
    .ant-modal .ant-modal-header {
      padding: 0 0 12px !important;
    }

    /* Horizontal scroll hint for tables */
    .ant-table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* Ant Design Drawer body scrollable */
    .ant-drawer-body {
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  }

  /* Touch-friendly table rows */
  .ant-table-tbody > tr > td {
    padding: 8px 12px;
  }

  @media (min-width: 768px) {
    .ant-table-tbody > tr > td {
      padding: 12px 16px;
    }
  }
`;
